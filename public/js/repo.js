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
    window.apiCall("prs?owner=" + window.repoInfo.owner + "&repo=" + window.repoInfo.repo + "&user_id=" + window.userId, callback);
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