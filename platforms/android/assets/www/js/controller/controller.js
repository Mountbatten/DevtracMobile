var controller = {
    pictureSource: null, // picture source
    destinationType: null,
    connectionStatus : true,
    base64Images : [],
    filenames : [],
    filedimensions: [],
    filesizes : [],
    
    b64Images : [],
    fnames : [],
    fdimensions: [],
    fsizes : [],
    
    watchID : null,
    watchid : null,
    nodes : [devtracnodes.getActionItems, devtracnodes.getQuestions, vocabularies.getOecdVocabularies, vocabularies.getPlacetypeVocabularies],
    
    objectstores: ["oecdobj", "placetype", "fieldtripobj", "sitevisit", "actionitemsobj", "placesitemsobj", "qtnsitemsobj", "qtionairesitemsobj", "commentsitemsobj","images"],
    
    //on body load
    onLoad: function(){
      document.addEventListener("offline", controller.onOffline, false);
      document.addEventListener("online", controller.online, false);
      document.addEventListener("deviceready", controller.onDeviceReady, false);
      
    },
    
    // Application Constructor
    initialize: function () {
      //faster button clicks
      window.addEventListener('load', function() {
        FastClick.attach(document.body);
      }, false);
      
      //center the loading message
      $.fn.center = function () {
        this.css("position","absolute");
        this.css("top", ( $(window).height() - this.height() ) / 2+$(window).scrollTop() + "px");
        this.css("left", ( $(window).width() - this.width() ) / 2+$(window).scrollLeft() + "px");
        return this;
      }
      
      //initialise section for templates
      var leftMenu = Handlebars.compile($("#leftmenu-tpl").html()); 
      $(".leftmenu").html(leftMenu());
      var header = Handlebars.compile($("#header-tpl").html());
      $("#fieldtrip_details_header").html(header({id: "fieldtrip", title: "Fieldtrip Details"}));
      $("#header_login").html(header({id: "login", title: "Devtrac Mobile"}));
      $("#header_home").html(header({id: "home", title: "Home"}));
      $("#header_sync").html(header({id: "sync", title: "Sync Nodes"}));
      $("#header_sitereports").html(header({extra_buttons: '<div data-role="navbar" data-theme="a">'+
        '<ul>'+
        '<li><a data-role="button" data-mini="true" id="addquestionnaire"><i class="fa fa-list-alt fa-lg"></i>&nbsp&nbsp Questionnaire</a></li>'+
        '<li><a href="#mappage" data-role="button" class="panel_map" onclick="var state=false; var mapit = true; mapctlr.initMap(null, null, state, mapit);"><i class="fa fa-map-marker fa-lg"></i>&nbsp&nbsp Map</a></li>'+
        '</ul></div>', id: "sitereport", title: "Site Report"}));
      $("#header_location").html(header({id: "location", title: "Locations"}));
      $("#header_about").html(header({id: "about", title: "About"}));
      $("#header_addlocation").html(header({id: "addlocation", title: "Locations"})); 
      $("#header_addsitereport").html(header({id: "addsitereport", title: "Add Site Visit"}));
      $("#header_actionitemdetails").html(header({id: "actionitemdetails", title: "Action Item"}));
      $("#header_qtnr").html(header({id: "qtnr", title: "Questionnaire"}));
      $("#header_settings").html(header({id: "settings", title: "Settings"}));
      $("#header_download").html(header({id: "download", title: "Download Nodes"}));
      
      $(window).bind('orientationchange pageshow pagechange resize', mapctlr.resizeMapIfVisible);
      
      
      //set application url if its not set
      if (!localStorage.appurl) {
        //localStorage.appurl = "http://localhost/dt11";
        //localStorage.appurl = "http://192.168.38.113/dt11";
        //localStorage.appurl = "http://192.168.38.114/dt11";
        localStorage.appurl = "http://jenkinsge.mountbatten.net/devtracmanual";
        //localStorage.appurl = "http://demo.devtrac.org";
        //localStorage.appurl = "http://10.0.2.2/dt11";
        //localStorage.appurl = "http://jenkinsge.mountbatten.net/devtraccloud";

      }
      
      if(controller.connectionStatus) {
        controller.loadingMsg("Please Wait..", 0);
        $('.blockUI.blockMsg').center();
        auth.loginStatus().then(function () {
          $(".menulistview").show();
          
          $("#form_add_location").show();
          $("#form_fieldtrip_details").show();
          $("#form_sitevisists_details").show();
          
          $(".settingsform").show();
          $(".ui-navbar").show();
          
          console.log("logged in");
          
          devtracnodes.countFieldtrips().then(function(){
            //load field trip details from the database if its one and the list if there's more.
            controller.loadFieldTripList();
            
          }).fail(function(){
            
            //download all devtrac data for user.
            controller.fetchAllData().then(function(){
              
              //load field trip details from the database if its one and the list if there's more.
              controller.loadFieldTripList();
            }).fail(function(error){
              auth.logout();
              controller.loadingMsg(error,5000);
              $('.blockUI.blockMsg').center();
            });
            
          });
          
          
        }).fail(function () {
          $(".menulistview").hide();
          $("#form_fieldtrip_details").hide();
          $("#form_sitevisists_details").hide();
          $("#form_add_location").hide();
          $(".settingsform").hide();
          $(".ui-navbar").hide();
          $("#addquestionnaire").hide();
          
          controller.resetForm($('#form_fieldtrip_details'));
          $.unblockUI();
          
          if(window.localStorage.getItem("usernam") != null && window.localStorage.getItem("passw") != null) {
            $("#page_login_name").val(window.localStorage.getItem("usernam"));
            $("#page_login_pass").val(window.localStorage.getItem("passw"));  
          }
          
        });
        
      }else
      {
        
        if(window.localStorage.getItem("username") != null && window.localStorage.getItem("pass") != null){
          controller.loadingMsg("You are offline, cannot upload data. Now using offline data", 6000);
          $('.blockUI.blockMsg').center();
          //load field trip details from the database if its one and the list if there's more.
          controller.loadFieldTripList();
          
        }else {
          controller.loadingMsg("Please connect to the internet to login and download your devtrac data.", 2000);
          $('.blockUI.blockMsg').center();
          //hide logout button and show login button when offline
          $('#logoutdiv').hide();
          $('#logindiv').show();
          $.unblockUI();
        }
      }
      
      this.bindEvents();
    },
    
    fetchAllData: function () {
      var d = $.Deferred();   
      
      devtrac.indexedDB.open(function (db) {
        devtracnodes.getFieldtrips(db).then(function () {
          
          controller.loadingMsg("Fieldtrips Saved", 0);
          $('.blockUI.blockMsg').center();
          devtracnodes.getSiteVisits(db, function(response) {
            
            controller.loadingMsg("Sitevisits Saved", 0);
            $('.blockUI.blockMsg').center();
            devtracnodes.getPlaces(db);
            
            for(var x = 0; x < controller.nodes.length; x++) {
              controller.nodes[x](db).then(function(response) {
                controller.loadingMsg(response, 1500);
                $('.blockUI.blockMsg').center();
              }).fail(function(e) {
                controller.loadingMsg(e, 1500);
                $('.blockUI.blockMsg').center();
              });  
              
              if(x == controller.nodes.length - 1){
                d.resolve();
              }
              
            }
            
          });
          
        }).fail(function(error){
          d.reject(error);
        });
      });
      
      return d;
    },
    
    //Bind any events that are required on startup
    bindEvents: function () {
      
      //$(".seturlselect").chosen({width: "100%"}); 
      $(".menulistview").listview().listview('refresh');
      
      if($(".seturlselect option:selected").val() == "custom") {
        $(".myurl").show();  
      }else{
        $(".myurl").hide();
      }
      
      //start gps
      $( "#page_add_location" ).bind("pagebeforeshow", function( event ) {
        console.log("inside page add location");        
        $("#location_item_save").button('disable');  
        $("#location_item_save").button('refresh');  
        
        if(controller.checkCordova() != undefined) {
          console.log("can use cordova");
          
          if(controller.watchID == null){
            console.log("watch id is null");
            var options = { maximumAge: 5000, timeout: 10000, enableHighAccuracy: true };
            controller.watchID = navigator.geolocation.watchPosition(controller.onSuccess, controller.onError, options);
            console.log("watch id is "+controller.watchID);
            
          }else{
            console.log("watch id is not null");
          }
          
        }else{
          if (navigator.geolocation) {
            controller.watchid = navigator.geolocation.watchPosition(controller.showPosition, controller.errorhandler);
            
          } else {
            controller.loadingMsg("Geolocation is not supported by this browser", 1000);
            $('.blockUI.blockMsg').center();
          }
          
        }
        
      });
      
      //stop gps
      $("#cancel_addlocation").on('click', function(){
        
        controller.clearWatch();
        
      });
      
      //save sitevisit
      $("#sitevisit_add_save").bind('click', function(){
        controller.onSavesitevisit();
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_sitevisit_add").bind('pagebeforeshow', function(){
        tinymce.init({
          
          selector: "textarea#sitevisit_add_public_summary, textarea#sitevisit_add_report",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage textcolor colorpicker"
                    ],
                    
                    toolbar1: "bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | subscript superscript",
                    toolbar2: "bullist numlist | outdent indent | link code | forecolor backcolor",
                    
                    menubar: false,
                    toolbar_items_size: 'small',          
                    setup : function(ed) {
                      
                      ed.on('click', function(e) {
                        console.log('Editor was clicked');
                      });
                    }
        });
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_sitevisit_edits").bind('pagebeforeshow', function(event, data) {
        tinymce.execCommand('mceSetContent', false, localStorage.sitevisit_summary);
        
        tinymce.init({
          selector: "textarea#sitevisit_summary",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage textcolor colorpicker"
                    ],
                    
                    toolbar1: "bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | subscript superscript",
                    toolbar2: "bullist numlist | outdent indent | link code | forecolor backcolor",
                    
                    menubar: false,
                    toolbar_items_size: 'small',
                    setup: function(ed){
                      ed.on("init",
                            function(ed) {
                              tinyMCE.get('sitevisit_summary').setContent(localStorage.sitevisit_summary);
                              tinyMCE.execCommand('mceRepaint');

                            }
                      );
                  }
        });
        
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_add_actionitems").bind('pagebeforeshow', function() {
        tinymce.init({
          
          selector: "textarea#actionitem_followuptask",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage textcolor colorpicker"
                    ],
                    
                    toolbar1: "bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | subscript superscript",
                    toolbar2: "bullist numlist | outdent indent | link code | forecolor backcolor",
                    
                    menubar: false,
                    toolbar_items_size: 'small'
        });
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_actionitemdetails").bind('pagebeforeshow', function() {
        tinymce.init({
          
          selector: "textarea#actionitem_comment",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage textcolor colorpicker"
                    ],
                    
                    toolbar1: "bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | subscript superscript",
                    toolbar2: "bullist numlist | outdent indent | link code | forecolor backcolor",
                    
                    menubar: false,
                    toolbar_items_size: 'small'
        });
      });
      
      $("#page_fieldtrip_details").bind('pagebeforeshow', function(){
        $("#page_fieldtrip_details").trigger("create");
      });
      
      //show the connected url in the drop down select - login page
      $("#page_login").bind('pagebeforeshow', function() {
        var el = $('#loginselect');
        
        var url = localStorage.appurl;
        
        if(url.indexOf("test") != -1) {
          // Select the relevant option, de-select any others
          el.val('test').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }else if(url.indexOf("cloud") != -1) {
          // Select the relevant option, de-select any others
          el.val('cloud').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }else if(url.indexOf("manual") != -1) {
          // Select the relevant option, de-select any others
          el.val('manual').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }else if(url.indexOf("dt11") != -1) {
          // Select the relevant option, de-select any others
          el.val('local').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }
        
        $("#barsbutton_login").hide();
      });
      
      //show the connected url in the drop down select - settings page
      $("#page_add_settings").bind('pagebeforeshow', function() {
        var el = $('#settingselect');
        
        var url = localStorage.appurl;
        
        if(url.indexOf("test") != -1) {
          // Select the relevant option, de-select any others
          el.val('test').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }else if(url.indexOf("cloud") != -1) {
          // Select the relevant option, de-select any others
          el.val('cloud').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }else if(url.indexOf("manual") != -1) {
          // Select the relevant option, de-select any others
          el.val('manual').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }else if(url.indexOf("dt11") != -1) {
          // Select the relevant option, de-select any others
          el.val('local').selectmenu('refresh');
          
          // jQM refresh
          //el.selectmenu("refresh", true);
        }
        
        $("#barsbutton_login").hide();
      });
      
      
      //count nodes for upload before uploads page is shown
      $("#syncall_page").bind('pagebeforeshow', function(){
        devtrac.indexedDB.open(function (db) {
          
          devtracnodes.countSitevisits(db).then(function(scount){
            $("#sitevisit_count").html(scount);
            
            devtracnodes.countLocations(db).then(function(items) {
              $("#location_count").html(items);
            }).fail(function(lcount){
              $("#location_count").html(lcount);
            });
            
            devtracnodes.checkActionitems(db).then(function(actionitems, items) {
              $("#actionitem_count").html(items);
            }).fail(function(acount){
              $("#actionitem_count").html(acount);
            });
          });
        });
        
      });
      
      // on cancel action item click
      $('#action_item_cancel').bind('click', function () { 
        $.mobile.changePage("#page_sitevisits_details", "slide", true, false);
        
      });
      
      //On click of sync from fieldtrips
      $('.fieldtrip_syncall').bind('click', function () { 
        $.mobile.changePage("#syncall_page", "slide", true, false);
        $("#sync_back").attr("href", "#page_fieldtrip_details");
        
      });
      
      //on view fieldtrip location click
      $('.panel_map').bind('click', function () { 
        $('#viewlocation_back').show();
        $('#addlocation_back').hide();
      });
      
      //On Questionnaire button click
      $('#addquestionnaire').bind('click', function () { 
        
        $.mobile.changePage("#page_add_questionnaire", "slide", true, false);
        
      }); 
      
      //hide the notification button if there are no notifcations and its been clicked.
      $('#notify-anchor').bind('click', function () {
        if ($(".notification-bubble").html() <= 0) {
          $("#notify-nav").hide();
        }
      });
      
      //redownload the devtrac data
      $('.refresh-button').bind('click', function () {
        
        //provide a dialog to ask the user if he wants to log in anonymously.
        $('<div>').simpledialog2({
          mode : 'button',
          headerText : 'Info...',
          headerClose : true,
          buttonPrompt : "Do you want to redownload your devtrac data ?",
          buttons : {
            'OK' : {
              click : function() {
                
                if(controller.connectionStatus){
                  controller.loadingMsg("Downloading Data ...", 0);
                  $('.blockUI.blockMsg').center();
                  //get all bubbles and delete them to create room for new ones.
                  for (var notify in $('#refreshme').getNotifications()) {
                    $(this).deleteBubble($('#refreshme').getNotifications()[notify]);
                  }
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.clearDatabase(db, 0, function() {
                      
                      controller.fetchAllData().then(function(){
                        controller.loadFieldTripList();          
                      }).fail(function(error){
                        auth.logout();
                        if(error.indexOf("field") != -1){
                          controller.loadingMsg(error,5000);  
                          $('.blockUI.blockMsg').center();
                        }
                        
                      });
                      
                    });
                  });
                  
                  $(".notification-bubble").html(0);          
                  
                }else{
                  controller.loadingMsg("Please Connect to Internet ...", 2000);
                  $('.blockUI.blockMsg').center();
                }
              },
              id: "redownload",
            },
            'Cancel' : {
              click : function() {
                
              },
              icon : "delete",
              theme : "b"
            }
          }
        });
        
      });
      
      
      //validate field to set urls for annonymous users
      var form = $("#urlForm");
      form.validate({
        rules: {
          url: {
            required: true,
            url: true
          }
        }
      });
      
      //action item validation
      var actionitem_form = $("#form_add_actionitems");
      actionitem_form.validate({
        rules: {
          actionitem_date: {
            required: true,
            date: true
          },
          actionitem_title: {
            required: true
          },
          actionitem_status:{
            required: true
          },
          actionitem_priority:{
            required: true
          },
          actionitem_responsible:{
            required: true
          },actionitem_followuptask:{
            required: true
          }
        }
      });
      
      //location validation
      var location_form = $("#form_add_location");
      location_form.validate({
        rules: {
          location_name: {
            required: true
          },
          select_placetypes:{
            required: true
          },
          gpslat:{
            number: true
          },
          gpslon:{
            number: true
          },
          locationphone:{
            digits: true
          },
          locationemail:{
            email: true
          },
          locationwebsite:{
            url: true
          }
        }
      });
      
