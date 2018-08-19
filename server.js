const express = require('express'),
    path = require('path'),
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
    return pr;
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
                const adjPr = resolvePr(cur);
                if (cur.user.id == req.query.user_id) {
                    if (cur.comments.length) {
                        finalData.mine['in-review'].push(adjPr);
                    } else {
                        finalData.mine['needs-review'].push(adjPr);
                    }
                } else {
                    if (cur.comments.length) {
                        finalData.others['in-review'].push(adjPr);
                    } else {
                        finalData.others['needs-review'].push(adjPr);
                    }
                }
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