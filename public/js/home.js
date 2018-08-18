$(document).ready(function() {
    var apiUrl = $("#apiUrl").val();

    function getRepos(callback) {
        $.ajax({
            url: apiUrl + "repos",
            dataType: 'json',
            success: function (resp) {
                if (!resp.success || !resp.data) {
                    console.log("Error getting Github repos" + resp.error);
                    return callback();
                }
                return callback(resp.data);
            },
            error: function () {
                console.log("Error getting Github repos");
                return callback();
            }
        });
    }

    function formRepoUrl(repo) {
        var url = repo.url;
        var regex = /repos\/([^\/]*)\/([^\/]*)/gi;
        var match = regex.exec(url);
        if (match.length != 3) {
            console.log("Error forming detail URL", match);
            return '/';
        }
        return '/repo/' + match[1] + '/' + match[2];
    }

    function formRepoItem(repo) {
        var html = '';
        var detailUrl = formRepoUrl(repo);
        html += '<a class="list-group-item  list-group-item-action flex-column align-items-start" href="' + detailUrl + '">';
        html += '<div class="d-flex w-100 justify-content-between">';
        html += '<h5 class="mb-1">' + repo.name + '</h5>';
        var updated = moment(repo.updated_at);
        html += '<small> Last Updated: ' + updated.fromNow() + '</small>'; 
        html += '</div>';
        var description = repo.description || "No description";
        html += '<p class="mb-1">' + description + '</p>';
        html += '</a>';
        return html;
    }

    window.postLogin = function() {
        getRepos(function(data) {
            if (!data) return;
            var html = "";
            data.forEach(function(cur) {
                html += formRepoItem(cur);
            });
            $('.repos').html(html);
        });
    }
});