/*      //site report type validation
      var site_report_form = $("#form_sitereporttype");
      site_report_form.validate({
        rules: {
          sitevisit_add_type: {
            required: true,
          }
      
        }
      });*/
      
      //site visit validation
      var sitevisit_form = $("#form_sitevisit_add");
      sitevisit_form.validate({
        rules: {
          sitevisit_add_title: {
            required: true
          },
          sitevisit_add_date:{
            required: true
          },
          sitevisit_add_public_summary:{
            required: true
          },
          sitevisit_add_report:{
            required: true
          }
        }
      });
      
      //site visit validation
      var sitevisit_form_edit = $("#form_sitevisit_edits");
      sitevisit_form_edit.validate({
        rules: {
          sitevisit_title: {
            required: true
          },
          
          sitevisit_date:{
            required: true,
            date: true
          },
          sitevisit_summary:{
            required: true
          }
        }
      });
      
      $(".seturlselect").live( "change", function(event, ui) {
        if($(this).val() == "custom") {
          console.log("custom");
          $(".myurl").show();
        }else{
          console.log("not custom");
          $(".myurl").hide();
        }
      });
      
      //add hidden element
      $('#addactionitem').bind("click", function (event, ui) {
        var snid = $('#sitevisitId').val();
        var form = $('#form_add_actionitems');
        $('<input>').attr({
          'type': 'hidden',
          'id': "action_snid"
        }).val(snid).prependTo(form);
        
      });
      
      //listen for change of lat on save location page
      $( "#gpslat" ).change(function() {
        if($(this).val().length > 0 && $("#gpslon").val().length > 0) {
          $("#location_item_save").button('enable');  
          $("#location_item_save").button('refresh');
        }
      });
      
      //listen for changes of lon on save location page
      $( "#gpslon" ).change(function() {
        if($(this).val().length > 0 && $("#gpslat").val().length > 0) {
          $("#location_item_save").button('enable');  
          $("#location_item_save").button('refresh');
        }
      });
      
      //read image from roadside visit
      $('#roadsidefile').on('change', function(event, ui) {
        if(this.disabled) return alert('File upload not supported!');
        var F = this.files;
        if(F && F[0]) for(var i=0; i<F.length; i++) controller.readImage( F[i], "roadside" );  
        
      });
      
      //read image from roadside visit
      $('#sitevisitfile').on('change', function(event, ui) {
        if(this.disabled) return alert('File upload not supported!');
        var F = this.files;
        if(F && F[0]) for(var i=0; i<F.length; i++) controller.readImage( F[i], "other" );  
        
      });
      
      //handle edit sitevisit click event
      $("#editsitevisit").bind("click", function (event) {
        
        var snid = localStorage.snid;
        if(localStorage.user == "true"){
          snid = parseInt(snid);
        }else{
          snid = snid.toString();
        }
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getSitevisit(db, snid).then(function (sitevisitObject) {
            $("#sitevisit_title").val(sitevisitObject['title']);
            
            $("#sitevisit_date").val(sitevisitObject['field_ftritem_date_visited']['und'][0]['value']);
            
            $("#sitevisit_summary").html(sitevisitObject['field_ftritem_public_summary']['und'][0]['value']);
            localStorage.sitevisit_summary = sitevisitObject['field_ftritem_public_summary']['und'][0]['value'];

            $.mobile.changePage("#page_sitevisit_edits", {transition: "slide"});  
          });
        });
        
      });
      
      //handle edit fieldtrip click event
      $("#edit_fieldtrip").bind("click", function (event) {
        var editform = $("#form_fieldtrip_edits");
        editform.empty();
        var fnid = localStorage.fnid;
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getFieldtrip(db, fnid, function (fieldtripObject) {
            var fieldset = $("<fieldset ></fieldset>");
            
            var titlelabel = $("<label for='sitevisit_title' >Title</label>");
            var titletextffield = $("<input type='text' value='" + fieldtripObject['title'] + "' id='fieldtrip_title_edit' required/>");
            
            var savesitevisitedits = $('<input type="button" data-inline="true" data-theme="b" id="save_fieldtrip_edits" onclick="controller.onFieldtripsave();" value="Save" />');
            
            var cancelsitevisitedits = $('<a href="#" data-role="button" data-inline="true" data-rel="back" data-theme="a" id="cancel_fieldtrip_edits">Cancel</a>');
            
            fieldset.append(
                titlelabel).append(
                    titletextffield).append(
                        savesitevisitedits).append(
                            cancelsitevisitedits);
            
            editform.append(fieldset).trigger('create');
          });
        });
        
      });
      
      //capture photo
      $(".takephoto").bind("click", function (event, ui) {
        controller.capturePhoto();
      });
      
      //save url dialog
      $('.save_url').bind("click", function (event, ui) {
        $(".urllogging").html("clicked the save");
        var url = null;
        if($(".myurl").val().length > 0) {
          $(".clickedurl").html($(".myurl").val());
          
          devtrac.indexedDB.open(function (db) {
            devtrac.indexedDB.clearDatabase(db, 0, function() {
              localStorage.appurl = $(".myurl").val();
              controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
              $('.blockUI.blockMsg').center();
            });
          });
          
        }else if($('.seturlselect option:selected"').val() == "custom" && $(".myurl").val().length == 0) {
          controller.loadingMsg("Please Save a URL", 1500);
          $('.blockUI.blockMsg').center();
          
        }else 
        {
          
          url = $('.seturlselect option:selected"').val();
          
          $(".clickedurl").html($('.seturlselect option:selected"').val());
          
          switch (url) {
            case "local":
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://192.168.38.114/dt11";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  $('.blockUI.blockMsg').center();
                });
              });
              
              break;
              
              
            case "cloud":
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://jenkinsge.mountbatten.net/devtraccloud";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  $('.blockUI.blockMsg').center();
                });
              });
              
              break;
              
            case "manual":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://jenkinsge.mountbatten.net/devtracmanual";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  $('.blockUI.blockMsg').center();
                });
              });
              
              break;
            case "DevtracUganda":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://devtrac.ug";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  $('.blockUI.blockMsg').center();
                });
              });
              
              break;
            case "Choose Url ...":
              
              controller.loadingMsg("Please select one url", 2000);
              $('.blockUI.blockMsg').center();
              break;
              
            case "test":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://test.devtrac.org";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  $('.blockUI.blockMsg').center();
                });
              });
              
              break;
              
            default:
              break;
          }
        }
        
      });
      
      
      //save url dialog
      $('.save_url_settings').bind("click", function (event, ui) {
        var url = null;
        if($(".settingsform .myurl").val().length > 0) {
          
          controller.clearDBdialog().then(function() {
            localStorage.appurl2 = localStorage.appurl;
            localStorage.appurl = $(".myurl").val();
            controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
            $('.blockUI.blockMsg').center();
            controller.updateDB().then(function(){
              
            }).fail(function(){
              
            });
          }).fail(function(){
            controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
            $('.blockUI.blockMsg').center();
          });
          
        }else
        {
          url = $('.settingsform a.chosen-single span').html();
          
          if(url == null){
            url = $('.settingsform .seturlselect').val();
          }
          
          switch (url) {
            case "local":
              
              controller.clearDBdialog().then(function() {
                var url = "http://192.168.38.114/dt11";
                controller.loadingMsg("Saved Url "+url, 2000);
                $('.blockUI.blockMsg').center();
                controller.updateDB(url).then(function(){
                  
                }).fail(function(){
                  
                });
              }).fail(function(){
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
              });
              break;
              
              
            case "cloud":
              
              controller.clearDBdialog().then(function() {
                var url = "http://jenkinsge.mountbatten.net/devtraccloud";
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
                controller.updateDB(url).then(function(){
                }).fail(function(){
                  
                });
              }).fail(function(){
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
              });
              break;
              
            case "manual":
              
              controller.clearDBdialog().then(function(){
                
                var url = "http://jenkinsge.mountbatten.net/devtracmanual";
                controller.loadingMsg("Saved Url "+url, 2000);
                $('.blockUI.blockMsg').center();
                controller.updateDB(url).then(function(){
                  
                }).fail(function(){
                  
                });
              }).fail(function(){
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
              });
              break;
            case "DevtracUganda":
              
              controller.clearDBdialog().then(function(){
                
                var url = "http://devtrac.ug";
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
                controller.updateDB(url).then(function(){
                  
                }).fail(function(){
                  
                });
              }).fail(function(){
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
              });
              break;
            case "Choose Url ...":
              
              controller.loadingMsg("Please select one url", 2000);
              $('.blockUI.blockMsg').center();
              break;
              
            case "test":
              
              controller.clearDBdialog().then(function() {
                
                var url = "http://test.devtrac.org";
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
                
                controller.updateDB(url).then(function(){
                  
                }).fail(function(){
                  
                });
              }).fail(function(){
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                $('.blockUI.blockMsg').center();
              });
              break;
              
            default:
              break;
          }
        }
        
      });
      
      //on click url select setting, clear textfield
      $('.seturlselect').bind("click", function (event, ui) {
        $(".myurl").val("");
      });
      
      //on click url select setting, clear textfield
      $("a.chosen-single span").bind("click", function (event, ui) {
        $(".myurl").val("");
      });
      
      //on click url textfield set chosen dropdown to default
      $('.myurl').bind("click", function (event, ui) {
        $("a.chosen-single span").html("Choose Url ...");
      });
      
      //cancel url dialog
      $('#cancel_url').bind("click", function (event, ui) {
        var urlvalue = $('#url').val();
        if (urlvalue.charAt(urlvalue.length - 1) == '/') {
          localStorage.appurl = urlvalue.substr(0, urlvalue.length - 2);
        }
        $('#url').val("");
      });
      
      //validate login form
      $("#loginForm").validate();
      
      //handle login click event
      $('#page_login_submit').bind("click", function (event, ui) {
        $(".loginlogs").html("clicked sign in");
        if ($("#page_login_name").valid() && $("#page_login_pass").valid()) {
          controller.loadingMsg("Logging In ...", 0);
          $('.blockUI.blockMsg').center();
          
          if(controller.connectionStatus) {
            
            devtrac.indexedDB.open(function (db) {
              auth.login($('#page_login_name').val(), $('#page_login_pass').val(), db).then(function () {
                console.log("success logged in");
                if($("#checkbox-mini-0").is(":checked")){
                  window.localStorage.setItem("usernam", $("#page_login_name").val());
                  window.localStorage.setItem("passw", $("#page_login_pass").val());
                  
                }else{
                  window.localStorage.removeItem("usernam");
                  window.localStorage.removeItem("passw");
                }
                
                
                devtracnodes.countFieldtrips().then(function(){
                  //load field trip details from the database if its one and the list if there's more.
                  controller.loadFieldTripList();
                  
                }).fail(function() {
                  //download all devtrac data for user.
                  controller.fetchAllData().then(function(){
                    
                    //load field trip details from the database if its one and the list if there's more.
                    controller.loadFieldTripList();
                  }).fail(function(error) {
                    auth.logout();
                    controller.loadingMsg(error,5000);
                    $('.blockUI.blockMsg').center();
                  });
                  
                });
                
              }).fail(function (errorThrown) {
                console.log("fail not logged in");
                $.unblockUI();
                
              });
              
            });
            
          }else{
            controller.loadingMsg("Please Connect to Internet ...", 1000);
            $('.blockUI.blockMsg').center();
          }
          
        }
      });
      
      //handle logout click event from dialog
      $('#page_logout_submit').bind("click", function (event, ui) {
        
        if(controller.connectionStatus){
          auth.logout().then(function(){
          });
          
        }else{
          controller.loadingMsg("Please Connect to Internet ...", 1000);
          $('.blockUI.blockMsg').center();
        }
        
      });
      
      //handle logout click from panel menu
      $('.panel_logout').bind("click", function (event, ui) {
        console.log("clicked logout");
        auth.logout();
      });
      
    },
    
    onSuccess: function(position) {
      
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      var acc =  position.coords.accuracy; //smaller the value the more accurate
      
      localStorage.ftritemlatlon = lon +" "+lat;
      localStorage.latlon = lon +" "+lat;
      
      var element = $("#latlon");
      element.val(lat +","+ lon);
      
      $("#location_item_save").button('enable');  
      $("#location_item_save").button('refresh');
    },
    
    // onError Callback receives a PositionError object
    onError: function(error) {
      $("#gpserror").html("");
      console.log('code: '    + error.code    + '\n' +
          'message: ' + error.message + '\n');
      var element_gps = $("#gpserror");
      element_gps.html('code: '    + error.code    + '\n' +
          'message: ' + error.message + '\n');
      
      if(error.code == 1 || error.code == "1") {//PERMISSION_DENIED
        controller.loadingMsg("User denied the request for Geolocation.", 3000);
        $('.blockUI.blockMsg').center();
      }else if(error.code == 2 || error.code == "2") {//POSITION_UNAVAILABLE
        controller.loadingMsg("Please Check GPS is Switched ON.", 3000);
        $('.blockUI.blockMsg').center();
      }else if(error.code == 3 || error.code == "3") {//TIMEOUT
        //controller.loadingMsg("The request to get user location timed out.", 1000);
        // $('.blockUI.blockMsg').center();
      }
    },
    
    //camera functions
    
    onPhotoDataSuccess: function(imageData) {
      var currentdate = new Date(); 
      var datetime = currentdate.getDate()
      + (currentdate.getMonth()+1)
      + currentdate.getFullYear() + "_"  
      + currentdate.getHours()
      + currentdate.getMinutes()
      + currentdate.getSeconds();
      
      var imagename = "img_"+datetime+".jpeg";
      // Get image handle
      
      if(localStorage.ftritemtype == "210") 
      {
        controller.filenames.push(imagename);
        controller.base64Images.push(imageData);
        $("#uploadPreview").append('<div>'+imagename+'</div>');
        
      }else
      {
        controller.fnames.push(imagename);
        controller.b64Images.push(imageData);
        
        $("#imagePreview").append('<div>'+imagename+'</div>');
      }
    },
    
    // A button will call this function
    //
    capturePhoto: function() {
      // Take picture using device camera and retrieve image as base64-encoded string
      navigator.camera.getPicture(controller.onPhotoDataSuccess, controller.onFail, { quality: 30,
        destinationType: controller.destinationType.DATA_URL });
    },
    
    // Called if something bad happens.
    //
    onFail: function(message) {
      console.log("camera error "+message);
      
    },
    
    //clear the watch that was started earlier
    clearWatch: function() {
      
      if (controller.watchID != null || controller.watchid != null)
      {
        console.log("clearing the watch");
        navigator.geolocation.clearWatch(controller.watchID);
        navigator.geolocation.clearWatch(controller.watchid);
        controller.watchID = null;
        controller.watchid = null;
      }else{
        console.log("No watch to clear");
      }
    },
    
    doMenu: function(){
      //open panel on the current page
      var page = $(':mobile-pagecontainer').pagecontainer('getActivePage')[0].id;
      var mypanel = $("#"+page).children(":first-child");
      
      console.log("we are on "+page+" "+mypanel.attr("id"));
      if( mypanel.hasClass("ui-panel-open") == true ) {
        mypanel.panel().panel("close");
      }else{
        mypanel.panel().panel("open");
      }
    },
    
    //clear database and fetch new data
    updateDB: function(url) {
      var d = $.Deferred();
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.clearDatabase(db, 0, function() {
          
          auth.logout().then(function(){
            localStorage.appurl = url;  
          }).fail(function(){
            
          });
          
        });
      });
      return d;
    },
    
    //dialog to clear database
    clearDBdialog: function(){
      var d = $.Deferred();
      //provide a dialog to ask the user if he wants to log in anonymously.
      $('<div>').simpledialog2({
        mode : 'button',
        headerText : 'Info...',
        headerClose : true,
        buttonPrompt : "Devtrac data from "+localStorage.appurl+" will be deleted ?",
        buttons : {
          'OK' : {
            theme : "a",
            id: "changeurl",
            click : function() {
              
              d.resolve();
            }
          },
          'Cancel' : {
            click : function() {
              d.reject();
            },
            icon : "delete",
            theme : "a"
          }
        }
      });
      return d;
    },
    
    //web api geolocation get coordinates
    showPosition: function(pos) {
      localStorage.ftritemlatlon = pos.coords.longitude +" "+pos.coords.latitude;
      localStorage.latlon = pos.coords.longitude +" "+pos.coords.latitude;
      
      var element = $("#latlon");
      element.val("Lon Lat is "+localStorage.latlon);
      
      $("#location_item_save").button('enable');  
      $("#location_item_save").button('refresh');
    },
    
    //web api geolocation error
    errorhandler: function(error) {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          controller.loadingMsg("User denied the request for Geolocation.", 1000);
          $('.blockUI.blockMsg').center();
          $("#gpserror").html("User denied the request for Geolocation");
          break;
        case error.POSITION_UNAVAILABLE:
          controller.loadingMsg("Location information is unavailable.", 1000);
          $('.blockUI.blockMsg').center();
          $("#gpserror").html("Location information is unavailable");
          break;
        case error.TIMEOUT:
          controller.loadingMsg("The request to get user location timed out.", 1000);
          $('.blockUI.blockMsg').center();
          $("#gpserror").html("The request to get user location timed out");
          break;
        case error.UNKNOWN_ERROR:
          controller.loadingMsg("An unknown error occurred.", 1000);
          $('.blockUI.blockMsg').center();
          $("#gpserror").html("An unknown error occurred");
          break;
      }
    },
    
    //edit location
    editlocations: function(anchor){
      var pnidarray = $(anchor).prev("a").attr("id");
      var pnid  = pnidarray.split('-')[1];
      
      if(localStorage.user == "true"){
        pnid = parseInt(pnid);
        localStorage.placeid = pnid;
      }else{
        pnid = pnid.toString();
        localStorage.placeid = pnid;
      }
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getPlace(db, pnid, function (placeObject) {
          if (placeObject != undefined) {
            
            $("#place_title").val(placeObject['title']);
            $("#place_name").val(placeObject['name']);
            $("#place_name").val(placeObject['name']);
            
            if(controller.sizeme(placeObject['field_place_responsible_person']) > 0){
              $("#place_responsible").val(placeObject['field_place_responsible_person']['und'][0]['value']);
            }
            
            if(controller.sizeme(placeObject['field_place_responsible_email']) > 0){
              $("#place_email").val(placeObject['field_place_email']['und'][0]['email']);
            }
            
          }
        });
        
      });
    },
    
    //confirm that cordova is available
    checkCordova: function() {
      var networkState = navigator.connection;
      return networkState;
    },
    
    //read from files
    readImage: function(file, ftritemtype) {
      var di = {};
      var reader = new FileReader();
      var image  = new Image();
      
      reader.readAsDataURL(file);  
      reader.onload = function(_file) {
        image.src = _file.target.result;
        console.log("inside onload reader");
        
        var n = file.name,
        s = ~~(file.size/1024) +'KB';
        
        if(ftritemtype == "roadside")
        {
          controller.filenames.push(n);
          controller.base64Images.push(image.src);
          controller.filesizes.push(~~(file.size/1024));
          $("#uploadPreview").append('<div>'+n+" "+~~(file.size/1024)+'kb</div>');
          
        }else
        {
          controller.fnames.push(n);
          controller.b64Images.push(image.src);
          controller.fsizes.push(~~(file.size/1024));
          
          $("#imagePreview").append('<div>'+n+" "+~~(file.size/1024)+'kb</div>');
        }
        
      };
      
    },
    
    //cordova offline event
    onOffline: function() {
      controller.connectionStatus = false;
      controller.loadingMsg("You are offline. Connect to Upload and Download your Data", 2000);
      $('.blockUI.blockMsg').center();
    },
    
    //cordova online event
    online: function() {
      controller.connectionStatus = true;
      
    },
    
    //handle save for user answers from questionnaire
    saveQuestionnaireAnswers: function() {
      var checkvals = {};
      var radiovals = {};
      var txtvals = {};
      var selectvals = {};  	 
      
      var questionnaire = {};
      questionnaire['answers'] = {};
      questionnaire['qnid'] = localStorage.snid;
      questionnaire['contextnid'] = localStorage.place;
      
      //find element with class = qtions
      $(".qtions").each(function() {
        
        //find all inputs inside the qtions class 
        $(this).find(':input').each(function(){
          
          switch($(this)[0].type) {
            case 'checkbox':       		
              var qtnid = $(this)[0].name.substring($(this)[0].name.indexOf('x')+1);      
              if ($(this)[0].checked) {
                if (questionnaire['answers'][qtnid]) {
                  questionnaire['answers'][qtnid] = $(this)[0].value; 	
                  
                }else {
                  questionnaire['answers'][qtnid] = {};
                  questionnaire['answers'][qtnid] = $(this)[0].value;        		
                }
                
              }  			
              break;
              
            case 'radio': 
              
              var radioid = $(this)[0].name.substring($(this)[0].name.indexOf('o')+1);        		
              
              if ($(this)[0].checked) {	
                questionnaire['answers'][radioid] = $(this)[0].value; 
              }            
              
              break;
              
            case 'text':
              var txtid = $(this)[0].id;        		
              var text_value = $(this)[0].value;  
              var text_len = text_value.length;
              
              if (text_len > 0) {
                txtvals[txtid] = $(this)[0].value;	
                questionnaire['answers'][txtid] = $(this)[0].value;
              }   
              
              break;
              
            case 'select-one': 
              var selectid = $(this)[0].name.substring($(this)[0].name.indexOf('t')+1);        		
              if ($(this)[0].value != "Select One") {	
                questionnaire['answers'][selectid] = $(this)[0].value;
              }
              
              break;        		
              
            default:
              break;
          }
          
        });  
      });
      
      if(controller.sizeme(questionnaire.answers) > 0) {
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.addSavedQuestions(db, questionnaire).then(function() {
            controller.loadingMsg("Saved", 2000);
            $('.blockUI.blockMsg').center();
            $(':input','.qtions')
            .not(':button, :submit, :reset, :hidden')
            .val('')
            .removeAttr('checked')
            .removeAttr('selected');     
            
            $(".qtions input[type='radio']").each(function() {
              $(this).removeAttr('checked');
            });
            
          }).fail(function() {
            //todo: check if we can answer numerous questions for one site visit
            controller.loadingMsg("Already Saved", 2000);
            $('.blockUI.blockMsg').center();
          });      
        });
      }else {
        controller.loadingMsg("Please Answer Atleast Once", 2000);
        $('.blockUI.blockMsg').center();
      }
    },
    
    //load field trip list from db
    loadFieldTripList: function () {
      devtrac.indexedDB.open(function (db) {
        
        devtrac.indexedDB.getAllFieldtripItems(db, function (data) {
          var fieldtripList = $('#list_fieldtrips');
          fieldtripList.empty();
          
          if (data.length > 1) {
            //set home screen to be the list of fieldtrips
            $(".settings_panel_home").attr("href","#home_page");
            
            var sdate;
            var count = 0;
            $('.panel_home').show();
            for (var i = 0, len = data.length; i < len; i++) {
              var fieldtrip = data[i];
              
              if(fieldtrip['editflag'] == 1) {
                count = count + 1;
              }
              
              fieldtrip['field_fieldtrip_start_end_date'].length > 0 ? sdate = fieldtrip['field_fieldtrip_start_end_date']['und'][0]['value'] : sdate = "";
              
              var li = $("<li></li>");
              var a = $("<a href='#page_fieldtrip_details' id='fnid" + fieldtrip['nid'] + "' onclick='controller.onFieldtripClick(this)'></a>");
              var h1 = $("<h1 class='heada1'>" + fieldtrip['title'] + "</h1>");
              var p = $("<p class='para1'>Start Date: " + sdate + "</p>");
              
              a.append(h1);
              a.append(p);
              li.append(a);
              fieldtripList.append(li);
              
            }
            
            fieldtripList.listview().listview('refresh');
            $("#fieldtrip_count").html(count);
            
            $.mobile.changePage("#home_page", "slide", true, false);
            $.unblockUI();
          } else if (data.length == 1) {
            //set home screen to be fieldtrip details
            $(".settings_panel_home").attr("href","#page_fieldtrip_details");
            
            $('.panel_home').hide();
            var count = 0;
            var fObject = data[0];
            
            if(fObject['editflag'] == 1) {
              count = count + 1;
            }
            
            //localStorage.pnid = fObject['field_fieldtrip_places']['und'][0]['target_id'];
            localStorage.ftitle = fObject['title'];
            localStorage.fnid = fObject['nid'];
            
            var sitevisitList = $('#list_sitevisits');
            sitevisitList.empty();
            
            localStorage.fnid = fObject['nid'];
            var startdate = fObject['field_fieldtrip_start_end_date']['und'][0]['value'];
            var enddate = fObject['field_fieldtrip_start_end_date']['und'][0]['value2'];
            
            var startdatestring = JSON.stringify(startdate);
            var enddatestring = JSON.stringify(enddate);
            
            var startdateonly = startdatestring.substring(1, startdatestring.indexOf('T'))
            var enddateonly = enddatestring.substring(1, startdatestring.indexOf('T'))
            
            var startdatearray = startdateonly.split("-");
            var enddatearray = enddateonly.split("-");
            
            var formatedstartdate = startdatearray[2] + "/" + startdatearray[1] + "/" + startdatearray[0];
            var formatedenddate = enddatearray[2] + "/" + enddatearray[1] + "/" + enddatearray[0];
            
            localStorage.fieldtripstartdate = startdatearray[0] + "/" + startdatearray[1] + "/" + startdatearray[2]; 
            
            var startday = parseInt(startdatearray[2]);
            var startmonth = parseInt(startdatearray[1])-1;
            var startyear = parseInt(startdatearray[0]);
            
            var endday = parseInt(enddatearray[2]);
            var endmonth = parseInt(enddatearray[1])-1;
            var endyear = parseInt(enddatearray[0]);            
            
            localStorage.fstartday = parseInt(startday);
            localStorage.fstartmonth = parseInt(startmonth);
            localStorage.fstartyear = parseInt(startyear);
            
            localStorage.fendday = parseInt(endday);
            localStorage.fendmonth = parseInt(endmonth);
            localStorage.fendyear = parseInt(endyear);
            
            $( "#actionitem_date" ).datepicker( "destroy" );
            $( "#sitevisit_date" ).datepicker( "destroy" );
            
            $("#actionitem_date").datepicker({ 
              dateFormat: "yy/mm/dd", 
              minDate: new Date(startyear, startmonth, startday), 
              maxDate: new Date(endyear, endmonth, endday) 
            });
            
            $("#sitevisit_date").datepicker({ 
              dateFormat: "yy/mm/dd", 
              minDate: new Date(startyear, startmonth, startday), 
              maxDate: new Date(endyear, endmonth, endday) 
            });
            
            $("#fieldtrip_details_title").html('').append(fObject['title']);
            $("#fieldtrip_details_status").html('').append(fObject['field_fieldtrip_status']['und'][0]['value']);
            $("#fieldtrip_details_start").html('').append(formatedstartdate);
            $("#fieldtrip_details_end").html('').append(formatedenddate);
            
            
            var list = $("<li></li>");
            var anch = $("<a href='#page_fieldtrip_details' id='fnid" + fObject['nid'] + "' onclick='controller.onFieldtripClick(this)'></a>");
            var h2 = $("<h1 class='heada1'>" + fObject['title'] + "</h1>");
            var para = $("<p class='para1'>Start Date: " + formatedstartdate + "</p>");
            
            anch.append(h2);
            anch.append(para);
            list.append(anch);
            fieldtripList.append(list);
            
            fieldtripList.listview().listview('refresh');
            
            var sitevisitcount = 0;
            devtrac.indexedDB.open(function (db) {
              devtrac.indexedDB.getAllSitevisits(db, function (sitevisit) {
                for (var i in sitevisit) {
                  if(sitevisit[i]['field_ftritem_field_trip'] != undefined){
                    if (sitevisit[i]['field_ftritem_field_trip']['und'][0]['target_id'] == fObject['nid']) {
                      if((sitevisit[i]['user-added'] == true && sitevisit[i]['submit'] == 0) || sitevisit[i]['editflag'] == 1) {
                        sitevisitcount = sitevisitcount + 1;
                      }
                      
                      var sitevisits = sitevisit[i];
                      var li = $("<li></li>");
                      var a = null;
                      if(sitevisit[i]['user-added']) {
                        a = $("<a href='#page_sitevisits_details' id='user" + sitevisits['nid'] + "' onclick='controller.onSitevisitClick(this)'></a>");  
                      }else{
                        a = $("<a href='#page_sitevisits_details' id='snid" + sitevisits['nid'] + "' onclick='controller.onSitevisitClick(this)'></a>");
                      }
                      
                      var h1 = $("<h1 class='heada1'>" + sitevisits['title'] + "</h1>");
                      var p = $("<p class='para1'>Narrative: " + sitevisits['field_ftritem_narrative']['und'][0]['value'] + "</p>");
                      
                      a.append(h1);
                      a.append(p);
                      li.append(a);
                      sitevisitList.append(li);
                      
                    }    
                  }
                  
                }
                
                $("#fieldtrip_count").html(count);
                $("#sitevisit_count").html(sitevisitcount);
                sitevisitList.listview().listview('refresh');
                
                
              });
              
            });
            $.mobile.changePage("#page_fieldtrip_details", "slide", true, false);
            $.unblockUI();
          } else {
            //load field trip details from the database if its one and the list if there's more.
            $.unblockUI();
          }
        });
        
      });
    },
    
    //handle fieldtrip click
    onFieldtripClick: function (anchor) {
      var anchor_id = $(anchor).attr('id');
      var fnid = anchor_id.substring(anchor_id.indexOf('d') + 1);
      localStorage.fnid = fnid;
      
      var sitevisitList = $('#list_sitevisits');
      sitevisitList.empty();
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getFieldtrip(db, fnid, function (fObject) {
          localStorage.ftitle = fObject['title'];
          
          var startdate = fObject['field_fieldtrip_start_end_date']['und'][0]['value'];
          var enddate = fObject['field_fieldtrip_start_end_date']['und'][0]['value2'];
          
          var startdatestring = JSON.stringify(startdate);
          var enddatestring = JSON.stringify(enddate);
          
          var startdateonly = startdatestring.substring(1, startdatestring.indexOf('T'))
          var enddateonly = enddatestring.substring(1, startdatestring.indexOf('T'))
          
          var startdatearray = startdateonly.split("-");
          var enddatearray = enddateonly.split("-");
          
          var formatedstartdate = startdatearray[2] + "/" + startdatearray[1] + "/" + startdatearray[0]
          var c = enddatearray[2] + "/" + enddatearray[1] + "/" + enddatearray[0]
          
          localStorage.fieldtripstartdate = startdatearray[0] + "/" + startdatearray[1] + "/" + startdatearray[2];
          
          $("#fieldtrip_details_start").html(formatedstartdate);
          $("#fieldtrip_details_end").html(c);
          
          $("#fieldtrip_details_title").html(fObject['title']);
          $("#fieldtrip_details_status").html(fObject['field_fieldtrip_status']['und'][0]['value']);
        });
        
        devtrac.indexedDB.getAllSitevisits(db, function (sitevisit) {
          for (var i in sitevisit) {
            if (sitevisit[i]['field_ftritem_field_trip']['und'][0]['target_id'] == fnid) {
              var sitevisits = sitevisit[i];
              var li = $("<li></li>");
              
              if(sitevisit[i]['user-added']) {
                a = $("<a href='#page_sitevisits_details' id='user" + sitevisits['nid'] + "' onclick='controller.onSitevisitClick(this)'></a>");  
              }else{
                a = $("<a href='#page_sitevisits_details' id='snid" + sitevisits['nid'] + "' onclick='controller.onSitevisitClick(this)'></a>");
              }
              
              var h1 = $("<h1 class='heada1'>" + sitevisits['title'] + "</h1>");
              var p = $("<p class='para1'>Narrative: " + sitevisits['field_ftritem_narrative']['und'][0]['value'] + "</p>");
              
              a.append(h1);
              a.append(p);
              li.append(a);
              sitevisitList.append(li);
            }
          }
          sitevisitList.listview('refresh');
        });
      });
      
    },
    
    //reload list of sitevisits
    refreshSitevisits: function () {
      var sitevisitList = $('#list_sitevisits');
      sitevisitList.empty();
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllSitevisits(db, function (sitevisit) {
          for (var i in sitevisit) {
            if (sitevisit[i]['field_ftritem_field_trip']['und'][0]['target_id'] == localStorage.fnid) {
              var sitevisits = sitevisit[i];
              var li = $("<li></li>");
              
              if(sitevisit[i]['user-added']) {
                a = $("<a href='#page_sitevisits_details' id='user" + sitevisits['nid'] + "' onclick='controller.onSitevisitClick(this)'></a>");  
              }else{
                a = $("<a href='#page_sitevisits_details' id='snid" + sitevisits['nid'] + "' onclick='controller.onSitevisitClick(this)'></a>");
              }
              
              var h1 = $("<h1 class='heada1'>" + sitevisits['title'] + "</h1>");
              var p = $("<p class='para1'>Narrative: " + sitevisits['field_ftritem_narrative']['und'][0]['value'] + "</p>");
              
              a.append(h1);
              a.append(p);
              li.append(a);
              sitevisitList.append(li);
            }
          }
          sitevisitList.listview('refresh');
        });
      });
    },
    
    //handle submit of site report type
    submitSitereporttype: function() {
        localStorage.ftritemtype = $("#sitevisit_add_type").val();
        
        localStorage.ftritemdistrict = $("#location_district").val();
        
        if(localStorage.ftritemtype == "210") {
          
          $( "#sitevisit_add_date" ).datepicker( "destroy" );
          var startday = parseInt(localStorage.fstartday);
          var startmonth = parseInt(localStorage.fstartmonth);
          var startyear = parseInt(localStorage.fstartyear);
          
          var endday = parseInt(localStorage.fendday);
          var endmonth = parseInt(localStorage.fendmonth);
          var endyear = parseInt(localStorage.fendyear);
          
          $("#sitevisit_add_date").datepicker({ 
            dateFormat: "yy/mm/dd", 
            minDate: new Date(startyear, startmonth, startday), 
            maxDate: new Date(endyear, endmonth, endday) 
          });
          
          controller.buildSelect("oecdobj", []);
          
          $('#sitevisit_add_report').html("Please provide a full report");
          $('#sitevisit_add_public_summary').html("Please Provide a small summary for the public");
          
        }
        else{
          
          controller.buildSelect("placetype", []);
          
        }
        controller.resetForm($('#form_sitereporttype'));

    },
    
    //handle site visit click
    onSitevisitClick: function (anchor) {
      var state = false;
      var anchor_id = $(anchor).attr('id');
      var index = 0;
      var snid = 0;
      
      if(anchor_id.indexOf('d') != -1) {
        snid = anchor_id.substring(anchor_id.indexOf('d') + 1);
        localStorage.snid = snid;
        localStorage.user = false;
      }
      else if(anchor_id.indexOf('r') != -1) {
        snid = anchor_id.substring(anchor_id.indexOf('r') + 1);
        localStorage.snid = snid;
        localStorage.user = true;
        snid = parseInt(snid);
      }
      
      owlhandler.populateOwl(snid);
      
      localStorage.sitevisitname = $(anchor).children('.heada1').html();
      
      var form = $("#form_sitevisists_details");
      
      var actionitemList = $('#list_actionitems');
      actionitemList.empty();
      
      devtrac.indexedDB.open(function (db) {
        var pnid = 0;
        devtrac.indexedDB.getSitevisit(db, snid).then(function (fObject) {
          
          if(fObject['field_ftritem_place'] != undefined && fObject['field_ftritem_place']['und'] != undefined) {
            localStorage.pnid = fObject['field_ftritem_place']['und'][0]['target_id'];
            if(fObject['user-added'] == true) {
              
              pnid = parseInt(localStorage.pnid);
            }else{
              
              pnid = localStorage.pnid;
            }
            
            
          }else{
            if(fObject['user-added'] == true) {
              pnid = parseInt(localStorage.pnid);
            }else{//needs work
              pnid = "RV";
            }
          }
          
          var sitedate = fObject['field_ftritem_date_visited']['und'][0]['value'];
          var formatedsitedate;
          
          if(localStorage.user == "false" && sitedate.indexOf('/') == -1){
            var sitedatestring = JSON.stringify(sitedate);
            var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
            var sitedatearray = sitedateonly.split("-");
            
            formatedsitedate = sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
          }
          else {
            formatedsitedate = sitedate;            
          }
          
          var sitevisittype = null;
          $("#sitevisists_details_date").html(formatedsitedate);
          
          $('#sitevisists_details_location').show();
          $('#sitevisists_details_location').prev("label").show();
          switch (fObject['taxonomy_vocabulary_7']['und'][0]['tid']) {
            case "209":
              $("#sitevisists_details_type").html("Site Visit");
              break;
            case "210":
              $("#sitevisists_details_type").html("Roadside Observation");
              $('#sitevisists_details_location').hide();
              $('#sitevisists_details_location').prev("label").hide();
              break;
            case "211":
              $("#sitevisists_details_type").html("Human Interest Story");
              break;
            default:
              break
          }
          
          $("#sitevisists_details_title").html(fObject['title']);
          $("#sitevisists_details_summary").html(fObject['field_ftritem_public_summary']['und'][0]['value']);
          
          //get location name
          devtrac.indexedDB.getPlace(db, pnid, function (place) {
            
            if (place != undefined) {
              localStorage.ptitle = place['title'];
              
              $("#sitevisists_details_location").html(place['title']);
              localStorage.respplaceid = place['nid'];
              localStorage.respplacetitle = place['title'];
              localStorage.point = place['field_place_lat_long']['und'][0]['geom'];
              
              mapctlr.initMap(place['field_place_lat_long']['und'][0]['lat'], place['field_place_lat_long']['und'][0]['lon'], state);
              mapctlr.resizeMapIfVisible(); 
            }else {
              if(fObject['user-added'] == true && fObject['taxonomy_vocabulary_7']['und'][0]['tid'] == "210") {
                $("#sitevisists_details_location").html(fObject['ftritem_place']);
                mapctlr.initMap(fObject['field_ftritem_lat_long']['und'][0]['lat'], fObject['field_ftritem_lat_long']['und'][0]['lon'], state);
                mapctlr.resizeMapIfVisible();
                
              }else if(fObject['user-added'] != true && fObject['taxonomy_vocabulary_7']['und'][0]['tid'] == "210") {
                $("#sitevisists_details_location").html("Roadside place name unavailble");
                mapctlr.initMap(fObject['field_ftritem_lat_long']['und'][0]['lat'], fObject['field_ftritem_lat_long']['und'][0]['lon'], state);
                mapctlr.resizeMapIfVisible();
                
              }else{
                $("#sitevisists_details_location").html("Place Unavailable.");
                mapctlr.initMap(0.28316, 32.45168, state);
                mapctlr.resizeMapIfVisible();  
              }
              
            }
            
          });
          
        });
        
        devtrac.indexedDB.getAllActionitems(db, function (actionitem) {
          var actionitemcount = 0;
          for (var i in actionitem) {
            if(actionitem[i]['user-added'] == true && actionitem[i]['submit'] == 0) {
              actionitemcount = actionitemcount + 1;
            }
            if(actionitem[i]['field_actionitem_ftreportitem'] != undefined) {
              var siteid = actionitem[i]['field_actionitem_ftreportitem']['und'][0]['target_id'];
              var sitevisitid = siteid.substring(siteid.indexOf('(')+1, siteid.length-1);
              
              if (actionitem[i]['field_actionitem_ftreportitem']['und'][0]['target_id'] == snid || sitevisitid == snid) {
                var aItem = actionitem[i];
                var li = $("<li></li>");
                var a = ""; 
                
                if(aItem["user-added"] != undefined) {
                  a = $("<a href='#' id='user" + aItem['nid'] + "' onclick='controller.onActionitemclick(this)'></a>");  
                }
                else
                {
                  a = $("<a href='#' id='" + aItem['nid'] + "' onclick='controller.onActionitemclick(this)'></a>");  
                }
                
                
                var h1 = $("<h1 class='heada2'>" + aItem['title'] + "</h1>");
                var p = $("<p class='para2'></p>");
                
                switch (aItem['field_actionitem_status']['und'][0]['value']) {
                  case '1':
                    p.html("Status: Open");
                    break;
                  case '2':
                    p.html("Status: Rejected");
                    break;
                  case '3':
                    p.html("Status: Closed");
                    break;
                  default:
                    break;
                }
                
                a.append(h1);
                a.append(p);
                li.append(a);
                actionitemList.append(li);
              }
            }
            
          }
          
          $("#actionitem_count").html(actionitemcount);
          $("#uploads_listview").listview().listview('refresh');
          actionitemList.listview().listview('refresh');
        });
      });
      
    },
    
    //save site visit edits
    onSitevisitedit: function () {
      tinyMCE.triggerSave();
      
      var editsummary = $("#sitevisit_summary").val();
      var editsummaryvalue = editsummary.substring(editsummary.lastIndexOf("<body>")+6, editsummary.lastIndexOf("</body>")).trim();
      
      if($("#form_sitevisit_edits").valid() && editsummaryvalue.length > 0) {
        
        //save site visit edits
        var updates = {};
        $('#form_sitevisit_edits *').filter(':input').not(':button').each(function () {
          var key = $(this).attr('id').substring($(this).attr('id').indexOf('_') + 1);
          if (this.localName == "textarea") {
            var summary = $(this)[0].value;
            var clean_summary = summary.substring(summary.lastIndexOf('<body>')+6, summary.lastIndexOf('</body>')).trim();
            updates["summary"] = clean_summary;
          }else{
            updates[key] = $(this).val();
          }
          
        });
        
        updates['editflag'] = 1;
        var snid = localStorage.snid;
        if(localStorage.user == "true"){
          snid = parseInt(snid);
        }else{
          snid = snid.toString();
        }
        
        devtrac.indexedDB.open(function (db) {
          //console.log("siite visit is "+localStorage.snid);
          
          devtrac.indexedDB.editSitevisit(db, snid, updates).then(function () {
            
            $("#sitevisists_details_title").html($("#sitevisit_title").val());
            
            if(localStorage.user == "true"){
              $("#user"+localStorage.snid).children(".heada1").html($("#sitevisit_title").val());
            }else{
              $("#snid"+localStorage.snid).children(".heada1").html($("#sitevisit_title").val());
            }
            
            $("#sitevisists_details_date").html($("#sitevisit_date").val());
            $("#sitevisists_details_summary").html(editsummaryvalue);
            
            $.mobile.changePage("#page_sitevisits_details", "slide", true, false);
          });
        });
      }else {
        controller.loadingMsg("Please enter an Edit Summary", 2000)
      }
      
    },
    
    onPlacesave: function (saveButtonReference) {
      //save places edits
      var pnid = '';
      if(localStorage.user == "true"){
        pnid = parseInt(localStorage.placeid);
        
      }else{
        pnid = localStorage.placeid;
        
      }
      
      var updates = {};
      
      devtrac.indexedDB.open(function (db) {
        $('#editlocationform *').filter(':input').each(function () {
          var key = $(this).attr('id').substring($(this).attr('id').indexOf('_') + 1);
          if (key.indexOf('_') == -1 && $(this).val().length > 0) {
            updates[key] = $(this).val();
          }
          
        });
        
        devtrac.indexedDB.editPlace(db, pnid, updates).then(function () {
          controller.loadingMsg('Saved ' + updates['title'], 2000);
          $('.blockUI.blockMsg').center();
          $.mobile.changePage("#page_sitevisits_details", "slide", true, false);
        });
      });
      
    },
    
    //save action item
    onSaveactionitem: function () {
      tinyMCE.triggerSave();
      
      var summarytextarea = $("#actionitem_followuptask").val();
      var summaryvalue = summarytextarea.substring(summarytextarea.lastIndexOf("<body>")+6, summarytextarea.lastIndexOf("</body>")).trim();
      
      if ($("#form_add_actionitems").valid() && summaryvalue.length > 0) {
        //save added action items
        var updates = {};
        
        updates['user-added'] = true;
        updates['nid'] = 1;
        updates['field_actionitem_ftreportitem'] = {};
        updates['field_actionitem_ftreportitem']['und'] = [];
        updates['field_actionitem_ftreportitem']['und'][0] = {};
        
        updates['field_actionitem_due_date'] = {};
        updates['field_actionitem_due_date']['und'] = [];
        updates['field_actionitem_due_date']['und'][0] = {};
        updates['field_actionitem_due_date']['und'][0]['value'] = {};
        
        //todo: get value from database or server
        updates['taxonomy_vocabulary_8'] = {};
        updates['taxonomy_vocabulary_8']['und'] = [];
        updates['taxonomy_vocabulary_8']['und'][0] = {};
        
        //todo: get value from database or server
        updates['taxonomy_vocabulary_6'] = {};
        updates['taxonomy_vocabulary_6']['und'] = [];
        updates['taxonomy_vocabulary_6']['und'][0] = {};
        
        updates['field_actionitem_followuptask'] = {};
        updates['field_actionitem_followuptask']['und'] = [];
        updates['field_actionitem_followuptask']['und'][0] = {};
        
        updates['field_actionitem_severity'] = {};
        updates['field_actionitem_severity']['und'] = [];
        updates['field_actionitem_severity']['und'][0] = {};
        
        updates['field_actionitem_status'] = {};
        updates['field_actionitem_status']['und'] = [];
        updates['field_actionitem_status']['und'][0] = {};
        updates['field_actionitem_responsible'] = {};
        updates['field_actionitem_responsible']['und'] = [];
        updates['field_actionitem_responsible']['und'][0] = {};
        
        updates['field_actionitem_resp_place'] = {};
        updates['field_actionitem_resp_place']['und'] = [];
        updates['field_actionitem_resp_place']['und'][0] = {};
        
        updates['uid'] = localStorage.uid;
        updates['submit'] = 0;
        updates['comment'] = 1;
        updates['type'] = 'actionitem';
        updates['status'] = 1;
        updates['title'] = $("#actionitem_title").val();
        updates['field_actionitem_due_date']['und'][0]['value']['date'] = $("#actionitem_date").val();
        updates['field_actionitem_followuptask']['und'][0]['value'] = summaryvalue;
        updates['field_actionitem_status']['und'][0]['value'] = $("#actionitem_status").val();
        updates['field_actionitem_severity']['und'][0]['value'] = $("#actionitem_priority").val();
        updates['field_actionitem_responsible']['und'][0]['target_id'] = localStorage.realname+" ("+localStorage.uid+")";
        updates['taxonomy_vocabulary_8']['und'][0]['tid'] = '328';
        updates['taxonomy_vocabulary_6']['und'][0]['tid'] = '100';
        updates['field_actionitem_ftreportitem']['und'][0]['target_id'] = localStorage.sitevisitname+" ("+localStorage.snid+")";
        updates['field_actionitem_resp_place']['und'][0]['target_id'] = localStorage.respplacetitle+" ("+localStorage.respplaceid+")";
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getAllActionitems(db, function (actionitems) {
            var actionitemcount = 1;
            for (var k in actionitems) {
              if (actionitems[k]['user-added'] && actionitems[k]['nid'] == updates['nid']) {
                updates['nid'] = actionitems[k]['nid'] + 1;
              }
              if(actionitems[k]['user-added'] == true && actionitems[k]['submit'] == 0) {
                actionitemcount = actionitemcount + 1;
              }
            }
            devtrac.indexedDB.addActionItemsData(db, updates);
            
            var actionitemList = $('#list_actionitems');
            
            var li = $("<li></li>");
            var a = $("<a href='#' id='user" + updates['nid'] + "' onclick='controller.onActionitemclick(this)'></a>");
            var h1 = $("<h1 class='heada2'>" + updates['title'] + "</h1>");
            var p = $("<p class='para2'></p>");
            
            switch (updates['status']) {
              case 1:
                p.html("Status: Open");
                break;
              case 2:
                p.html("Status: Rejected");
                break;
              case 3:
                p.html("Status: Closed");
                break;
              default:
                break;
            }
            
            a.append(h1);
            a.append(p);
            li.append(a);
            actionitemList.append(li);
            
            $("#actionitem_count").html(actionitemcount);
            $("#uploads_listview").listview('refresh');
            
            actionitemList.listview('refresh');
            controller.resetForm($('#form_add_actionitems'));
            $.mobile.changePage("#page_sitevisits_details", "slide", true, false);
          });
          
        });    
      }else {
        controller.loadingMsg("Please fill in a followuptask", 2000)
      }
    },
    
    //save fieldtrip edit
    onFieldtripsave: function() {
      var updates = {};
      
      updates['title'] = $('#fieldtrip_title_edit').val();
      var txt = updates['title'];
      
      if(txt.length > 0) {
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getFieldtrip(db, localStorage.fnid, function(trip) {
            if(trip['title'] == updates['title']){
              
              controller.loadingMsg("Nothing new was added !", 3000);
              $('.blockUI.blockMsg').center();
            }else {
              
              updates['editflag'] = 1;
              
              
              devtrac.indexedDB.editFieldtrip(db, localStorage.fnid, updates).then(function() {
                
                $("#fieldtrip_count").html("1");
                $('#fieldtrip_details_title').html(updates['title']);
                
                controller.loadingMsg("Saved your Edits", 3000);
                $('.blockUI.blockMsg').center();
              });      
              
              
            }
            $.mobile.changePage("#page_fieldtrip_details", "slide", true, false);
          });
        });
      }else{
        controller.loadingMsg("Please Enter a Fieldtrip Title", 2000);
        $('.blockUI.blockMsg').center();
      }
      
    },
    
    //handle action item click
    onActionitemclick: function (anchor) {
      var action_id = $(anchor).attr('id');
      var anid = 0;
      if(action_id.indexOf('r') != -1) {
        anid = action_id .substring(action_id .indexOf('r') + 1);
        localStorage.anid = anid;
        anid = parseInt(anid);
        
        localStorage.actionuser = true;
      }
      else {
        anid = action_id;
        localStorage.anid = anid;
        
        localStorage.actionuser = false;
      }
      
      var form = $("#form_actionitems_details");
      var list_comment = $('#list_comments');
      list_comment.empty();
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getActionItem(db, anid).then(function (fObject) {
          $("#actionitem_resp_location").html(localStorage.respplacetitle);          
          
          var sitedate = fObject['field_actionitem_due_date']['und'][0]['value'];
          
          var formatedsitedate = "";
          
          if(typeof sitedate == 'object') {
            if(sitedate.date.charAt(4) != "/") {
              var sitedatestring = JSON.stringify(sitedate);
              var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
              var sitedatearray = sitedateonly.split("-");
              
              formatedsitedate = sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
              
            }else
            {
              formatedsitedate = sitedate.date;
            }
          }
          else {
            formatedsitedate = sitedate;
          }
          
          $("#actionitem_due_date").html(formatedsitedate);
          $("#actionitem_details_title").html(fObject['title']);
          
          $("#actionitem_ftritem").html(localStorage.sitevisitname);
          
          if (fObject['status'] == "1") {
            $("#actionitem_details_status").html("Open");
          }else {
            $("#actionitem_details_status").html("Closed");
          }
          
          if (fObject['field_actionitem_severity']['und'][0]['value'] == "1") {
            $("#actionitem_details_priority").html("High");
          }else if(fObject['priority'] == "2") {
            $("#actionitem_details_priority").html("Medium");
          }else if(fObject['priority'] == "3") {
            $("#actionitem_details_priority").html("Low");
          }        
          
          $("#actionitem_author").html(localStorage.realname);
          $("#actionitem_resp_person").html(localStorage.realname);
          $("#actionitem_followup_task").html(fObject['field_actionitem_followuptask']['und'][0]['value']);
          
        });
        
        devtrac.indexedDB.getAllComments(db, function (comments) {
          for (var i in comments) {
            if (comments[i]['nid'] == localStorage.anid) {
              var aItem = comments[i];
              
              var li = $("<li></li>");
              var a = $("<a href='#' id='" + aItem['nid'] + "' onclick=''></a>");
              var h1 = $("<h1 class='heada2'>" + aItem['comment_body']['und'][0]['value'] + "</h1>");
              var p = $("<p class='para2'></p>");
              
              a.append(h1);
              a.append(p);
              li.append(a);
              list_comment.append(li);
            }
          }
          list_comment.listview().listview('refresh');
          
        });
      });
      
      $.mobile.changePage("#page_actionitemdetails", "slide", true, false);
    },
    
    //reset form passed as parameter
    resetForm: function(form) {
      form[0].reset();
      form.find('input:text, input:password, input:file, select').val('');
      form.find('input:radio').removeAttr('checked').removeAttr('selected');
    },
    
    //save location
    onSavelocation: function () {
      var locationcount = 0;
      if ($("#form_add_location").valid()) {
        
        //save added location items
        var updates = {};
        
        updates['user-added'] = true;
        updates['nid'] = 1;
        
        updates['title'] = $('#location_name').val();
        updates['status'] = 1;
        updates['type'] = 'place';
        updates['submit'] = 0;
        updates['uid'] = localStorage.uid;
        
        updates['field_actionitem_ftreportitem'] = {};
        updates['field_actionitem_ftreportitem']['und'] = [];
        updates['field_actionitem_ftreportitem']['und'][0] = {};
        updates['field_actionitem_ftreportitem']['und'][0]['target_id'] = localStorage.snid;
        
        var lat = $("#gpslat").val();
        var lon = $("#gpslon").val();
        if(lat.length > 0 && lon.length > 0) {
          localStorage.latlon = lon +" "+lat;  
          
        }
        
        updates['field_place_lat_long'] = {};
        updates['field_place_lat_long']['und'] = [];
        updates['field_place_lat_long']['und'][0] = {};
        updates['field_place_lat_long']['und'][0]['geom'] = "POINT ("+localStorage.latlon+")";
        
        updates['field_place_responsible_person'] = {};
        updates['field_place_responsible_person']['und'] = [];
        updates['field_place_responsible_person']['und'][0] = {};
        updates['field_place_responsible_person']['und'][0]['value'] = $('#location_contact').val();
        
        updates['field_place_responsible_phone'] = {};
        updates['field_place_responsible_phone']['und'] = [];
        updates['field_place_responsible_phone']['und'][0] = {};
        updates['field_place_responsible_phone']['und'][0]['value'] = $('#locationphone').val();
        
        updates['field_place_responsible_email'] = {};
        updates['field_place_responsible_email']['und'] = [];
        updates['field_place_responsible_email']['und'][0] = {};
        updates['field_place_responsible_email']['und'][0]['email'] = $('#locationemail').val();
        
        updates['field_place_responsible_website'] = {};
        updates['field_place_responsible_website']['und'] = [];
        updates['field_place_responsible_website']['und'][0] = {};
        updates['field_place_responsible_website']['und'][0]['url'] = $('#locationwebsite').val();
        
        updates['field_actionitem_status'] = {};
        updates['field_actionitem_status']['und'] = [];
        updates['field_actionitem_status']['und'][0] = {};
        
        //get placetypes information
        updates['taxonomy_vocabulary_1'] = {};
        updates['taxonomy_vocabulary_1']['und'] = [];
        updates['taxonomy_vocabulary_1']['und'][0] = {};
        updates['taxonomy_vocabulary_1']['und'][0]['tid'] = $('#select_placetype').val();
        
        //get district information
        updates['taxonomy_vocabulary_6'] = {};
        updates['taxonomy_vocabulary_6']['und'] = [];
        updates['taxonomy_vocabulary_6']['und'][0] = {};
        updates['taxonomy_vocabulary_6']['und'][0]['tid'] = "93";
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getAllplaces(db, function (locations) {
            for (var k in locations) {
              if (locations[k]['user-added'] && locations[k]['nid'] == updates['nid']) {
                updates['nid'] = locations[k]['nid'] + 1;
                
              }
            }
            
            devtrac.indexedDB.addPlacesData(db, updates).then(function() {
              controller.createSitevisitfromlocation(updates['nid'], $('#location_name').val());
              //stop browser geolocation
              controller.clearWatch();
              $("#imagePreview").html("");
              $.mobile.changePage("#page_fieldtrip_details", "slide", true, false);
              
            });
            
          });
          controller.resetForm($('#form_sitereporttype'));
          
        });  
      }else{
        console.log("location form is invalid");
      }
      
    },
    
    //create sitevisit or human interest story
    createSitevisitfromlocation: function (pnid, title) {
      var ftritemtype = "";
      
      switch (localStorage.ftritemtype) {
        case "209":
          ftritemtype = "Site Visit";
          break;
        case "210":
          ftritemtype = "Roadside Observation";
          break;
        case "211":
          ftritemtype = "Human Interest Story";
          break;
        default:
          break
      }
      
      var updates = {};
      var images = {};
      
      images['base64s'] = controller.b64Images;
      images['names'] = controller.fnames;
      images['sizes'] = controller.fsizes;
      
      updates['user-added'] = true;
      updates['nid'] = 1;
      
      updates['title'] = ftritemtype+" at "+title;
      updates['status'] = 1;
      updates['type'] = 'ftritem';
      updates['submit'] = 0;
      updates['uid'] = localStorage.uid;
      updates['pnid'] = pnid;
      
      //get site visit type
      updates['taxonomy_vocabulary_7'] = {};
      updates['taxonomy_vocabulary_7']['und'] = [];
      updates['taxonomy_vocabulary_7']['und'][0] = {};
      updates['taxonomy_vocabulary_7']['und'][0]['tid'] = localStorage.ftritemtype;
      
      updates['field_ftritem_place'] = {};
      updates['field_ftritem_place']['und'] = [];
      updates['field_ftritem_place']['und'][0] = {};
      updates['field_ftritem_place']['und'][0]['target_id'] = pnid;
      
      updates['field_ftritem_date_visited'] = {};
      updates['field_ftritem_date_visited']['und'] = [];
      updates['field_ftritem_date_visited']['und'][0] = {};
      updates['field_ftritem_date_visited']['und'][0]['value'] = localStorage.fieldtripstartdate;
      
      updates['field_ftritem_public_summary'] = {};
      updates['field_ftritem_public_summary']['und'] = [];
      updates['field_ftritem_public_summary']['und'][0] = {};
      updates['field_ftritem_public_summary']['und'][0]['value'] = "Please Provide a small summary for the public.";
      
      updates['field_ftritem_narrative'] = {};
      updates['field_ftritem_narrative']['und'] = [];
      updates['field_ftritem_narrative']['und'][0] = {};
      updates['field_ftritem_narrative']['und'][0]['value'] =  "Please provide a full report.";
      
      updates['field_ftritem_field_trip'] = {};
      updates['field_ftritem_field_trip']['und'] = [];
      updates['field_ftritem_field_trip']['und'][0] = {};
      updates['field_ftritem_field_trip']['und'][0]['target_id'] = localStorage.fnid;
      
      if($('#sitevisit_add_type').val() == "210") {
        updates['field_ftritem_lat_long'] = {};
        updates['field_ftritem_lat_long']['und'] = [];
        updates['field_ftritem_lat_long']['und'][0] = {};
        updates['field_ftritem_lat_long']['und'][0]['geom'] = "POINT ("+localStorage.latlon+")";
      }
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllSitevisits(db, function (sitevisits) {
          for (var k in sitevisits) {
            if (sitevisits[k]['user-added'] == true && sitevisits[k]['nid'] == updates['nid']) {
              updates['nid'] = sitevisits[k]['nid'] + 1;
            }
          }
          
          images['nid'] = updates['nid'];
          
          devtrac.indexedDB.addSiteVisitsData(db, updates).then(function() {
            controller.refreshSitevisits();
            
            if(images['sizes'].length > 0) {
              
              devtrac.indexedDB.addImages(db, images).then(function() {
                controller.b64Images = [];
                controller.fnames = [];
                controller.fsizes = [];
                
              });
            }
            
          });
          
          controller.resetForm($("#form_add_location"));
        });
        
      });  
    },    
    
    //save sitevisit
    onSavesitevisit: function () {
      tinyMCE.triggerSave();
      
      var summarytextarea = $("#sitevisit_add_public_summary").val();
      var summaryvalue = summarytextarea.substring(summarytextarea.lastIndexOf("<body>")+6, summarytextarea.lastIndexOf("</body>")).trim();
      
      var reporttextarea = $("#sitevisit_add_report").val();
      var reporttextarea = reporttextarea.substring(reporttextarea.lastIndexOf("<body>")+6, reporttextarea.lastIndexOf("</body>")).trim();
      
      if ($("#form_sitevisit_add").valid() && summaryvalue.length > 0 && reporttextarea.length > 0) {
        //save added site visits
        
        var updates = {};
        var images = {};
        
        images['base64s'] = controller.base64Images;
        images['names'] = controller.filenames;
        images['sizes'] = controller.filesizes;
        
        updates['user-added'] = true;
        updates['nid'] = 1;
        
        updates['title'] = $('#sitevisit_add_title').val();
        updates['status'] = 1;
        updates['type'] = 'ftritem';
        updates['submit'] = 0;
        updates['uid'] = localStorage.uid;
        
        updates['taxonomy_vocabulary_7'] = {};
        updates['taxonomy_vocabulary_7']['und'] = [];
        updates['taxonomy_vocabulary_7']['und'][0] = {};
        updates['taxonomy_vocabulary_7']['und'][0]['tid'] = localStorage.ftritemtype;
        
        updates['field_ftritem_date_visited'] = {};
        updates['field_ftritem_date_visited']['und'] = [];
        updates['field_ftritem_date_visited']['und'][0] = {};
        updates['field_ftritem_date_visited']['und'][0]['value'] = $('#sitevisit_add_date').val();
        
        var summary = tinyMCE.get('sitevisit_add_public_summary').getContent();
        updates['field_ftritem_public_summary'] = {};
        updates['field_ftritem_public_summary']['und'] = [];
        updates['field_ftritem_public_summary']['und'][0] = {};
        updates['field_ftritem_public_summary']['und'][0]['value'] = summaryvalue;
        
        var narative = tinyMCE.get('sitevisit_add_report').getContent();
        updates['field_ftritem_narrative'] = {};
        updates['field_ftritem_narrative']['und'] = [];
        updates['field_ftritem_narrative']['und'][0] = {};
        updates['field_ftritem_narrative']['und'][0]['value'] =  narative;
        
        updates['field_ftritem_field_trip'] = {};
        updates['field_ftritem_field_trip']['und'] = [];
        updates['field_ftritem_field_trip']['und'][0] = {};
        updates['field_ftritem_field_trip']['und'][0]['target_id'] = localStorage.fnid;
        
        updates['ftritem_place'] = localStorage.ftritemdistrict;
        
        updates['field_ftritem_images'] = {};
        updates['field_ftritem_images']['und'] = [];
        
        updates['field_ftritem_lat_long'] = {};
        updates['field_ftritem_lat_long']['und'] = [];
        updates['field_ftritem_lat_long']['und'][0] = {};
        updates['field_ftritem_lat_long']['und'][0]['geom'] = localStorage.point;
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getAllSitevisits(db, function (sitevisits) {
            for (var k in sitevisits) {
              if (sitevisits[k]['user-added'] && sitevisits[k]['nid'] == updates['nid']) {
                updates['nid'] = sitevisits[k]['nid'] + 1;
                
              }
            }
            
            images['nid'] = updates['nid'];
            
            devtrac.indexedDB.addSiteVisitsData(db, updates).then(function() {
              controller.refreshSitevisits();
              
              if(images['sizes'].length > 0) {
                devtrac.indexedDB.addImages(db, images).then(function() {
                  controller.base64Images = [];
                  controller.filenames = [];
                  controller.filesizes = [];
                  controller.filedimensions = [];
                });  
                
              }
              
              controller.resetForm($('#form_sitevisit_add'));
              $("#uploadPreview").html("");
              $.mobile.changePage("#page_fieldtrip_details", "slide", true, false);  
            });
            
          });
          
        });  
      }else {
        controller.loadingMsg("Please enter all Fields", 2000)
      }
    },
    
    //save comment
    onSavecomment: function() {
      tinyMCE.triggerSave();
      var commenttextarea = $("#actionitem_comment").val();
      var commentvalue = commenttextarea.substring(commenttextarea.lastIndexOf("<body>")+6, commenttextarea.lastIndexOf("</body>")).trim();
      
      if ($("#actionitem_comment").valid() && commentvalue.length > 0) {
        var anid = "";
        
        if(localStorage.actionuser){
          anid = parseInt(localStorage.anid);
        }
        else
        {
          anid = localStorage.anid;  
        }
        var list_comment = $('#list_comments');
        
        var comment = {};
        
        comment['comment_body'] = {};
        comment['comment_body']['und']  = [];
        comment['comment_body']['und'][0] = {};
        comment['comment_body']['und'][0]['value'] = commentvalue;
        comment['comment_body']['und'][0]['format'] = 1;   
        comment['language'] = 'und';
        comment['nid'] = localStorage.anid;
        comment['cid'] = null;
        comment['submit'] = 0;
        
        comment['format'] = '1';
        comment['status'] = '1';
        
        comment['field_actionitem_status'] = {};
        comment['field_actionitem_status']['und'] = [];
        comment['field_actionitem_status']['und'][0] = {};
        comment['field_actionitem_status']['und'][0]['value'] = 1; 
        
        comment['taxonomy_vocabulary_8'] = {};
        comment['taxonomy_vocabulary_8']['und'] = [];
        comment['taxonomy_vocabulary_8']['und'][0] = {};
        comment['taxonomy_vocabulary_8']['und'][0]['tid'] = '328'; 
        comment['language'] = 'und';
        
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.addCommentsData(db, comment).then(function() {
            var li = $("<li></li>");
            var a = $("<a href='#' id='" + anid + "' onclick=''></a>");
            var h1 = $("<h1 class='heada2'>" + $('#actionitem_comment').val() + "</h1>");
            var p = $("<p class='para2'></p>");
            
            a.append(h1);
            a.append(p);
            li.append(a);
            list_comment.append(li);
            
            list_comment.listview('refresh');
            
            controller.loadingMsg("Saved", 1000);
            $('.blockUI.blockMsg').center();
            $('#actionitem_comment').val("");
            $('#commentcollapse').collapsible('collapse');
            
          }); 	
        });	
        
        tinymce.execCommand('mceSetContent', false, "");
        
      }else{
        controller.loadingMsg("Please fill in a comment", 2000);
      } 
    },
    
    //add hidden element: there's a better way to do this
    onAddactionitemclick: function () {
      var snid = $('#sitevisitId').val();
      $('<input>').attr({
        'type': 'hidden',
        'id': "action_snid"
      }).val(snid).prependTo(form);
      
    },
    
    // device ready event handler
    onDeviceReady: function () {
      controller.checkOnline().then(function(){
        controller.connectionStatus = true;
      }).fail(function(){
        controller.connectionStatus = false;
      });
      
      document.addEventListener("menubutton", controller.doMenu, false);
      
      controller.pictureSource= navigator.camera.PictureSourceType;
      controller.destinationType=navigator.camera.DestinationType;
      
      if(navigator.network.connection.type == Connection.NONE) {
        controller.loadingMsg("Sorry, you are offline", 2000);
        $('.blockUI.blockMsg').center();
        controller.connectionStatus = false;
      } else {
        controller.connectionStatus = true;
      }
    },
    
    // onOnline event handler
    checkOnline: function () {
      var d = $.Deferred();
      
      var networkState = navigator.connection.type;
      
      var states = {};
      states[Connection.UNKNOWN] = 'Unknown connection';
      states[Connection.ETHERNET] = 'Ethernet connection';
      states[Connection.WIFI] = 'WiFi connection';
      states[Connection.CELL_2G] = 'Cell 2G connection';
      states[Connection.CELL_3G] = 'Cell 3G connection';
      states[Connection.CELL_4G] = 'Cell 4G connection';
      states[Connection.CELL] = 'Cell generic connection';
      states[Connection.NONE] = 'No network connection';
      
      if ((states[networkState] == 'No network connection') || (states[networkState] == 'Unknown connection')) {
        d.reject(states[networkState]);
      } else {
        d.resolve(states[networkState]);
      }
      return d;
    },
    
    /**
     * args
     *   vocabularyname {oecdcodes, placetypes}
     *   selectedoptions = options that should already be selected
     *   
     */
    buildSelect: function (vocabularyname, selectedoptions) {
      var select = "<div class='ui-field-contain'><select name='select_"+vocabularyname+"' id='select_"+vocabularyname+"' data-theme='b' data-mini='true' required>";
      var optgroup = "";
      
      controller.fetchOptions(vocabularyname).then(function(optionsarray) {
        
        for(var x in optionsarray) {
          optgroup = optgroup + "<optgroup label=" + optionsarray[x]['hname'] + ">";
          if (optionsarray[x]['children'] != undefined) {
            optgroup =  optgroup + controller.addSelectOptions(optionsarray[x]['children'], '', '') + "</optgroup>";
          }
          
        }
        
        select = select + optgroup + "</select></div>";
        
        controller.createOptgroupElement(select, vocabularyname);
        
      });
      
    },
    
    //recurse through all children and return html with options
    addSelectOptions: function(optionchildren, options, delimeter) {
      var delimeter = delimeter + '--';
      var options = options;
      for(var y in optionchildren) {
        if(optionchildren[y]["children"] != undefined) {
          options = '<option disabled="" value=' + optionchildren[y]['tid'] + ">" +delimeter + " " + optionchildren[y]['cname'] + "</option>" + controller.addSelectOptions(optionchildren[y]["children"], options, delimeter);
          
        }
        else {
          options = "<option value=" + optionchildren[y]['tid'] + ">" +delimeter+ optionchildren[y]['cname'] + "</option>" + options;
          
        }
      }
      return options;
    },
    
    //add select element to appropriate page
    createOptgroupElement: function(select, vocabularyname){
      
      var selectGroup = $(select);
      if (vocabularyname.indexOf("place") != -1) {
        
        //create placetypes codes optgroup
        $('#location_placetypes').empty().append(selectGroup).trigger('create');
        $('#sitevisists_details_subjects').empty().append(selectGroup).trigger('create');
        $.mobile.changePage("#page_add_location", "slide", true, false);
      } 
      else {
        
        //create oecd codes optgroup
        $('#select_oecds').empty().append(selectGroup).trigger('create');
        $.mobile.changePage("#page_sitevisit_add", "slide", true, false);
      }
      
      
    },
    
    // return hierarchy array of either placetypes or oecd codes
    fetchOptions: function(vocabularyname) {
      
      var g = $.Deferred();
      
      var vocabularies = [];
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllTaxonomyItems(db, vocabularyname, function (taxonomies) {
          
          
          var markers = [];
          for(var a in taxonomies) {//loop thru parents
            
            for(var b in taxonomies[a]['children']){//loop thru children
              
              for(var c in taxonomies) {//loop thru parents and check if equal to children
                if(taxonomies[a]['children'][b]['tid'] == taxonomies[c]['htid'] && (a != c)) {
                  taxonomies[a]['children'][b]['children'] = taxonomies[c]['children'];
                  
                  markers[taxonomies[c]['htid']] = taxonomies[c]['htid'];
                  
                }  
              }
              
            }
            
          }
          
          for(var f in taxonomies) {
            for(var k in markers) {
              if(taxonomies[f]['htid'] == markers[k]) {
                taxonomies.splice(f, 1);    
                
              }  
            }
            
          }
          
          vocabularies = taxonomies;
          
          g.resolve(vocabularies);
          
        });
        
      });
      
      return g;
    },
    
    //length of javascript object
    sizeme : function(obj) {
      var size = 0, key;
      for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
      }
      return size;
    },
    
    //message to the user about current running process
    loadingMsg: function(msg, t){
      $.blockUI({ 
        message: msg, 
        fadeIn: 700, 
        fadeOut: 700,
        timeout: t,
        
        css: { 
          width: '300px', 
          border: 'none', 
          padding: '5px', 
          backgroundColor: '#000', 
          '-webkit-border-radius': '10px', 
          '-moz-border-radius': '10px', 
          opacity: .8, 
          color: '#fff' 
        } 
      }); 
      
    },
    
    deleteAllStores: function(stores, db, count, callback) {
      
      if(count <= 0){
        devtrac.indexedDB.deleteAllTables(db, stores, function(response){
          if(response != "Done"){
            console.log("delete error "+response);
          }else{
            count = count + 1;
            controller.deleteAllStores(stores, db, count,  callback);  
          }
          
        });
      }else{
        callback();
      }
    }
    
};
