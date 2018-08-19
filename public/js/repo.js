var hash = 'others';
var apiUrl = $("#apiUrl").val();

function detectHash(){
    if (location.hash == "#others"){
        hash = 'others';
    } else if (location.hash == "#mine") {
        hash = 'mine';
    } else {
        location.hash = 'others';
    }
    $('.nav-link').removeClass('active');
    $('.prs').hide();
    $('.nav-link#' + hash).addClass('active');
    $('.prs#' + hash).show();
}

function getPrs(callback) {
    var userId = Cookies.get("userId");
    window.apiCall("prs?owner=" + window.repoInfo.owner + "&repo=" + window.repoInfo.repo + "&user_id=" + userId, callback);
}

function formPr(pr) {
    var html = '';
    html += '<a target="_blank" class="list-group-item  list-group-item-action flex-column align-items-start list-group-item-' + pr.class + '" href="' + pr.url + '">';
    html += '<div class="d-flex w-100 justify-content-between">';
    html += '<h5 class="mb-1">' + pr.title + '</h5>';
    var updated = moment(pr.updated);
    html += '<small> Last Updated: ' + updated.fromNow() + '</small>';
    html += '</div>';
    if (pr.details) html += '<p class="mb-1">' + pr.details + '</p>';
    html += '</a>';
    return html;
}

function formLists() {
    getPrs(function(data) {
        if (!data) return;
        var owners = ['others', 'mine'];
        var lists = ['needs-review', 'in-review'];
        owners.forEach(function(owner) {
            lists.forEach(function(list) {
                var html = '';
                data[owner][list].forEach(function(curPr) {
                    html += formPr(curPr);
                });
                $('.prs#' + owner + ' .pr-list#' + list).html(html);
            });
        });
    });
}

$(window).on('hashchange', detectHash);

$(document).ready(function(){
    detectHash();
    formLists();
});