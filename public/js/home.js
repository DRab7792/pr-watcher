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

    function formRepoItem(repo) {
        var html = '';
        html += '<a class="list-group-item list-group-item-dark list-group-item-action flex-column align-items-start" href="/repo/' + repo.id + '">';
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