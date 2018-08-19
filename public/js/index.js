window.apiCall = function(route, callback){
    $.ajax({
        url: apiUrl + route,
        dataType: 'json',
        success: function (resp) {
            if (!resp.success || !resp.data) {
                console.log("Error calling API" + resp.error);
                return callback();
            }
            return callback(resp.data);
        },
        error: function () {
            console.log("Error calling API");
            return callback();
        }
    });
}

$(document).ready(function() {
    var apiUrl = $("#apiUrl").val();

    function getMe(callback) {
        window.apiCall("me", callback);
    }

    function updateHeader() {
        // Is the user already logged in?
        var token = Cookies.get('token');
        if (token) {
            getMe(function(data) {
                if (!data) return;
                window.userId = data.id;
                $('.username').show();
                $('.username').html(data.login);
                $('.login').hide();
                $('.logout').show();
                $('.loggedOut').hide();
                if (window.postLogin){
                    window.postLogin();
                }
                $('.loggedIn').show();
            });
        }else{
            $('.loggedOut').css('display', 'block');
            $('.loggedIn').hide();
        }
    }
    updateHeader();

    // Login
    $('.login').click(function () {
        window.open('/login', 'popUpWindow', 'height=500,width=400,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes');
        var tokenCheck = setInterval(function () {
            var token = Cookies.get('token');
            if (!token) return;
            clearInterval(tokenCheck);
            updateHeader();
        }, 200);
    });

    // Logout
    $('.logout').click(function () {
        Cookies.remove('token');
        location.reload();
    });
});