var auth = {
    
    //delete bubble
    deleteBubble: function(notifications, notification){
      notifications.deleteNotification(notification);
      
    },
    
    //get site token
    getToken: function() {
      var d = $.Deferred();
      
      // Obtain session token.
      $.ajax({
        url: localStorage.appurl+"/services/session/token",
        type:"get",
        dataType:"text",
        error:function (jqXHR, textStatus, errorThrown) {
          
          //hide and show dialog auth buttons
          $('#logoutdiv').hide();
          $('#logindiv').show();
          
          //hide and show panel auth buttons
          $('.panel_login').show();
          $('.panel_logout').hide();
          
          if(errorThrown == ""){
            controller.loadingMsg("Selected Url "+localStorage.appurl+" is Unavailable. Make sure you have an internet connection or try another url.", 5000)
            $('.blockUI.blockMsg').center();
          }else {
            controller.loadingMsg("Error: "+errorThrown, 3000);
            $('.blockUI.blockMsg').center();
            $('.errorHTML').html(jqXHR.responseText);
            
          }
          
          $.mobile.changePage("#page_login", "slide", true, false);
          d.reject();
        },
        success: function (token) {
          if(token.indexOf(" ") != -1) {
            token = token.substring(2);

            console.log("token "+ " from "+localStorage.appurl);
            d.resolve(token);
          }else{
            d.resolve(token);
          }
        }
      });
      
      return d;
    },
    
    //check if we have a token
    checkToken: function() {
      var d = $.Deferred();
      
      if(!(localStorage.token == null)){
        d.resolve(localStorage.token);
      }else{
        auth.getToken().then(function(token){
          localStorage.token = token;
          d.resolve(token);
        }).fail(function(){
          d.reject();
        });
      }  
      return d;
    },
    
    //check if user is logged in
    loginStatus: function() {
      var d = $.Deferred();
      
      auth.getToken().then(function(token) {
        
        // Call system connect with session token.
        $.ajax({
          url : localStorage.appurl+"/api/system/connect.json",
          type : 'post',
          dataType : 'json',
          headers: {'X-CSRF-Token': token},
          error : function(XMLHttpRequest, textStatus, errorThrown) {
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              }
               
            });
            
            console.log('response error '+XMLHttpRequest.responseText);
            //hide and show dialog auth buttons
            $('#logoutdiv').hide();
            $('#logindiv').show();
            
            //hide and show panel auth buttons
            $('.panel_login').show();
            $('.panel_logout').hide();
            
            
          },
          success : function(data) {
            localStorage.sname = data.sessid;
            localStorage.sid = data.session_name;
            
            var drupal_user = data.user;
            if (drupal_user.uid == 0)
            {
              //user is not logged in
              console.log("status not logged in");
              //hide and show dialog buttons
              $('#logoutdiv').hide();
              $('#logindiv').show();
              
              //hide and show panel auth buttons
              $('.panel_logout').hide();
              $('.panel_login').show();
              
              d.reject();
            } else
            { 
              //user is logged in
              console.log("status logged in");
              
              //set username in menu
              $(".username").html("Hi, "+localStorage.username+" !");
              
              //set user title in menu
              $(".user_title").html(localStorage.usertitle);
              
              //hide and show dialog auth buttons
              $('#logindiv').hide();
              $('#logoutdiv').show();
              
              //hide and show panel auth buttons
              $('.panel_login').hide();
              $('.panel_logout').show();
              
              d.resolve();
              
            }
          }
        });
      }).fail(function() {
        
      });
      
      return d;
    },
    
    //login to devtrac
    login: function(name, pass, db) {
      var d = $.Deferred();
      // Obtain session token.
      auth.getToken().then(function (token) {
        
        // Call system login with session token.
        $.ajax({
          url : localStorage.appurl+"/api/user/login.json",
          type : 'post',
          data : 'username=' + encodeURIComponent(name) + '&password=' + encodeURIComponent(pass),
          dataType : 'json',
          headers: {
            'X-CSRF-Token': token
             
            },
          error : function(XMLHttpRequest, textStatus, errorThrown) {
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              }
               
            });
            alert("Sorry "+errorThrown);	
            console.log('response error '+XMLHttpRequest.responseText);
            //hide and show dialog auth buttons
            $('#logoutdiv').hide();
            $('#logindiv').show();
            
            d.reject();
          },
          success : function(data) {
            console.log("logged successfully");
            $(".menulistview").show();
            
            $("#form_add_location").show();
            $("#form_fieldtrip_details").show();
            $("#form_sitevisists_details").show();
            $("#addquestionnaire").show();
            $(".settingsform").show();
            $(".ui-navbar").show();
            $("#syncForm").show();
            
            localStorage.username = name;
            localStorage.pass = pass;
            localStorage.uid = data.user.uid;
            
            localStorage.realname = data.user.realname
            
            if(data.user.field_user_title.length > 0){
              localStorage.usertitle = data.user.field_user_title.und[0].value;  
            }else if(data.user.mail.length > 0){
              localStorage.usertitle = data.user.mail;
            }else{
              localStorage.usertitle = "Unavailable";
            }
            
            if(window.localStorage.getItem("dataflag") != data.user.uid) {
              window.localStorage.removeItem("dataflag");
              window.localStorage.setItem("dataflag", data.user.uid);
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  
                  console.log("deleted all stores");
                  
                });
              });
 
            }
            
            // Obtain session token.
            auth.getToken().then(function (token) {
              localStorage.usertoken = token;
              console.log("logged in and second token is sweet");
              //set username in menu
              $(".username").html("Hi, "+localStorage.username+" !");
              
              //set user title in menu
              $(".user_title").html(localStorage.usertitle);
              
              //hide and show dialog auth buttons
              $('#logindiv').hide();
              $('#logoutdiv').show();
              
              //hide and show panel auth buttons
              $('.panel_login').hide();
              $('.panel_logout').show();
              
              d.resolve();
            }).fail(function(){
              console.log("logged in but second token is fucked");
            });
            
          }
        });
        
      });
      return d;
      
    },
    
    //logout
    logout: function() {
      var d = $.Deferred();
      
      controller.loadingMsg("Logging out...", 0);
      $('.blockUI.blockMsg').center();
      // Obtain session token.
      auth.getToken().then(function (token) {
        // Call system logout with session token.
        $.ajax({
          url : localStorage.appurl+"/api/user/logout.json",
          type : 'post',
          dataType : 'json',
          headers: {
            'X-CSRF-Token': token
          },
          error : function(XMLHttpRequest, textStatus, errorThrown) {
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              }
               
            });
            
            //hide and show dialog auth buttons
            $('#logindiv').hide();
            $('#logoutdiv').show();
            console.log('response error '+XMLHttpRequest.responseText);
            console.log("logged out error");
            d.reject();
            
          },
          success : function(data) {
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              }
               
            });
            console.log("logged out okay");
            $(".menulistview").hide();
            $("#form_fieldtrip_details").hide();
            $("#form_sitevisists_details").hide();
            $("#form_add_location").hide();
            $(".settingsform").hide();
            $("#addquestionnaire").hide();
            $(".ui-navbar").hide();
            $("#syncForm").hide();
            
            $.mobile.changePage("#page_login", "slide", true, false);
            
            localStorage.token = null;
            localStorage.pass = null;
            
            //clear fieldtrip list
            $("#list_fieldtrips").empty();
            
            //hide or show dialog auth buttons
            $('#logoutdiv').hide();
            $('#logindiv').show();
            
            //clear login credentials
            
            if(window.localStorage.getItem("usernam") != null && window.localStorage.getItem("passw") != null){
              $("#page_login_name").val(window.localStorage.getItem("usernam"));
              $("#page_login_pass").val(window.localStorage.getItem("passw"));  
            }else
            {
              $("#page_login_name").val('');
              $("#page_login_pass").val('');  
            }
 
            d.resolve();
            
          }
        });
        
      });
      return d;
    }
} 
