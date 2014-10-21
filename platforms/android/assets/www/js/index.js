var app = {
    // Application Constructor
    initialize: function() {
      this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
      document.addEventListener('deviceready', this.onDeviceReady, false);
      
      app.loginStatus();
      $("#loginForm").validate();

      $('#page_login_submit').bind("click", function(event, ui) {
        if($("#page_login_name").valid() && $("#page_login_pass").valid()) {
          app.login($('#page_login_name').val(), $('#page_login_pass').val()); 
        }
      });

      $('#page_logout_submit').bind("click", function(event, ui) {
        app.logout();
      });
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {

    },

    //check if user is logged in
    loginStatus: function() {
      var d = $.Deferred();
      var user = $('#page_login_submit').val(),
      pass = $('#page_logout_submit').val();

      // Obtain session token.
      $.ajax({
        url:"http://10.0.2.2/dt6/?q=services/session/token",
        type:"get",
        dataType:"text",
        error:function (jqXHR, textStatus, errorThrown) {
          alert('Session Error '+errorThrown);
        },
        success: function (token) {
          // Call system logout with session token.
          $.ajax({
            url : "http://10.0.2.2/dt6/?q=api/system/connect.json",
            type : 'post',
            dataType : 'json',
            headers: {'X-CSRF-Token': token},
            error : function(XMLHttpRequest, textStatus, errorThrown) {

              alert('Cannot Connect to Devtrac Site Now. Check your internet connection is working '+errorThrown);
            },
            success : function(data) {

              var drupal_user = data.user;
              if (drupal_user.uid == 0)
              {
                //user is not logged in
                $('#logoutdiv').hide();
                $('#logindiv').show();
                
                d.reject();
              } else
              { 
                //user is logged in
                $('#logindiv').hide();
                $('#logoutdiv').show();
                
                d.resolve();

              }
            }
          });
        }
      });
      return d;
    },

    //login
    login: function(name, pass) {
      var d = $.Deferred();

      // Obtain session token.
      $.ajax({
        url:"http://10.0.2.2/dt6/?q=services/session/token",
        type:"get",
        dataType:"text",
        error:function (jqXHR, textStatus, errorThrown) {
          alert(errorThrown);
        },
        success: function (token) {
          // Call system login with session token.
          $.ajax({
            url : "http://10.0.2.2/dt6/?q=api/user/login.json",
            type : 'post',
            data : 'username=' + encodeURIComponent(name) + '&password=' + encodeURIComponent(pass),
            dataType : 'json',
            headers: {'X-CSRF-Token': token},
            error : function(XMLHttpRequest, textStatus, errorThrown) {
              alert(errorThrown);
              $('#logoutdiv').hide();
              $('#logindiv').show();
            },
            success : function(data) {
              $('#logindiv').hide();
              $('#logoutdiv').show();
              
              //save username and passwords on sdcard
              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, savePasswords, failsavePass);

            }
          });

        }
      });

      return d;

    },

    //logout
    logout: function() {
      // Obtain session token.
      $.ajax({
        url:"http://10.0.2.2/dt6/?q=services/session/token",
        type:"get",
        dataType:"text",
        error:function (jqXHR, textStatus, errorThrown) {
          alert(errorThrown);
        },
        success: function (token) {
          // Call system logout with session token.
          $.ajax({
            url : "http://10.0.2.2/dt6/?q=api/user/logout.json",
            type : 'post',
            dataType : 'json',
            headers: {'X-CSRF-Token': token},
            error : function(XMLHttpRequest, textStatus, errorThrown) {

              alert('Failed to logout ' + errorThrown);
              $('#logindiv').hide();
              $('#logoutdiv').show();
            },
            success : function(data) {

              alert("Logged out.");
              $('#logoutdiv').hide();
              $('#logindiv').show();

              $("#page_login_name").val('');
              $("#page_login_pass").val('');
              
              //clear passwords from file
              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearPasswords, failclearPass);
            }
          });
        }
      });
    }

};
