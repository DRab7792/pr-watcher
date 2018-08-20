const express = require('express'),
    path = require('path'),
    fs = require('fs'),
    request = require('request'),
    queryString = require('query-string'),
    cookieParser = require('cookie-parser'),
    async = require('async'),
    config = require('./config');

const githubAuth = require('github-oauth')({
    githubClient: config.github.client,
    githubSecret: config.github.secret,
    baseURL: config.baseUrl,
    loginURI: '/login',
    callbackURI: '/callback',
    scope: 'user'
});

const app = express();

app.set('view engine', 'ejs');

app.use(cookieParser());

// Helper functions
function formResponse(success, data, err) {
    var res = {
        success: success,
        data: data || [],
        err: err || '',
    };
    return JSON.stringify(res);
}

// Github Auth Routes
app.all('/login', (req, res) => {
    return githubAuth.login(req, res);
});

app.all('/callback', (req, res) => {
    return githubAuth.callback(req, res);
});

githubAuth.on('error', (err) => {
    console.error('Github login error', err);
});

githubAuth.on('token', (token, res) => {
    console.log('Github oauth token', token);
    res.cookie('token', token['access_token']);
    res.render('pages/callback');
});

function checkToken(req, res) {
    // Check for token
    if (!req.cookies.token) {
        return res.send(formResponse(false, [], "User must be logged in."));
    }
}

function callGithubApi(req, res, route, params, callback) {
    // Make request
    var url = "https://api.github.com/" + route;
    if (params) url += "?" + queryString.stringify(params);
    request(url, {
        method: 'GET',
        json: true,
        headers: {
            'User-Agent': 'PR Watcher',
            'Authorization': 'token ' + req.cookies.token,
        }
    }, (err, resp, body) => {
        console.log("Rate Limit Remaining: " + resp.headers['x-ratelimit-remaining']);
        if (err){
            return res.send(formResponse(false, [], err));
        }
        if (callback) return callback(body);
        return res.send(formResponse(true, body));
    });
}

app.get('/api/me', (req, res) => {
    checkToken(req, res);
    
    callGithubApi(req, res, "user", []);
});

app.get('/api/repos', (req, res) => {
    checkToken(req, res);

    callGithubApi(req, res, "user/repos", {"sort": "updated", "per_page": 100});
});

// Get review comments
const getReviewCommentsFromPRs = (req, res, prs) => {
    return new Promise((resolve, reject) => {
        async.eachOf(prs, (cur, i, done) => {
            callGithubApi(req, res, cur.review_comments_url.replace("https://api.github.com/", ""), null, (data) => {
                prs[i].review_comments = data;
                return done();
            });
        }, () => {
            return resolve(prs);
        });
    });
};

// Get issue comments
const getCommentsFromPRs = (req, res, prs) => {
    return new Promise((resolve, reject) => {
        async.eachOf(prs, (cur, i, done) => {
            callGithubApi(req, res, cur.comments_url.replace("https://api.github.com/", ""), null, (data) => {
                prs[i].comments = data;
                return done();
            });
        }, () => {
            return resolve(prs);
        });
    });
};

const resolvePr = pr => {
    const adjPr = {};
    adjPr.title = pr.title;
    adjPr.url = pr.html_url;
    adjPr.created = pr.created_at;
    adjPr.updated = pr.updated_at;

    return adjPr;
};

const classifyMineInReview = (adjPr, data) => {
    return adjPr;
};

const classifyMineNeedsReview = (adjPr, data) => {
    return adjPr;
};


