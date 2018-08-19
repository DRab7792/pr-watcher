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
    $('.nav-link#' + hash).addClass('active');
}

function getPrs(callback) {
    var userId = Cookies.get("userId");
    window.apiCall("prs?owner=" + window.repoInfo.owner + "&repo=" + window.repoInfo.repo + "&user_id=" + userId, callback);
}

function formLists() {
    getPrs(function(data) {
        if (!data) return;
        console.log(data);
    });
}

$(window).on('hashchange', detectHash);

$(document).ready(function(){
    detectHash();
    formLists();
});