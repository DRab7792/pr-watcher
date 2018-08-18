$(document).ready(function() {
    // Let the user login to Github
    $('.login').click(function() {
        window.open('/login', 'popUpWindow', 'height=500,width=400,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes');
    });

    // Is the user already logged in?
    var token = Cookie.get('token');
    if (token) {
        $('.username').html(token);
    }
});