app.get('/api/prs', (req, res) => {
    checkToken(req, res);

    // Check parameters
    if (
        !req.query.owner || 
        !req.query.repo ||
        !req.query.user_id
    ) {
        return res.send(formResponse(true, [], "Missing parameters."));
    }

    const userId = req.query.user_id;

    // Setup arrays
    const finalData = {
        'mine': {
            'needs-review': [],
            'in-review':[]
        },
        'others': {
            'needs-review': [],
            'in-review': []
        }
    };

    // Get the prs
    callGithubApi(req, res, "repos/" + req.query.owner + "/" + req.query.repo + "/pulls", {
        "state": "open",
        "sort": "created",
        "direction": "asc",
        "per_page": 100
    }, prs => {
        // Get comments for all PRs
        getReviewCommentsFromPRs(req, res, prs)
        .then(prs => {
            return getCommentsFromPRs(req, res, prs);
        })
        .then(prs => {

            // Categorize PRs
            prs.forEach(cur => {
                let adjPr = resolvePr(cur);
                
                // Now start classifying, begin with "Mine"
                if (cur.user.id == req.query.user_id) {

                    // Start with the "needs review" PRs
                    if (!cur.review_comments.length) {
                        // No reviews requested
                        if (!cur.requested_reviewers.length) {
                            adjPr.state = 'requested';
                            adjPr.class = 'warning';
                            adjPr.priority = 2;
                        // Reviews have been requested
                        } else {
                            adjPr.state = 'waiting';
                            adjPr.class = 'success';
                            adjPr.priority = 1;
                        }
                        finalData.mine['needs-review'].push(adjPr);
                        return true;
                    }

                    // Count the number of review comments and responses if applicable
                    const reviewComments = {};
                    let numUnresponded = 0,
                        numReviews = 0,
                        numResponses = 0;

                    // Mark all comments from other users not in reply of something
                    cur.review_comments.forEach(comment => {
                        if (comment.user.id != userId && !comment.in_reply_to_id) {
                            reviewComments[comment.id] = 0;
                            numReviews++;
                        }
                    });

                    // Mark all replies from the current user
                    const ownerId = cur.user.id;
                    cur.review_comments.forEach(comment => {
                        if (comment.user.id == userId && comment.in_reply_to_id) {
                            reviewComments[comment.in_reply_to_id.toString()]++;
                            numResponses++;
                        }
                    });

                    console.log(reviewComments);

                    // Count the number of 0s
                    Object.keys(reviewComments).forEach(key => {
                        if (reviewComments[key] == 0) numUnresponded++;
                    });

                    // Form detail line
                    let detail = numReviews != 1 ? `${numReviews} changes requested. ` : `${numReviews} change requested. `;
                    detail += numResponses != 1 ? `${numResponses} replies.` : `${numResponses} reply.`;
                    adjPr.details = detail;

                    // On to the "in review" PRS
                    // Waiting for changes
                    if (numUnresponded == Object.keys(reviewComments).length) {
                        adjPr.state = 'unfixed';
                        adjPr.class = 'danger';
                        adjPr.priority = 3;
                        finalData.mine['in-review'].push(adjPr);
                        // Changes in process
                    } else if (numUnresponded > 0 && numUnresponded < Object.keys(reviewComments).length) {
                        adjPr.state = 'fixing';
                        adjPr.class = 'warning';
                        adjPr.priority = 2;
                        finalData.mine['in-review'].push(adjPr);
                        // All comments have been addressed
                    } else if (numUnresponded == 0) {
                        adjPr.state = 'fixed';
                        adjPr.class = 'success';
                        adjPr.priority = 1;
                        finalData.mine['in-review'].push(adjPr);
                    }


                // Now work on the "Others"
                } else {
                    // Start with the "needs review" PRs

                    // The current user is being requested to review this PR but no review comments have been made
                    if (cur.requested_reviewers.length && !cur.review_comments.length) {
                        let classified = false;
                        cur.requested_reviewers.forEach(reviewer => {
                            if (reviewer.id == userId) {
                                adjPr.state = 'requested';
                                adjPr.class = 'danger';
                                adjPr.priority = 3;
                                classified = true;
                                finalData.others['needs-review'].push(adjPr);
                            }
                        });
                        if (classified) return classified;
                    }

                    // Are there no review requests and no review comments?
                    if (!cur.review_comments.length && !cur.requested_reviewers.length) {
                        adjPr.state = 'unreviewed';
                        adjPr.class = 'warning';
                        adjPr.priority = 2;
                        finalData.others['needs-review'].push(adjPr);
                        return true;
                    }

                    // Are there review comments from other users already for this PR but none for the current user?
                    if (cur.review_comments.length) {
                        let currentUserCommented = false;
                        let reviewers = [];
                        cur.review_comments.forEach(comment => {
                            if (comment.user.id == userId) {
                                currentUserCommented = true;
                                return;
                            } else if (comment.user.id != cur.user.id) {
                                reviewers.push(comment.user.login);
                            }
                        });
                        if (!currentUserCommented) {
                            adjPr.state = 'other-reviewer';
                            adjPr.class = 'success';
                            if (reviewers.length) adjPr.details = 'Reviewed by ' + reviewers.join(', ');
                            adjPr.priority = 1;
                            finalData.others['needs-review'].push(adjPr);
                            return true;
                        }
                    }

                    // On to the in-review PRs
                    
                    // Count the review comments and replies
                    if (cur.review_comments.length) {

                        // Count the number of review comments and responses if applicable
                        const reviewComments = {};
                        let numUnresponded = 0,
                            numReviews = 0,
                            numResponses = 0;

                        // Mark all comments from the current user
                        cur.review_comments.forEach(comment => {
                            if (comment.user.id == userId && !comment.in_reply_to_id) {
                                reviewComments[comment.id] = 0;
                                numReviews++;
                            }
                        });

                        // Mark all comments from the owner of the PR
                        const ownerId = cur.user.id;
                        cur.review_comments.forEach(comment => {
                            if (comment.user.id == ownerId && comment.in_reply_to_id) {
                                reviewComments[comment.in_reply_to_id.toString()]++;
                                numResponses++;
                            }
                        });

                        // Count the number of 0s
                        Object.keys(reviewComments).forEach(key => {
                            if (reviewComments[key] == 0) numUnresponded++;
                        });

                        // TODO: Account for code changes on the comment line

                        // Form detail line
                        let detail = numReviews != 1 ? `${numReviews} changes requested. ` : `${numReviews} change requested. `;
                        detail += numResponses != 1 ? `${numResponses} replies.` : `${numResponses} reply.`;
                        adjPr.details = detail;

                        // Waiting for changes
                        if (numUnresponded == Object.keys(reviewComments).length) {
                            adjPr.state = 'unfixed';
                            adjPr.class = 'success';
                            adjPr.priority = 1;
                            finalData.others['in-review'].push(adjPr);
                        // Changes in process
                        } else if (numUnresponded > 0 && numUnresponded < Object.keys(reviewComments).length) {
                            adjPr.state = 'fixing';
                            adjPr.class = 'warning';
                            adjPr.priority = 2;
                            finalData.others['in-review'].push(adjPr);
                        // All comments have been addressed
                        } else if (numUnresponded == 0) {
                            adjPr.state = 'fixed';
                            adjPr.class = 'danger';
                            adjPr.priority = 3;
                            finalData.others['in-review'].push(adjPr);
                        }
                    }
                }
            });

            // Sort all arrays by importance
            const cmp = (a, b) => {
                if (a.priority < b.priority) {
                    return 1;
                } else if (a.priority > b.priority) {
                    return -1;
                } else {
                    return new Date(a.created) > new Date(b.created) ? 1 : -1;
                }
            };

            const owners = ['others', 'mine'];
            const lists = ['needs-review', 'in-review'];
            owners.forEach(owner => {
                lists.forEach(list => {
                    finalData[owner][list].sort(cmp);
                });
            });

            return res.send(formResponse(true, finalData));
        });
    });
});

// Home
app.get('/', (req, res) => {
    res.render('pages/home', {
        apiUrl: config.baseUrl + '/api/',
        page: 'home',
        title: 'Home'
    });
});

// Repo page
app.get('/repo/:owner/:repo', (req, res) => {
    if (!req.cookies.token){
        return res.redirect('/');
    }

    res.render('pages/repo', {
        apiUrl: config.baseUrl + '/api/',
        page: 'repo',
        repoInfo: JSON.stringify(req.params),
        title: req.params.repo
    });
});

app.use('/static', express.static(path.join(__dirname, '/public')));

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log("App started on port " + port);
});