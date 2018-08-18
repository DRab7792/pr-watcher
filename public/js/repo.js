var hash = 'others';

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

$(window).on('hashchange', detectHash);

$(document).ready(function(){
    detectHash();
});