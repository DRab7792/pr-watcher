const express = require('express'),
    path = require('path'),
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

app.all('/api/login', (req, res) => {
    return githubAuth.login(req, res);
});

app.all('/api/callback', (req, res) => {
    return githubAuth.callback(req, res);
});

githubAuth.on('error', function (err) {
    console.error('Github login error', err);
});

githubAuth.on('token', function (token, resp) {
    console.log('Github oauth token', token);
    return resp.end(JSON.stringify(token));
});

app.use('/', express.static(path.join(__dirname, '/public')));

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log("App started on port " + port);
});