const express = require('express'),
    config = require('./config'),
    githubAuth = require('github-oauth');


const app = express();

const port = process.env.PORT || 8080;


app.get('/', (req, res) => {
    return res.send(process.env.CLIENT_ID);
});

app.listen(port, () => {
    console.log("App started on port " + port);
});