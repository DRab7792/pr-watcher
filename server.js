const express = require('express'),
    path = require('path'),
    request = require('request'),
    cookieParser = require('cookie-parser'),
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

function callGithubApi(req, res, route, params, resolver) {
    // Make request
    var url = "https://api.github.com/" + route;
    request(url, {
        method: 'GET',
        json: true,
        headers: {
            'User-Agent': 'PR Watcher',
            'Authorization': 'token ' + req.cookies.token
        }
    }, (err, resp, body) => {
        if (err) return res.send(formResponse(false, [], err));
        if (resolver) body = resolver(body);
        return res.send(formResponse(true, body));
    });
}

app.get('/api/me', (req, res) => {
    checkToken(req, res);
    
    callGithubApi(req, res, "user", []);
});

app.get('/api/repos', (req, res) => {
    checkToken(req, res);

    callGithubApi(req, res, "user/repos", [], function(repos) {
        repos.sort(function (a, b) {
            // Turn your strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
        return repos;
    });
});

// Home
app.get('/', (req, res) => {
    res.render('pages/home', {
        apiUrl: config.baseUrl + '/api/',
        page: 'home'
    });
});

app.use('/static', express.static(path.join(__dirname, '/public')));

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log("App started on port " + port);
});