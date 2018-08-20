# Introduction

This tool is meant to watch open pull requests in Github repositories. The requests will be split into your own PRs and other users' PRs. If someone else's pull request needs reviewing, it will be marked accordingly. After the user makes the appropriate changes to their pull request, it will also be marked so you can then approve their changes and they can merge their PR. If your pull request has changes requested on it, it will be marked in a different list. Note that only the top 100 repos and 100 pull requests will be displayed.

# Installation

If you want to install this on a server you need to first create a Github OAuth App, following the steps [here](https://github.com/settings/developers). The callback URL should be your server URL with `/callback` as the path. Next, you need to specify the following environment variables:

- **CLIENT_ID** (required) - Get this from your OAuth application setup in Github.
- **CLIENT_SECRET** (required) - Get this from your OAuth application setup in Github.
- **BASE_URL** (required) - This is the URL of where the app will live without a trailing slash.
- **PORT** (optional) - If you want to specify a different port, you can. Otherwise this will default to port 8080.

# Screenshots

![image](https://user-images.githubusercontent.com/3160859/44317040-11790f80-a3fd-11e8-99d3-c3acb253cde4.png)

![image](https://user-images.githubusercontent.com/3160859/44317059-2d7cb100-a3fd-11e8-883c-3aea91993db1.png)

