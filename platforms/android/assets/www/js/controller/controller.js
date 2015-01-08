var controller = {
    pictureSource: null, // picture source
    destinationType: null,
    connectionStatus : true,
    
    //Start Roadside visit image variables 
    base64Images : [],
    filenames : [],
    filedimensions: [],
    filesizes : [],
    imageSource: [],
    //end roadside visit image variables
    
    //Start Human Interest and site visit image variables
    b64Images : [],
    fnames : [],
    fdimensions: [],
    fsizes : [],
    imageSrc: [],
    //end Human Interest and site visit image variables
    
    //Images that have been edited from edit site visit page.
    editedImageNames : [],
    
    watchID : null,
    watchid : null,
    nodes : [vocabularies.getOecdVocabularies, vocabularies.getPlacetypeVocabularies],
    
    objectstores: ["oecdobj", "placetype", "fieldtripobj", "sitevisit", "actionitemsobj", "placesitemsobj", "qtnsitemsobj", "qtionairesitemsobj", "actionitemscomments", "images"],
    
    //on body load
    onLoad: function(){
      document.addEventListener("offline", controller.onOffline, false);
      document.addEventListener("online", controller.online, false);
      
    },
    
    //Application Constructor
    initialize: function () {
      
      //initialise section for templates
      var leftMenu = Handlebars.compile($("#leftmenu-tpl").html()); 
      $(".leftmenu").html(leftMenu());
      
      var header = Handlebars.compile($("#header-tpl").html());
      $("#fieldtrip_details_header").html(header({notes: '<a class="ui-btn-right" data-role="button" data-iconpos="notext" id="notify_fieldtrip"><i class="fa fa-info fa-lg"></i></a>', id: 'fieldtrip', title: 'Fieldtrip Details'}));
      $("#header_login").html(header({id: "login", title: "Devtrac Mobile"}));
      $("#header_home").html(header({id: "home", title: "Home"}));
      $("#header_sync").html(header({id: "sync", title: "Sync Nodes"}));
      $("#header_sitereports").prepend(header({id: "sitereport", title: "Site Report"}));
      $("#header_location").html(header({id: "location", title: "Locations"}));
      $("#header_about").html(header({id: "about", title: "About"}));
      $("#header_addlocation").html(header({id: "addlocation", title: "Locations"})); 
      $("#header_addsitereport").html(header({id: "addsitereport", title: "Add Site Visit"}));
      $("#header_actionitemdetails").html(header({id: "actionitemdetails", title: "Action Item"}));
      $("#header_editsitevisit").html(header({id: "editsitevisit", title: "Edit Site Visit"}));
      $("#header_settings").html(header({id: "settings", title: "Settings"}));
      $("#header_download").html(header({id: "download", title: "Download Nodes"}));
      
      $(window).bind('orientationchange pageshow pagechange resize', mapctlr.resizeMapIfVisible);
      
      //return date in ISO format
      Date.prototype.yyyymmdd = function() {         
        
        var yyyy = this.getFullYear().toString();                                    
        var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
        var dd  = this.getDate().toString();             
        
        return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
      }; 
      
      //faster button click for android cordova version 
      if(controller.checkCordova() != undefined) {
        //faster button clicks
        window.addEventListener('load', function() {
          FastClick.attach(document.body);
        }, false);
        
      }
      
      //center the loading message
      $.fn.center = function () {
        this.css("position","absolute");
        this.css("top", ( $(window).height() - this.height() ) / 2+$(window).scrollTop() + "px");
        this.css("left", ( $(window).width() - this.width() ) / 2+$(window).scrollLeft() + "px");
        return this;
      }
      
      //start with hidden notifications button
      $("#notify_fieldtrip").hide();
      
      //initially hide the menu button on questionnaire
      $("#barsbutton_qtnr").hide();
      
      //Hide menu button on login page
      $("#barsbutton_login").hide();
      
      //set application url if its not set
      if (!localStorage.appurl) {
        //localStorage.appurl = "http://localhost/dt11";
        //localStorage.appurl = "http://192.168.38.113/dt11";
        //localStorage.appurl = "http://192.168.38.114/dt13";
        //localStorage.appurl = "http://jenkinsge.mountbatten.net/devtracmanual";
        localStorage.appurl = "http://demo.devtrac.org";
        //localStorage.appurl = "http://10.0.2.2/dt11";
        //localStorage.appurl = "http://jenkinsge.mountbatten.net/devtraccloud";
        
      }
      
      controller.loadingMsg("Please wait...", 0);
      //Start HTML5 app - it doesnot have cordova defined
      if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
        document.addEventListener("deviceready", controller.onDeviceReady, false);
      } else {
        //check if user is logged in before deciding which
        //start function to call
        
        controller.startDevtracMobile_online();    
        
      }
      
      this.bindEvents();
    },
    
    fetchAllData: function () {
      var d = $.Deferred();   
      var notes = [];
      
      devtrac.indexedDB.open(function (db) {
        devtracnodes.getFieldtrips(db).then(function () {
          
          controller.loadingMsg("Fieldtrips Downloaded", 0);
          
          notes.push('Fieldtrips');
          
          devtracnodes.getSitereporttypes(db).then(function () {
            //save report types in a file
            
            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, saveTypes, failsaveTypes);
            }
            
            controller.loadingMsg("Site Report Types Downloaded", 0);
            
            notes.push('Site Report Types');
            
            devtracnodes.getSiteVisits(db, function(response) {
              
              controller.loadingMsg("Sitevisits Downloaded", 0);
              
              devtracnodes.saveSiteVisit(db, response, function() {
                notes.push('Sitevisits');  
              });
              
              devtracnodes.getPlaces(db, response);  
              
              devtracnodes.getActionItems(db).then(function(){
                
                devtrac.indexedDB.getAllActionitems(db, function(actionitems) {
                  console.log("From db "+actionitems.length);
                  devtracnodes.getActionComments(db, actionitems, function(){
                    console.log("Action comments Downloaded");    
                    
                    devtracnodes.getQuestions(db);
                    
                    var counter = 0;
                    for(var x = 0; x < controller.nodes.length; x++) {
                      controller.nodes[x](db).then(function(response) {
                        console.log("fetch success "+response);
                        counter = counter + 1;
                        
                        if(response == "Oecds") {
                          response = "Subjects";
                        }
                        
                        controller.loadingMsg(response+" Downloaded", 1500);
                        
                        notes.push(response);
                        if(counter > controller.nodes.length - 1) {
                          console.log("creating notes");
                          owlhandler.notes(notes);
                          
                          d.resolve();
                        }
                        
                      }).fail(function(e) {
                        
                        controller.loadingMsg("Error: "+e, 2000);
                        
                        
                        setTimeout(function(){
                          auth.logout().then(function(){
                            
                            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                            }
                          });
                          
                        }, 2500);
                        
                      });  
                      
                    }
                  });  
                  
                });
                
              });
              
            });
            
          }).fail(function(error) {
            d.reject(error);
          });
          
        }).fail(function(error){
          d.reject(error);
        });
      });
      
      return d;
    },
    
    //Bind any events that are required on startup
    bindEvents: function () {
      
      $(".menulistview").listview().listview('refresh');
      
      if($(".seturlselect option:selected").val() == "custom") {
        $(".myurl").show();  
      }else {
        $(".myurl").hide();
      }
      
      //start gps
      $( "#page_add_location" ).bind("pagebeforeshow", function( event ) {
        var el = $('#select_placetype');
        var select_text = $("#select_placetype option:selected").text();
        
        if(select_text.indexOf("--") != -1) {
          var correct_val = $("#select_placetype option:selected").next().val();
          $("#select_placetype option:selected").removeAttr('selected');
          
          el.val(correct_val).selectmenu('refresh');
          
        }
        
        $("#location_item_save").button().button('disable');  
        $("#location_item_save").button().button('refresh');  
        
        if(controller.checkCordova() != undefined) {
          
          if(controller.watchID == null){
            console.log("watch id is null");
            var options = { maximumAge: 5000, timeout: 10000, enableHighAccuracy: true };
            controller.watchID = navigator.geolocation.watchPosition(controller.onSuccess, controller.onError, options);
            
          }
          
        }else {
          if (navigator.geolocation) {
            controller.watchid = navigator.geolocation.watchPosition(controller.showPosition, controller.errorhandler);
            
          } else {
            controller.loadingMsg("Geolocation is not supported by this browser", 1000);
            
          }
          
        }
        
      });
      
      //clear images array for roadside visits
      $("#sitevisit_add_cancel").on('click', function() {
        controller.filenames = [];
        controller.base64Images = [];
        controller.filesizes = [];
        controller.imageSource = [];
        
      });
      
      //stop gps and clear images arrays for human interest and site visits
      $("#cancel_addlocation").on('click', function() {
        controller.fnames = [];
        controller.b64Images = [];
        controller.fsizes = [];
        controller.imageSrc = [];
        
        controller.clearWatch();
        
      });
      
      //save sitevisit
      $("#sitevisit_add_save").bind('click', function(){
        controller.onSavesitevisit();
      });
      
      //save actionitem comment
      $("#actionitem_comment_save").bind('click', function(){
        controller.onSavecomment();
      });
      
      //add site visit
      $("#page_site_report_type").bind('pagebeforeshow', function(){
        
        var addftritem = $("#sitevisit_add_type"); 
        
        addftritem.find('option')
        .remove()
        .end();
        
        addftritem.append('<option value="'+localStorage.humaninterest+'">Human Interest Story</option>');
        addftritem.append('<option value="'+localStorage.roadside+'">Roadside Observation</option>');
        addftritem.append('<option value="'+localStorage.sitevisit+'">Site Visit</option>');
        
        addftritem.val("Human Interest Story").selectmenu('refresh');
      });
      
      //Restyle map page back button before its displayed. 
      $("#mappage").bind('pagebeforeshow', function(){
        //$('#viewlocation_back').trigger("create");
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_sitevisit_add").bind('pagebeforeshow', function(){
        tinymce.init({
          
          selector: "textarea#sitevisit_add_public_summary, textarea#sitevisit_add_report",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage"
                    ],
                    
                    toolbar1: "bold italic underline | bullist numlist | blockquote link",
                    
                    menubar: false,
                    toolbar_items_size: 'small',          
                    setup : function(ed) {
                      
                      ed.on('click', function(e) {
                        console.log('Editor was clicked');
                        var textareatext = e.srcElement.innerHTML
                        if(textareatext.indexOf('summary') != -1) {
                          //tinyMCE.get('sitevisit_add_public_summary').setContent("");
                          
                          tinymce.execCommand('mceSetContent', false, "");
                          tinyMCE.execCommand('mceRepaint');
                        }else if(textareatext.indexOf('report') != -1) {
                          //tinyMCE.get('sitevisit_add_report').setContent("");
                          
                          tinymce.execCommand('mceSetContent', false, "");
                          tinyMCE.execCommand('mceRepaint');
                        }
                        
                      });
                    }
        });
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_sitevisit_edits").bind('pagebeforeshow', function(event, data) {
        
        tinymce.init({
          selector: "textarea#sitevisit_summary, textarea#sitevisit_report",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage"
                    ],
                    
                    toolbar1: "bold italic underline | bullist numlist | blockquote link",
                    
                    menubar: false,
                    toolbar_items_size: 'small',
                    setup: function(ed){
                      ed.on(
                          "init",
                          function(ed) {
                            
                            tinyMCE.execCommand('mceRepaint');
                            
                          }
                      );
                    }
        });
        
      });
      
      //Load location data for edits
      $("#page_location_edits").bind('pagebeforeshow', function(event, data) {
        controller.watchid = navigator.geolocation.watchPosition(controller.showPosition, controller.errorhandler);
        $("#edit_latlon").val(localStorage.latlon);
        var location_type = localStorage.locationtype;
        var location_id;
        
        if(location_type == "user") {
          location_id = parseInt(localStorage.placenid);
        }else{
          location_id = localStorage.placenid;

        }
        
        //Load placetypes if it has not been done before
        if($('#edit_placetypes').children().length == 0) {
          controller.buildSelect("placetype", []);  
        }
        
        devtrac.indexedDB.open(function (db) {
        
        devtrac.indexedDB.getPlace(db, location_id, function(aPlace) {
          console.log(aPlace['nid']+" we have the loca");
          
          $("#editplace_title").val(aPlace['title']);
        
          $("#select_placetype").filter(function() {
            //may want to use $.trim in here
            return $(this).val() == aPlace['taxonomy_vocabulary_1']['und'][0]['tid']; 
          }).prop('selected', true).selectmenu('refresh');
          
          //$("#select_placetype").val().attr("selected", "selected").selectmenu('refresh');
          
          if(aPlace['field_place_responsible_person']['und'] != undefined && aPlace['field_place_responsible_person']['und'][0]['value'] != undefined) {
            $("#editplace_name").val(aPlace['field_place_responsible_person']['und'][0]['value']);
          }else {
            $("#editplace_name").val("Unavailable");
          }
          
          if(localStorage.user == "true") {
            if(aPlace['field_place_lat_long']['und'][0]['geom'] != undefined) {
              $("#edit_gpslat").val(aPlace['field_place_lat_long']['und'][0]['lat']);
              $("#edit_gpslon").val(aPlace['field_place_lat_long']['und'][0]['lon']);
            }  
            if(aPlace['field_place_responsible_phone'].length > 0 && aPlace['field_place_responsible_phone']['und'][0]['value'] != undefined) {
              $("#editplace_phone").val(aPlace['field_placeresponsible_phone']['und'][0]['value']);
            }else if(controller.sizeme(aPlace['field_place_responsible_phone']) > 0 && aPlace['field_place_responsible_phone']['und'][0]['value'] != undefined) {
              $("#editplace_phone").val(aPlace['field_place_responsible_phone']['und'][0]['value']);
            }
            if(aPlace['field_place_responsible_email'].length > 0 && aPlace['field_place_responsible_email']['und'][0]['email'] != undefined) {
              $("#editplace_email").val(aPlace['field_place_responsible_email']['und'][0]['email']);
            }else if(controller.sizeme(aPlace['field_place_responsible_email']) > 0 && aPlace['field_place_responsible_email']['und'][0]['email'] != undefined) {
              $("#editplace_email").val(aPlace['field_place_responsible_email']['und'][0]['email']);
            }
            if(aPlace['field_place_responsible_website'].length > 0 && aPlace['field_place_responsible_website']['und'][0]['url'] != undefined) {
              $("#editplace_website").val(aPlace['field_place_responsible_website']['und'][0]['url']);
            }else if(controller.sizeme(aPlace['field_place_responsible_website']) > 0 && aPlace['field_place_responsible_website']['und'][0]['url'] != undefined) {
              $("#editplace_website").val(aPlace['field_place_responsible_website']['und'][0]['url']);
            }
          }else {
            if(aPlace['field_place_lat_long']['und'][0]['lat'] != undefined) {
              $("#edit_gpslat").val(aPlace['field_place_lat_long']['und'][0]['lat']);
              $("#edit_gpslon").val(aPlace['field_place_lat_long']['und'][0]['lon']);
            }  
            if(aPlace['field_place_phone'].length > 0 && aPlace['field_place_phone']['und'][0]['value'] != undefined ||
                controller.sizeme(aPlace['field_place_phone']) && aPlace['field_place_phone']['und'][0]['value'] != undefined) {
              $("#editplace_phone").val(aPlace['field_place_phone']['und'][0]['phone']);
            }
            
            if(aPlace['field_place_email'].length > 0 && aPlace['field_place_email']['und'][0]['email'] != undefined || 
                controller.sizeme(aPlace['field_place_email']) && aPlace['field_place_email']['und'][0]['value'] != undefined) {
              $("#editplace_email").val(aPlace['field_place_email']['und'][0]['email']);
            }
            if(aPlace['field_place_website'].length > 0 && aPlace['field_place_website']['und'][0]['url'] != undefined ||
                controller.sizeme(aPlace['field_place_website']) && aPlace['field_place_website']['und'][0]['url'] != undefined) {
              $("#editplace_website").val(aPlace['field_place_website']['und'][0]['url']);
            }
          }
          
        });
        });
        
      });
      
      //Load location data for edits
      $("#page_location_details").bind('pagebeforeshow', function(event, data) {
        var location_type = localStorage.locationtype;
        var location_id;
        
        if(location_type == "user") {
          location_id = parseInt(localStorage.placenid);
        }else{
          location_id = localStorage.placenid;

        }
        
/*      

        <label for="location_details_person"><b>Contact person:
        </b></label>
        <p id="location_details_person" required></p>

        <label for="location_details_phone"><b>Phone: </b></label>
        <p id="location_details_phone" required></p>

        <label for="location_details_email"><b>Email: </b></label>
        <p id="sitevisists_details_email" required></p>
        
        <label for="location_details_website"><b>Website: </b></label>
        <p id="sitevisists_details_website" required></p>
        */
        
        devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getPlace(db, location_id, function(aPlace) {
          $("#location_details_title").html(aPlace['title']);
          
          if(aPlace['field_place_responsible_person']['und'][0]['value'] != undefined) {
            $("#location_details_person").html(aPlace['field_place_responsible_person']['und'][0]['value']);
          }else {
            $("#location_details_person").html(aPlace['field_place_responsible_person']['und'][0]['value']);
          }
          
          if(localStorage.user == "true") {
            
            if(aPlace['field_place_responsible_phone'].length > 0 && aPlace['field_place_responsible_phone']['und'][0]['value'] != undefined) {
              $("#location_details_phone").html(aPlace['field_placeresponsible_phone']['und'][0]['value']);
            }else if(controller.sizeme(aPlace['field_place_responsible_phone']) > 0 && aPlace['field_place_responsible_phone']['und'][0]['value'] != undefined) {
              $("#location_details_phone").html(aPlace['field_place_responsible_phone']['und'][0]['value']);
            }
            if(aPlace['field_place_responsible_email'].length > 0 && aPlace['field_place_responsible_email']['und'][0]['email'] != undefined) {
              $("#location_details_email").html(aPlace['field_place_responsible_email']['und'][0]['email']);
            }else if(controller.sizeme(aPlace['field_place_responsible_email']) > 0 && aPlace['field_place_responsible_email']['und'][0]['email'] != undefined) {
              $("#location_details_email").html(aPlace['field_place_responsible_email']['und'][0]['email']);
            }
            if(aPlace['field_place_responsible_website'].length > 0 && aPlace['field_place_responsible_website']['und'][0]['url'] != undefined) {
              $("#location_details_website").html(aPlace['field_place_responsible_website']['und'][0]['url']);
            }else if(controller.sizeme(aPlace['field_place_responsible_website']) > 0 && aPlace['field_place_responsible_website']['und'][0]['url'] != undefined) {
              $("#location_details_website").html(aPlace['field_place_responsible_website']['und'][0]['url']);
            }
          }else {
            
            if(aPlace['field_place_phone'].length > 0 && aPlace['field_place_phone']['und'][0]['value'] != undefined ||
                controller.sizeme(aPlace['field_place_phone']) && aPlace['field_place_phone']['und'][0]['value'] != undefined) {
              $("#location_details_phone").prev('label').show();
              $("#location_details_phone").html(aPlace['field_place_phone']['und'][0]['phone']);
            }else {
              $("#location_details_phone").prev('label').hide();
            }
            
            if(aPlace['field_place_email'].length > 0 && aPlace['field_place_email']['und'][0]['email'] != undefined || 
                controller.sizeme(aPlace['field_place_email']) && aPlace['field_place_email']['und'][0]['value'] != undefined) {
              $("#location_details_email").prev('label').show();
              $("#location_details_email").html(aPlace['field_place_email']['und'][0]['email']);
            }else {
              $("#location_details_email").prev('label').hide();
            }
            
            if(aPlace['field_place_website'].length > 0 && aPlace['field_place_website']['und'][0]['url'] != undefined ||
                controller.sizeme(aPlace['field_place_website']) && aPlace['field_place_website']['und'][0]['url'] != undefined) {
              $("#location_details_website").prev('label').show();
              $("#location_details_website").html(aPlace['field_place_website']['und'][0]['url']);
            }else {
              $("#location_details_website").prev('label').hide();
            }
          }
          
        });
        });
        
      });
      
      //apply tinymce b4 this page is displayed
      $("#page_add_actionitem_comment").bind('pagebeforeshow', function(event, data) {
        
        tinymce.init({
          selector: "textarea#add_actionitem_comment",
          plugins: [
                    "advlist autolink autosave link lists charmap hr anchor",
                    "visualblocks visualchars code fullscreen nonbreaking",
                    "contextmenu directionality template textcolor paste fullpage"
                    ],
                    
                    toolbar1: "bold italic underline | bullist numlist | blockquote link",
                    
                    menubar: false,
                    toolbar_items_size: 'small',
                    setup: function(ed){
                      ed.on(
                          "init",
                          function(ed) {
                            
                            tinymce.execCommand('mceSetContent', false, "");
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
                    "contextmenu directionality template textcolor paste fullpage"
                    ],
                    
                    toolbar1: "bold italic underline | bullist numlist | blockquote link",
                    
                    menubar: false,
                    toolbar_items_size: 'small'
        });
      });
      
      /*//initialise navbar for site visit details
      $(document).on('pagebeforecreate', '#page_sitevisits_details', function() {
        $("#sitenav").html('<ul>' +
            '<li><a href="#page_add_questionnaire"><i class="fa fa-list-alt fa-lg"></i>&nbsp&nbsp Questionnaire</a></li>' +
            '<li><a href="#mappage" class="panel_map" onclick="var state=false; var mapit = true; mapctlr.initMap(null, null, state, mapit);"><i class="fa fa-map-marker fa-lg"></i>&nbsp&nbsp Map</a></li>' +
        '</ul>');
      });*/
      
      //empty image arrays on cancel of site visit edits
      $("#cancel_site_visit_edits").bind('click', function() {
        controller.editedImageNames = [];
        if(localStorage.reportType == "roadside") {
          controller.filenames = [];
          controller.base64Images = [];
          controller.imageSource = [];
        }else {
          controller.fnames = [];
          controller.b64Images  = [];
          controller.imageSrc  = [];
        }
        
      });
      
      //show the connected url in the drop down select - login page
      $("#page_login").bind('pagebeforeshow', function() {
        controller.resetLoginUrls();
      });
      
      //show the connected url in the drop down select - settings page
      $("#page_add_settings").bind('pagebeforeshow', function() {
        var el = $('#settingselect');
        
        var url = localStorage.appurl;
        
        if(url.indexOf("test") != -1) {
          // Select the relevant option, de-select any others
          el.val('test').selectmenu('refresh');
          
        }else if(url.indexOf("cloud") != -1) {
          // Select the relevant option, de-select any others
          el.val('cloud').selectmenu('refresh');
          
        }else if(url.indexOf("manual") != -1) {
          // Select the relevant option, de-select any others
          el.val('manual').selectmenu('refresh');
          
        }else if(url.indexOf("dt13") != -1 || url.indexOf("local") != -1 || url.indexOf("10.0.2") != -1 || url.indexOf("192.168") != -1) {
          
          $(".myurl").show();  
          
          //show custom url in the textfield
          $(".myurl").val(localStorage.appurl);
          
          // Select the relevant option, de-select any others
          el.val('custom').selectmenu('refresh');
          
        }else if(url.indexOf("emo") != -1) {
          // Select the relevant option, de-select any others
          el.val('demo').selectmenu('refresh');
          
        }
        
      });
      
      //Remove loading page on load of page scanner
      $("#page_scanner").bind('pagebeforeshow', function(){
        $('#page_loading').remove();
        
      });
      
      //count nodes for upload before uploads page is shown
      $("#syncall_page").bind('pagebeforeshow', function(){
        
        controller.countAllNodes();
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
                  
                  
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.clearDatabase(db, 0, function() {
                      
                      controller.fetchAllData().then(function(){
                        devtracnodes.countOecds().then(function() {
                          
                          //load field trip details from the database if its one and the list if there's more.
                          controller.loadFieldTripList();                    
                        }).fail(function() {
                          
                          controller.loadingMsg("Subjects were not found", 2000);
                          
                          
                          setTimeout(function() {
                            auth.logout().then(function(){
                              
                              if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                              }
                            });
                            
                          }, 2000);
                          
                        });          
                      }).fail(function(error){
                        auth.logout().then(function(){
                          if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                          }
                        });
                        
                        if(error.indexOf("field") != -1){
                          controller.loadingMsg(error,5000);  
                          
                        }
                        
                      });
                      
                    });
                  });      
                  
                }else{
                  controller.loadingMsg("Please Connect to Internet ...", 2000);
                  
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
      
      //hide first page after loading
      $( "#page_fieldtrip_details" ).bind("pagebeforeshow", function (e, ui) {
        
        $.unblockUI({ 
          onUnblock: function() {
            document.removeEventListener("backbutton", controller.onBackKeyDown, false);
          }
        
        })
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
            required: true
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
      
      //site visit validation
      var sitevisit_form = $("#form_sitevisit_add");
      sitevisit_form.validate({
        rules: {
          sitevisit_add_title: {
            required: true
          },
          sitevisit_add_date:{
            required: true,
            date: true
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
          
          $(".myurl").show();
        }else{
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
        
        //$( "#actionitem_date" ).datepicker("destroy");
        
        $("#actionitem_date").datepicker({ 
          dateFormat: "yy/mm/dd", 
          minDate: new Date(localStorage.fstartyear, localStorage.fstartmonth, localStorage.fstartday), 
          maxDate: new Date(localStorage.fendyear, localStorage.fendmonth, localStorage.fendday) 
        });
        
        controller.buildSelect("oecdobj", []);
        
      });
      
      //listen for change of lat on save location page
      $( "#gpslat" ).change(function() {
        if($(this).val().length > 0 && $("#gpslon").val().length > 0) {
          $("#location_item_save").button().button('enable');  
          $("#location_item_save").button().button('refresh');
        }
      });
      
      //listen for changes of lon on save location page
      $( "#gpslon" ).change(function() {
        if($(this).val().length > 0 && $("#gpslat").val().length > 0) {
          $("#location_item_save").button().button('enable');  
          $("#location_item_save").button().button('refresh');
        }
      });
      
      //read image from roadside visit
      $('#roadsidefile').on('change', function(event, ui) {
        if(this.disabled) return alert('File upload not supported!');
        var F = this.files;
        if(F && F[0]) for(var i=0; i<F.length; i++) controller.readImage( F[i], "roadside" );  
        
      });
      
      //read image from site visit and human interest story
      $('#sitevisitfile').on('change', function(event, ui) {
        if(this.disabled) return alert('File upload not supported!');
        var F = this.files;
        if(F && F[0]) for(var i=0; i<F.length; i++) controller.readImage( F[i], "other" );  
        
      });
      
      //handle edit sitevisit click event
      $("#editsitevisit").bind("click", function (event) {
        
        var x = new Date();
        var isodate = x.yyyymmdd();
        var timenow = x.getHours()+":"+x.getMinutes()+":"+x.getSeconds();
        
        var snid = localStorage.snid;
        if(localStorage.user == "true"){
          snid = parseInt(snid);
        }else{
          snid = snid.toString();
        }
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getSitevisit(db, snid).then(function (sitevisitObject) {
            
            $("#sitevisit_title").val(sitevisitObject['title']);
            
            var uncleandate =  sitevisitObject['field_ftritem_date_visited']['und'][0]['value'];
            var cleandate = "";
            if(uncleandate.indexOf("T") != -1){
              cleandate = uncleandate.substring(0, uncleandate.indexOf("T"));  
            }else {
              cleandate = uncleandate;
            }
            
            var datetimenow;
            if(cleandate.length > 0) {
              datetimenow = cleandate + "T" +timenow;
            }else{
              datetimenow = isodate +"T" + timenow;
            }
            
            $("#sitevisit_date").val(datetimenow);
            
            $("#sitevisit_summary").html(sitevisitObject['field_ftritem_public_summary']['und'][0]['value']);
            $("#sitevisit_report").html(sitevisitObject['field_ftritem_narrative']['und'][0]['value']);
            
            localStorage.sitevisit_summary = sitevisitObject['field_ftritem_public_summary']['und'][0]['value'];
            localStorage.sitevisit_report = sitevisitObject['field_ftritem_narrative']['und'][0]['value'];
            
            devtrac.indexedDB.getImage(db, snid).then(function(imagearray) {
              
              var base64_initials = "data:image/jpeg;base64,";
              var base64_source = "";
              $("#editimagefile_list").empty();
              
              for(var x in imagearray['names']) {
                //check if this image exists before creating html list item
                if(imagearray['base64s'][x] != "") {
                  console.log("kitkat is "+imagearray['kitkat'][x]);
                  if(imagearray['kitkat'][x] == "hasnot") {
                    
                    base64_source = base64_initials+imagearray['base64s'][x];
                  }else {
                    base64_source = imagearray['base64s'][x];
                    
                  }
                  
                  listitem = ' <li class="original_image"><a href="#">'+
                  '<img src="'+ base64_source +'" style="width: 80px; height: 80px;">'+
                  '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+imagearray['names'][x]+'</div></h2></a>'+
                  '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
                  '</li>';
                  
                  controller.addImageEdits('edit',listitem);
                  
                }
                
              }
              
            }).fail(function(){
              
              $("#editimagefile_list").empty(); 
            });
            
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
            
            var cancelsitevisitedits = $('<a href="#page_fieldtrip_details" data-role="button" data-inline="true" data-theme="a" id="cancel_fieldtrip_edits">Cancel</a>');
            
            fieldset.append(
                titlelabel).append(
                    titletextffield).append(
                        savesitevisitedits).append(
                            cancelsitevisitedits);
            
            editform.append(fieldset).trigger('create');
          });
        });
        
      });
      
      //capture photo from all other pages of the app
      $(".takephoto").bind("click", function (event, ui) {
        localStorage.editsitevisitimages = "false";
        controller.capturePhoto();
        
      });
      
      //capture photo from site visit edit page
      $(".takephotoedit").bind("click", function (event, ui) {
        localStorage.editsitevisitimages = "true";
        controller.capturePhoto();
        
      });
      
      //save url dialog
      $('.save_url').bind("click", function (event, ui) {
        //$(".urllogging").html("clicked the save");
        var url = null;
        if($(".myurl").val().length > 0) {
          //$(".clickedurl").html($(".myurl").val());
          
          devtrac.indexedDB.open(function (db) {
            devtrac.indexedDB.clearDatabase(db, 0, function() {
              localStorage.appurl = $(".myurl").val();
              controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
              
            });
          });
          
        }else if($('.seturlselect option:selected"').val() == "custom" && $(".myurl").val().length == 0) {
          controller.loadingMsg("Please Save a URL", 1500);
          
          
        }else 
        {
          
          url = $('.seturlselect option:selected"').val();
          
          //$(".clickedurl").html($('.seturlselect option:selected"').val());
          
          switch (url) {
            case "local":
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://192.168.38.114/dt13";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  
                });
              });
              
              break;
              
              
            case "cloud":
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://jenkinsge.mountbatten.net/devtraccloud";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  
                });
              });
              
              break;
              
            case "manual":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://jenkinsge.mountbatten.net/devtracmanual";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  
                });
              });
              
              break;
            case "DevtracUganda":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://devtrac.ug";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  
                });
              });
              
              break;
            case "Choose Url ...":
              
              controller.loadingMsg("Please select one url", 2000);
              
              break;
              
            case "test":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://jenkinsge.mountbatten.net/devtracorgtest";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  
                });
              });
              
              break;
              
            case "demo":
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.clearDatabase(db, 0, function() {
                  localStorage.appurl = "http://demo.devtrac.org";
                  controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                  
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
        localStorage.custom = "";
        var url = $('.settingsform .seturlselect option:selected').val();
        console.log("url is "+url+" "+$(".settingsform .myurl").val());
        switch (url) {
          case "custom":
            localStorage.custom = "custom"
              controller.clearDBdialog().then(function() {
                
                controller.resetLoginUrls();
                
                controller.updateDB($(".settingsform .myurl").val());
                
              }).fail(function() {
                controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
                
              });
            
            break;
            
            
          case "cloud":
            
            controller.clearDBdialog().then(function() {
              var url = "http://jenkinsge.mountbatten.net/devtraccloud";
              
              controller.updateDB(url).then(function(){
              }).fail(function(){
                
              });
            }).fail(function(){
              controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
              
            });
            break;
            
          case "manual":
            
            controller.clearDBdialog().then(function(){
              
              var url = "http://jenkinsge.mountbatten.net/devtracmanual";
              
              controller.updateDB(url).then(function(){
                
              }).fail(function(){
                
              });
            }).fail(function(){
              controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
              
            });
            break;
          case "DevtracUganda":
            
            controller.clearDBdialog().then(function(){
              
              var url = "http://devtrac.ug";
              
              controller.updateDB(url).then(function(){
                
              }).fail(function(){
                
              });
            }).fail(function(){
              controller.loadingMsg("Saved Url "+url, 2000);
              
            });
            break;
          case "Choose Url ...":
            
            controller.loadingMsg("Please select one url", 2000);
            
            break;
            
          case "test":
            
            controller.clearDBdialog().then(function() {
              
              var url = "http://jenkinsge.mountbatten.net/devtracorgtest";
              
              controller.updateDB(url).then(function(){
                localStorage.appurl = url;
              }).fail(function(){
                localStorage.appurl = url;
              });
            }).fail(function(){
              localStorage.appurl = url;
              controller.loadingMsg("Saved Url "+url, 2000);
              
            });
            break;
            
          case "demo":
            
            controller.clearDBdialog().then(function() {
              
              var url = "http://demo.devtrac.org";
              controller.loadingMsg("Saved Url "+url, 2000);
              
              
              controller.updateDB(url).then(function(){
                
              }).fail(function(){
                
              });
            }).fail(function(){
              
              controller.loadingMsg("Saved Url "+localStorage.appurl, 2000);
              
            });
            break;
            
          default:
            break;
        }
        
      });
      
      //on click url select setting, clear textfield
      $('.seturlselect').bind("click", function (event, ui) {
        $(".myurl").val("");
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
        
        if ($("#page_login_name").valid() && $("#page_login_pass").valid()) {
          controller.loadingMsg("Logging In ...", 0);
          
          if(controller.connectionStatus) {
            devtrac.indexedDB.open(function (db) {
              auth.login($('#page_login_name').val(), $('#page_login_pass').val(), db).then(function () {
                
                if($("#checkbox-mini-0").is(":checked")){
                  window.localStorage.setItem("usernam", $("#page_login_name").val());
                  window.localStorage.setItem("passw", $("#page_login_pass").val());
                  
                  if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                    localStorage.username = $("#page_login_name").val();
                    localStorage.password = $("#page_login_pass").val();
                    
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, saveUserInfo, failsaveUserInfo);
                  }
                  
                }else{
                  window.localStorage.removeItem("usernam");
                  window.localStorage.removeItem("passw");
                }
                
                
                devtracnodes.countFieldtrips().then(function(){
                  devtracnodes.countOecds().then(function() {
                    
                    //load field trip details from the database if its one and the list if there's more.
                    controller.loadFieldTripList();                    
                  }).fail(function() {
                    //download all devtrac data for user.
                    controller.fetchAllData().then(function(){
                      devtracnodes.countOecds().then(function() {
                        
                        //load field trip details from the database if its one and the list if there's more.
                        controller.loadFieldTripList();                    
                      }).fail(function() {
                        console.log("didnt find oecds");
                        controller.loadingMsg("Subjects were not found", 2000);
                        
                        
                        setTimeout(function() {
                          auth.logout().then(function(){
                            
                            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                            }
                            
                          });
                          
                        }, 2000);
                        
                      });
                    }).fail(function(error) {
                      auth.logout().then(function(){
                        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                          window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                        }
                      });
                      controller.loadingMsg(error,5000);
                      
                    });
                    
                  });
                  
                }).fail(function() {
                  //download all devtrac data for user.
                  controller.fetchAllData().then(function(){
                    
                    devtracnodes.countOecds().then(function() {
                      
                      //load field trip details from the database if its one and the list if there's more.
                      controller.loadFieldTripList();                    
                    }).fail(function() {
                      console.log("didnt find oecds");
                      controller.loadingMsg("Subjects were not found", 2000);
                      
                      
                      setTimeout(function() {
                        auth.logout().then(function(){
                          if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                          }
                        });
                        
                      }, 2000);
                      
                    });
                  }).fail(function(error) {
                    auth.logout().then(function(){
                      if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                      }
                      
                    });
                    controller.loadingMsg(error,5000);
                    
                  });
                  
                });
                
              }).fail(function (errorThrown) {
                console.log("fail not logged in");
                $.unblockUI({ 
                  onUnblock: function() {
                    document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                  }
                
                });
                
              });
              
            });
            
          }else {
            controller.loadingMsg("Please Connect to Internet ...", 1000);
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
          
        }
        
      });
      
      //handle logout click from panel menu
      $('.panel_logout').bind("click", function (event, ui) {
        
        if(controller.connectionStatus) {
          auth.logout().then(function(){
          
            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
            }
            
          });  
        }else {
          controller.loadingMsg("Please Connect to Internet ...", 1000);
        }
        
      });
      
      //handle click event for edit images from the html5 version
      $('#editImageFile').on('change', function(event, ui) {
        
        var ftritem_type = localStorage.reportType;
        
        if(ftritem_type.indexOf("oa") != -1) {
          
          if(this.disabled) return alert('File upload not supported!');
          var F = this.files;
          if(F && F[0]) for(var i=0; i<F.length; i++) controller.readImage( F[i], "roadside", 'edit' );
          
          
        }else {
          if(this.disabled) return alert('File upload not supported!');
          var F = this.files;
          if(F && F[0]) for(var i=0; i<F.length; i++) controller.readImage( F[i], "other", 'edit' );
          
        }
        
      });
      
      $(document).live("pagebeforechange", function(e,ob) {
        
        if(ob.options.fromPage && ob.toPage[0].id === "page_dynamic") {
          console.log("blocking the back");
          e.preventDefault();
          history.go(1);
          
          if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
            navigator.app.exitApp();
          }
          
        }else if(ob.options.direction == "back" && ob.toPage[0].id === "page_login") {
          console.log("blocking the back");
          e.preventDefault();
          history.go(1);
          
          if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
            navigator.app.exitApp();
          }
          
        }else if(ob.options.direction == "back" && ob.toPage[0].id === "page_scanner") {
          console.log("blocking the back");
          e.preventDefault();
          history.go(1);
          
          if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
            navigator.app.exitApp();
          }
          
        }
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
      
      $("#location_item_save").button().button('enable');  
      $("#location_item_save").button().button('refresh');
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
        
      }else if(error.code == 2 || error.code == "2") {//POSITION_UNAVAILABLE
        controller.loadingMsg("Please Check GPS is Switched ON.", 3000);
        
      }else if(error.code == 3 || error.code == "3") {//TIMEOUT
        //controller.loadingMsg("The request to get user location timed out.", 1000);
        // 
      }
    },
    
    resetLoginUrls: function(){
      var el = $("#loginselect");
      
      var url = localStorage.appurl;
      
      if(url.indexOf("test") != -1) {
        // Select the relevant option, de-select any others
        el.val('test').selectmenu().selectmenu('refresh');
        
      }else if(url.indexOf("cloud") != -1) {
        // Select the relevant option, de-select any others
        el.val('cloud').selectmenu().selectmenu('refresh');
        
      }else if(url.indexOf("manual") != -1) {
        // Select the relevant option, de-select any others
        el.val('manual').selectmenu().selectmenu('refresh');
        
      }else if(url.indexOf("emo") != -1) {
        // Select the relevant option, de-select any others
        el.val('demo').selectmenu().selectmenu('refresh');
        
      }else if(localStorage.custom == "custom") {
        console.log("inside local settings");
        $(".myurl").show();  
        
        //show custom url in the textfield
        $(".myurl").val(localStorage.appurl);
        
        // Select the relevant option, de-select any others
        el.val('custom').selectmenu().selectmenu('refresh');
        
      }
      
    },
    
    //Check if app is online before potentially downloading nodes
    startDevtracMobile_online: function() {
      auth.loginStatus().then(function () {
        
        $(".menulistview").show();
        
        $("#form_add_location").show();
        $("#form_fieldtrip_details").show();
        $("#form_sitevisists_details").show();
        $("#addquestionnaire").show();
        $(".settingsform").show();
        $(".ui-navbar").show();
        
        $("#syncForm").show();
        
        devtracnodes.countFieldtrips().then(function(){
          
          devtracnodes.countOecds().then(function() {
            
            //load field trip details from the database if its one and the list if there's more.
            controller.loadFieldTripList();                    
          }).fail(function() {
            
            controller.loadingMsg("Subjects were not found", 2000);
            
            
            setTimeout(function() {
              auth.logout().then(function(){

                if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                //Clear user info from file
                  window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                }  
                
              });
              
            }, 2000);
            
          });
          
        }).fail(function(){
          
          //download all devtrac data for user.
          controller.fetchAllData().then(function(){
            
            devtracnodes.countOecds().then(function() {
              
              //load field trip details from the database if its one and the list if there's more.
              controller.loadFieldTripList();                    
            }).fail(function() {
              
              controller.loadingMsg("Subjects were not found", 2000);
              
              
              setTimeout(function() {
                auth.logout().then(function(){
                
                  if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                    //Clear user info from file
                      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                    }  
                });
                
              }, 2000);
              
            });
          }).fail(function(error){
            auth.logout().then(function(){
              if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                //Clear user info from file
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
              }    
            });
            controller.loadingMsg(error,5000);
            
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
        
        $("#syncForm").hide();
        
        controller.resetForm($('#form_fieldtrip_details'));
        
        $.unblockUI({ 
          onUnblock: function() {
            document.removeEventListener("backbutton", controller.onBackKeyDown, false);
          }
        
        });
        
        if(window.localStorage.getItem("usernam") != null && window.localStorage.getItem("passw") != null) {
          $("#page_login_name").val(window.localStorage.getItem("usernam"));
          $("#page_login_pass").val(window.localStorage.getItem("passw"));  
        }
        
        if(controller.checkCordova() != undefined) {
          
          console.log("loading scanner");
          $.mobile.changePage($("#page_scanner"), {changeHash: true});
          
          
        }else{
          console.log("loading login");
          
          $.mobile.changePage($("#page_login"), {changeHash: true});
          
        }
        
      });
    },
    
    //Start the application without an internet connection
    startDevtracMobile_offline: function() {
      
      if(localStorage.username != "0" && localStorage.password != "0" && localStorage.password != undefined) {
        console.log("found passwords");
        //Set username in menu
        $(".username").html("Hi, "+localStorage.username+" !");
        
        //Set user title in menu
        $(".user_title").html(localStorage.usertitle);
        
        //load field trip details from the database if its one and the list if there's more.
        controller.loadFieldTripList();    
        
      }else if(window.localStorage.getItem("username") == null && window.localStorage.getItem("pass") == null) {
        
        controller.loadingMsg("Please connect to the internet to login and download your devtrac data.", 2000);
        
        //hide logout button and show login button when offline
        $('#logoutdiv').hide();
        $('#logindiv').show();
        
        if(controller.checkCordova() != undefined) {
          //move to manual and qr code login page
          $.mobile.changePage($("#page_scanner"), {changeHash: true});  
        }else {
          //move to login page
          $.mobile.changePage($("#page_login"), {changeHash: true});
        }
        
        setTimeout(function(){
          $.unblockUI({ 
            onUnblock: function() {
              document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              
            }
          
          });  
        }, 2000);
        
        
        
      }
      
    },
    
    //camera functions
    onPhotoDataSuccess: function(imageData) {
      console.log("the image data is here");
      
      var currentdate = new Date(); 
      var datetime = currentdate.getDate()
      + (currentdate.getMonth()+1)
      + currentdate.getFullYear() + "_"  
      + currentdate.getHours()
      + currentdate.getMinutes()
      + currentdate.getSeconds();
      
      var editedImages = localStorage.editsitevisitimages;
      var imagename = "img_"+datetime+".jpeg";
      
      // Get image handle
      var ftritem_type = localStorage.ftritem;
      
      if(editedImages == "true") {
        console.log("edit site photo");
        
        var listitem = "";
        
        if(ftritem_type.indexOf("oa") != -1) {
          controller.filenames.push(imagename);
          controller.base64Images.push(imageData);
          controller.imageSource.push("hasnot");
          
          
        }else {
          controller.fnames.push(imagename);
          controller.b64Images.push(imageData);
          controller.imageSrc.push("hasnot");
          
        }
        
        listitem = ' <li><a href="#">'+
        '<img src="'+"data:image/jpeg;base64,"+ imageData +'" style="width: 80px; height: 80px;">'+
        '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+imagename+'</div></h2></a>'+
        '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
        '</li>';
        
        controller.addImageEdits('edit',listitem);
      }
      else
      {
        var listitem = "";
        
        listitem = ' <li><a href="#">'+
        '<img src="data:image/jpeg;base64,'+ imageData +'" style="width: 80px; height: 80px;">'+
        '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+imagename+'</div></h2></a>'+
        '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
        '</li>';
        
        if(ftritem_type.indexOf('oa') != -1) 
        {
          controller.filenames.push(imagename);
          controller.base64Images.push(imageData);
          controller.imageSource.push("hasnot");
          
          controller.addImageEdits('roadside',listitem);
          
          //if we are adding images from other site visit than roadside visit
        }else {
          controller.fnames.push(imagename);
          controller.b64Images.push(imageData);
          controller.imageSrc.push("hasnot");
          
          controller.addImageEdits('other',listitem); 
        }
        
      }
    },
    
    // A button will call this function
    //
    capturePhoto: function() {
      // Take picture using device camera and retrieve image as base64-encoded string
      navigator.camera.getPicture(controller.onPhotoDataSuccess, controller.onFail, { quality: 30,
        destinationType: controller.destinationType.DATA_URL });
    },
    
    // Called if something bad happens after camera photo
    //
    onFail: function(message) {
      
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
      }
    },
    
    doMenu: function(){
      //open panel on the current page
      var page = $(':mobile-pagecontainer').pagecontainer('getActivePage')[0].id;
      var mypanel = $("#"+page).children(":first-child");
      
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
      
      $("#location_item_save").button().button('enable');  
      $("#location_item_save").button().button('refresh');
    },
    
    //web api geolocation error
    errorhandler: function(error) {
      switch(error.code) {
        case error.PERMISSION_DENIED:
          controller.loadingMsg("User denied the request for Geolocation.", 1000);
          
          $("#gpserror").html("User denied the request for Geolocation");
          break;
        case error.POSITION_UNAVAILABLE:
          controller.loadingMsg("Location information is unavailable.", 1000);
          
          $("#gpserror").html("Location information is unavailable");
          break;
        case error.TIMEOUT:
          controller.loadingMsg("The request to get user location timed out.", 1000);
          
          $("#gpserror").html("The request to get user location timed out");
          break;
        case error.UNKNOWN_ERROR:
          controller.loadingMsg("An unknown error occurred.", 1000);
          
          $("#gpserror").html("An unknown error occurred");
          break;
      }
    },
    
    //count nodes to be uploaded in the database and update counters on uploads page
    countAllNodes: function(){
      devtrac.indexedDB.open(function (db) {
        
        devtracnodes.countSitevisits(db).then(function(scount){
          $("#sitevisit_count").html(scount);
          
          devtracnodes.countComments(db).then(function(items) {
            $("#comment_count").html(items);
          }).fail(function(lcount){
            $("#comment_count").html(lcount);
          });
          
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
    readImage: function(file, ftritemtype, status) {
      var di = {};
      var reader = new FileReader();
      var image  = new Image();
      
      reader.readAsDataURL(file);  
      reader.onload = function(_file) {
        image.src = _file.target.result;
        
        var n = file.name,
        s = ~~(file.size/1024) +'KB';
        
        if(status == 'edit') {
          if(ftritemtype == "roadside")
          {
            controller.filenames.push(n);
            controller.base64Images.push(image.src);
            controller.filesizes.push(~~(file.size/1024));
            controller.imageSource.push("has");
            
          }else
          {
            controller.fnames.push(n);
            controller.b64Images.push(image.src);
            controller.fsizes.push(~~(file.size/1024));
            controller.imageSrc.push("has");
            
          }
          
          var listitem = "";
          
          listitem = ' <li><a href="#">'+
          '<img src="'+ image.src +'" style="width: 80px; height: 80px;">'+
          '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+n+'</div></h2></a>'+
          '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
          '</li>';
          
          controller.addImageEdits('edit',listitem);
        }else {
          if(ftritemtype == "roadside")
          {
            controller.filenames.push(n);
            controller.base64Images.push(image.src);
            controller.filesizes.push(~~(file.size/1024));
            controller.imageSource.push("has");
            
            var listitem = "";
            
            listitem = ' <li><a href="#">'+
            '<img src="'+ image.src +'" style="width: 80px; height: 80px;">'+
            '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+n+'</div></h2></a>'+
            '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
            '</li>';
            
            controller.addImageEdits('roadside',listitem);
            
          }else
          {
            controller.fnames.push(n);
            controller.b64Images.push(image.src);
            controller.fsizes.push(~~(file.size/1024));
            controller.imageSrc.push("has");
            
            var listitem = "";
            
            listitem = ' <li><a href="#">'+
            '<img src="'+ image.src +'" style="width: 80px; height: 80px;">'+
            '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+n+'</div></h2></a>'+
            '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
            '</li>';
            
            controller.addImageEdits('other',listitem);
            
          } 
        }
        
      };
      
    },
    
    //Add image item to edit site visits images list
    addImageEdits: function(imagetype, data) {
      if(imagetype == 'edit'){
        $("#editimagefile_list").append(data);
        $("#editimagefile_list").listview().listview('refresh');  
      }else if(imagetype == 'other'){
        $("#imagePreview_list").append(data);
        $("#imagePreview_list").listview().listview('refresh');
      }else if(imagetype == 'roadside'){
        $("#uploadPreview_list").append(data);
        $("#uploadPreview_list").listview().listview('refresh');
      }
      
      
    },
    
    //Delete image item from edit site visits images list
    deleteImageEdits: function(anchor_instance) {
      
      var imageId = localStorage.snid;
      var added_by_user = localStorage.user;
      
      //if added_by_user is true the imageId is an integer
      if(added_by_user){
        imageId = parseInt(imageId);
      }
      
      var li_class = $(anchor_instance).parent('li').attr("class");
      if(li_class.indexOf("original_image") != -1) {
        
        controller.editedImageNames.push($(anchor_instance).prev().children('h2').children('div:first-child').text());
        
      }else{
        if(localStorage.reportType == "roadside") {
          var imageNames = controller.filenames;
          var imageNamesLength = imageNames.length;
          for(var x = 0; x < imageNamesLength; x++) {
            if(imageNames[x] == $(anchor_instance).prev().children('h2').children('div:first-child').text()) {
              controller.filenames.splice(x, 1);
              controller.base64Images.splice(x, 1);
              controller.imageSource.splice(x, 1);
              
            }
          }
        }else {
          var imgNames = controller.fnames;
          var imgNamesLength = imgNames.length;
          for(var y = 0; y < imgNamesLength; y++) {
            if(imgNames[y] == $(anchor_instance).prev().children('h2').children('div:first-child').text()) {
              controller.fnames.splice(y, 1);
              controller.b64Images.splice(y, 1);
              controller.imageSrc.splice(y, 1);
            }
          }
          
        }
        
      }
      
      $(anchor_instance).parent('li').remove();
      
    },
    
    //cordova offline event
    onOffline: function() {
      controller.connectionStatus = false;
      
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
            
          });      
        });
      }else {
        controller.loadingMsg("Please Answer Atleast Once", 2000);
        
      }
    },
    
    //load field trip details from the database if its one and show list if there's more.
    loadFieldTripList: function () {
      console.log('loading field trip list');
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
            
            $.mobile.changePage($("#home_page"), {changeHash: false});
            
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              }
            
            });
            
          } else if (data.length == 1) {
            
            //set home screen to be fieldtrip details
            $(".settings_panel_home").attr("href","#page_fieldtrip_details");
            
            $('.panel_home').hide();
            var count = 0;
            var fObject = data[0];
            
            if(fObject['field_fieldtrip_start_end_date']['und'] != undefined && fObject['field_fieldtrip_start_end_date']['und'] != undefined) {
              
              if(fObject['editflag'] == 1) {
                count = count + 1;
              }
              
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
              
              $( "#sitevisit_date" ).datepicker( "destroy" );
              
              $("#sitevisit_date").datepicker({ 
                dateFormat: "yy/mm/dd", 
                minDate: new Date(startyear, startmonth, startday), 
                maxDate: new Date(endyear, endmonth, endday) 
              }).datepicker( "refresh" );
              
              $("#fieldtrip_details_start").html('').append(formatedstartdate);
              $("#fieldtrip_details_end").html('').append(formatedenddate);
              
              $("#fieldtrip_details_title").html('').append(fObject['title']);
              $("#fieldtrip_details_status").html('').append(fObject['field_fieldtrip_status']['und'][0]['value']);
              
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
                  //if there are no site visitss hide the filter
                  if(sitevisit.length == 0) {
                    
                    sitevisitList.prev("form.ui-filterable").hide();
                    
                  }else {
                    
                    sitevisitList.prev("form.ui-filterable").show();
                    
                  }
                  
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
              
              $.mobile.changePage($("#page_fieldtrip_details"), {changeHash: false});
              
              
            } else {
              controller.loadingMsg("Please add dates to Fieldtrip from Devtrac", 2000);
              
              
              setTimeout(function(){
                auth.logout().then(function(){
                  if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                    //Clear user info from file
                      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                    }    
                });
                
              }, 2000);
              
            }
            
          } else {
            
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                
                //hide and show dialog auth buttons
                $('#logindiv').show();
                $('#logoutdiv').hide();
                
                //move to login page
                $.mobile.changePage($("#page_login"), {changeHash: true});
              }
            
            });
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
          
          var sitevisit_list = sitevisitList.children().length;
          if(sitevisit_list == 0) {
            
            $("#list_sitevisits").prev("form.ui-filterable").hide();
            
          }else {
            
            $("#list_sitevisits").prev("form.ui-filterable").show();
            
          }
        });
      });
    },
    
    //handle submit of site report type
    submitSitereporttype: function() {
      //empty roadside images
      controller.filenames = [];
      controller.base64Images = [];
      controller.filesizes = [];
      controller.imageSource = [];
      
      //empty other site visit images
      controller.fnames = [];
      controller.b64Images = [];
      controller.fsizes = [];
      controller.imageSrc = [];
      
      //clear images list for human interest stories and site visits
      $("#imagePreview_list").empty();
      
      localStorage.ftritem = $("#sitevisit_add_type :selected").text();
      localStorage.ftritemtype = $("#sitevisit_add_type :selected").val();
      
      
      var reportcategory = localStorage.ftritem;
      var reporttype = localStorage.ftritem;
      
      if(reporttype.indexOf("oa") != "-1") {
        
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
        
        if($('#select_oecds').children().length == 0) {
          controller.buildSelect("oecdobj", []);  
        }else{
          $.mobile.changePage("#page_sitevisit_add", "slide", true, false);
        }
        
        $('#sitevisit_add_report').html("Please provide a full report");
        $('#sitevisit_add_public_summary').html("Please Provide a small summary for the public");
        
      }
      else{
        if($('#location_placetypes').children().length == 0) {
          controller.buildSelect("placetype", []);  
        }else{
          $.mobile.changePage("#page_add_location", "slide", true, false);
        }
        
      }
      controller.resetForm($('#form_sitereporttype'));
      
    },
    
    //handle site visit click
    onSitevisitClick: function (anchor) {
      //read report types from a file
     
      if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, readTypes, failreadTypes);
      }  
      
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
          localStorage.currentsnid = fObject['nid'];
          
          if(fObject['field_ftritem_place'] != undefined && fObject['field_ftritem_place']['und'] != undefined) {
            localStorage.pnid = fObject['field_ftritem_place']['und'][0]['target_id'];
            //console.log("this ftritem has a place "+fObject['field_ftritem_place']['und'][0]['target_id']);
            
            if(fObject['user-added'] == true) {
              localStorage.locationtype = "user";
              pnid = parseInt(localStorage.pnid);
              
            }else {
              localStorage.locationtype = "server";
              pnid = localStorage.pnid;
            }
            
            
          }else {
            if(fObject['user-added'] == true) {
              localStorage.locationtype = "user";
              pnid = parseInt(localStorage.pnid);
            }else {//needs work
              pnid = "RV";
            }
          }
          
          //count images available in this site visit
          if(fObject['field_ftritem_images'] != undefined && fObject['field_ftritem_images'].length > 0){
            localStorage.imageIndex = fObject['field_ftritem_images']['und'].length; 
          }else {
            localStorage.imageIndex = 0;
          }
          
          var sitedate = fObject['field_ftritem_date_visited']['und'][0]['value'];
          var formatedsitedate;
          var sitedatearray = "";
          
          if(localStorage.user == "false" && sitedate.indexOf('/') == -1){
            if(sitedate.indexOf('T') != -1) {
              var sitedatestring = JSON.stringify(sitedate);
              var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
              
              sitedatearray = sitedateonly.split("-");
              
              formatedsitedate = sitedatearray[0] + "/" + sitedatearray[1] + "/" + sitedatearray[2];  
            }else{
              sitedatearray = sitedate.split("-");
              
              formatedsitedate = sitedatearray[0] + "/" + sitedatearray[1] + "/" + sitedatearray[2];
            }
            
          }
          else {
            var dirtydate = sitedate;
            var dirtydatearray = dirtydate.split("/");
            var cleanarray = dirtydatearray[2] + "/" + dirtydatearray[1] + "/" + dirtydatearray[0];
            
            formatedsitedate = cleanarray;            
          }
          
          var sitevisittype = null;
          $("#sitevisists_details_date").html(formatedsitedate);
          
          switch (fObject['taxonomy_vocabulary_7']['und'][0]['tid']) {
            
            case localStorage.sitevisit:
              $("#sitevisists_details_type").html("Site Visit");
              localStorage.reportType = "site";
              console.log("its a site visit "+localStorage.sitevisit);
              
              $('#ftritem_location').show();
              break;
            case localStorage.roadside:
              $("#sitevisists_details_type").html("Roadside Observation");
              
              $('#ftritem_location').hide();
              
              localStorage.reportType = "roadside";
              console.log("its a roadside "+localStorage.roadside);
              break;
            case localStorage.humaninterest:
              $("#sitevisists_details_type").html("Human Interest Story");
              
              localStorage.reportType = "human";
              console.log("its a human interest "+localStorage.humaninterest);
              
              $('#ftritem_location').show();
              break;
            default:
              break
          }
          
          $("#sitevisists_details_title").html(fObject['title']);
          $("#sitevisists_details_summary").html(fObject['field_ftritem_public_summary']['und'][0]['value']);
          
          //determine type of site visit before looking up its location
          //(road side visits donot have locations)
          var ftritemType = localStorage.reportType;
          if(ftritemType.indexOf("oa") == -1) {
            
            //get location details
            devtrac.indexedDB.getPlace(db, pnid, function (place) {
              if (place != undefined) {
                localStorage.ptitle = place['title'];
                
                localStorage.placenid = place['nid'];
                
                $("#sitevisists_details_location").html(place['title']);
                localStorage.respplacetitle = place['title'];
                localStorage.point = place['field_place_lat_long']['und'][0]['geom'];
                
                mapctlr.initMap(place['field_place_lat_long']['und'][0]['lat'], place['field_place_lat_long']['und'][0]['lon'], state);
                mapctlr.resizeMapIfVisible(); 
              }else {
                if(fObject['user-added'] == true && fObject['taxonomy_vocabulary_7']['und'][0]['tid'] == localStorage.roadside) {
                  $("#sitevisists_details_location").html(fObject['ftritem_place']);
                  mapctlr.initMap(fObject['field_ftritem_lat_long']['und'][0]['lat'], fObject['field_ftritem_lat_long']['und'][0]['lon'], state);
                  mapctlr.resizeMapIfVisible();
                  
                }else if(fObject['user-added'] != true && fObject['taxonomy_vocabulary_7']['und'][0]['tid'] == localStorage.roadside) {
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
          }
          
        });
        
        devtrac.indexedDB.getAllActionitems(db, function (actionitem) {
          //if there are no actionitems hide the filter
          $("#list_actionitems").prev("form.ui-filterable").hide();
          
          var actionitemcount = 0;
          for (var i in actionitem) {
            if(actionitem[i]['user-added'] == true && actionitem[i]['submit'] == 0) {
              actionitemcount = actionitemcount + 1;
            }
            if(actionitem[i]['field_actionitem_ftreportitem'] != undefined) {
              var siteid = actionitem[i]['field_actionitem_ftreportitem']['und'][0]['target_id'];
              var sitevisitid;
              if(actionitem[i]['loctype'] == "server_added") {
                sitevisitid = siteid;
              }else {
                sitevisitid = siteid.substring(siteid.indexOf('(')+1, siteid.length-1);
              }
              
              
              if (actionitem[i]['field_actionitem_ftreportitem']['und'][0]['target_id'] == snid || sitevisitid == snid) {
                //if there are actionitems show the filter
                $("#list_actionitems").prev("form.ui-filterable").show();
                
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
      
      var editreport = $("#sitevisit_report").val();
      var editreportvalue = editreport.substring(editreport.lastIndexOf("<body>")+6, editreport.lastIndexOf("</body>")).trim();
      
      if($("#form_sitevisit_edits").valid() && editsummaryvalue.length > 0) {
        
        //save site visit edits
        var updates = {};
        $('#form_sitevisit_edits *').filter(':input').not(':button').each(function () {
          var key = $(this).attr('id').substring($(this).attr('id').indexOf('_') + 1);
          if (this.localName == "textarea") {
            if(key == "report") {
              
              var report = $(this)[0].value;
              var clean_report = report.substring(report.lastIndexOf('<body>')+6, report.lastIndexOf('</body>')).trim();
              updates["report"] = clean_report;
              
            }else if(key == "summary"){
              
              var summary = $(this)[0].value;
              var clean_summary = summary.substring(summary.lastIndexOf('<body>')+6, summary.lastIndexOf('</body>')).trim();
              updates["summary"] = clean_summary;
            }
            
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
          
          devtrac.indexedDB.editSitevisit(db, snid, updates).then(function () {
            
            var images = [];
            var rtype = localStorage.reportType;
            
            if(rtype == "roadside") {
              
              images['base64s'] = controller.base64Images;
              images['names'] = controller.filenames;
              images['kitkat'] = controller.imageSource;
              images['nid'] = snid;
              
              controller.base64Images = [];
              controller.filenames = []
              controller.imageSource = []
              
            }else {
              
              images['base64s'] = controller.b64Images;
              images['names'] = controller.fnames;
              images['kitkat'] = controller.imageSrc;
              images['nid'] = snid;
              
              controller.b64Images = [];
              controller.fnames = [];
              controller.imageSrc = [];
              
            }
            
            if(images['names'].length > 0 || controller.editedImageNames.length > 0) {
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.getImage(db, snid).then(function(imagearray) {
                  
                  /*@ imageEdits - Remove deleted images from db 
                   */
                  var imageEdits = [];
                  imageEdits['names'] = controller.editedImageNames;
                  controller.editedImageNames = [];
                  
                  devtrac.indexedDB.editImage(db, snid, images, imageEdits).then(function(imageArr) {
                    
                  });
                  
                }).fail(function() {
                  
                  devtrac.indexedDB.addImages(db, images).then(function() {
                    //console.log('Added images');
                  });
                  
                });
              });    
            }else{
              //controller.loadingMsg("No Images Added", 2000)
            }
            
            $("#sitevisists_details_title").html($("#sitevisit_title").val());
            
            if(localStorage.user == "true"){
              $("#user"+localStorage.snid).children(".heada1").html($("#sitevisit_title").val());
            }else{
              $("#snid"+localStorage.snid).children(".heada1").html($("#sitevisit_title").val());
            }
            
            $("#sitevisists_details_date").html($("#sitevisit_date").val());
            $("#sitevisists_details_summary").html(editsummaryvalue);
            
            controller.refreshSitevisits();
            
            $.mobile.changePage("#page_sitevisits_details", "slide", true, false);
          });
        });
      }else {
        controller.loadingMsg("Please fill in all values", 2000)
        
      }
      
    },
    
    onPlacesave: function (saveButtonReference) {
      //save places edits
      var location_type = localStorage.locationtype;
      var location_id;
      
      if(location_type == "user") {
        location_id = parseInt(localStorage.placenid);
      }else{
        location_id = localStorage.placenid;

      }
      
      var updates = {};
      
      devtrac.indexedDB.open(function (db) {
        $('#editlocationform *').filter(':input').each(function () {
          var key = $(this).attr('id').substring($(this).attr('id').indexOf('_') + 1);
          if (key.indexOf('_') == -1 && $(this).val().length > 0) {
            updates[key] = $(this).val();
          }
          
        });
        
        devtrac.indexedDB.editPlace(db, location_id, updates).then(function () {
          controller.loadingMsg('Saved Place', 1000);
          $("#sitevisists_details_location").html($("#editplace_title").val());
          controller.resetForm($('#editlocationform'));
          
          $.mobile.changePage("#page_sitevisits_details", "slide", true, false);
        });
      });
      
    },
    
    //save action item
    onSaveactionitem: function () {
      tinyMCE.triggerSave();
      
      var summarytextarea = $("#actionitem_followuptask").val();
      var prt = summarytextarea.substring(summarytextarea.lastIndexOf("<body>")+6, summarytextarea.lastIndexOf("</body>")).trim();
      var reportType = localStorage.reportType;
      var part1;
      var summaryvalue;
      
      if(prt.indexOf("<p>&nbsp;</p>") != -1) {
        summaryvalue =  prt.replace(/<p>&nbsp;<\/p>/g,'');
        
        
      }else{
        
        summaryvalue = prt;
      }
      
      if ($("#form_add_actionitems").valid() && summaryvalue.length > 0) {
        //save added action items
        var updates = {};
        
        updates['user-added'] = true;
        updates['nid'] = 1;
        
        if(reportType.indexOf("oa") != -1) {
          updates['has_location'] = false;  
        }else{
          updates['has_location'] = true;
        }
        
        updates['fresh_nid'] = "";
        updates['field_actionitem_ftreportitem'] = {};
        updates['field_actionitem_ftreportitem']['und'] = [];
        updates['field_actionitem_ftreportitem']['und'][0] = {};
        
        updates['field_actionitem_due_date'] = {};
        updates['field_actionitem_due_date']['und'] = [];
        updates['field_actionitem_due_date']['und'][0] = {};
        updates['field_actionitem_due_date']['und'][0]['value'] = {};
        
        //todo: get value from database or server - oecd
        updates['taxonomy_vocabulary_8'] = {};
        updates['taxonomy_vocabulary_8']['und'] = [];
        updates['taxonomy_vocabulary_8']['und'][0] = {};
        
        //todo: get value from database or server - district
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
        updates['taxonomy_vocabulary_8']['und'][0]['tid'] = $("#select_oecdobj :selected").val();
        
        updates['field_actionitem_ftreportitem']['und'][0]['target_id'] = localStorage.currentsnid;
        updates['field_actionitem_resp_place']['und'][0]['target_id'] = localStorage.pnid;
        
        var tags = $("#actionitem_tags").val();
        if(tags.length > 0) {
          updates['field_action_items_tags'] = tags;  
        }else {
          updates['field_action_items_tags'] = "";
        }
        
        var locationtype = localStorage.locationtype;
        if(locationtype.indexOf("user") != -1) {
          updates['loctype'] = "user_added";
        }else {
          updates['loctype'] = "server_added";
        }
        
        var sitetype = localStorage.user;
        if(sitetype.indexOf('true') != -1) {
          updates['sitetype'] = "user_added";
        }else {
          updates['sitetype'] = "server_added";
        }
        
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
            
            //Show the filter
            $("#list_actionitems").prev("form.ui-filterable").show();
            
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
        controller.loadingMsg("Please fill in a followuptask", 2000);
        
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
              
            }else {
              
              updates['editflag'] = 1;
              
              
              devtrac.indexedDB.editFieldtrip(db, localStorage.fnid, updates).then(function() {
                
                $("#fieldtrip_count").html("1");
                $('#fieldtrip_details_title').html(updates['title']);
                
                controller.loadingMsg("Saving your Edits", 1500);
                
              });      
              
              
            }
            $.mobile.changePage("#page_fieldtrip_details", "slide", true, false);
          });
        });
      }else{
        controller.loadingMsg("Please Enter a Fieldtrip Title", 2000);
        
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
          $("#actionitem_resp_location").html($("#sitevisists_details_location").html());          
          
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
              var dirtydate = sitedate.date;
              var dirtydatearray = dirtydate.split("/");
              var cleanarray = dirtydatearray[2] + "/" + dirtydatearray[1] + "/" + dirtydatearray[0];
              
              formatedsitedate = cleanarray;    
            
            }
          }
          else {
            var dirtydate = sitedate.date;
            var dirtydatearray = dirtydate.split("/");
            var cleanarray = dirtydatearray[2] + "/" + dirtydatearray[1] + "/" + dirtydatearray[0];
            
            formatedsitedate = cleanarray;    
            
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
          
          
          devtrac.indexedDB.getActionItemComments(db, anid, function (comments) {
            //By default hide the comments filter
            $("#list_comments").prev("form.ui-filterable").hide();
            
            console.log("found "+comments.length);
            
            for (var i in comments) {
              
              //Show the filter
              $("#list_comments").prev("form.ui-filterable").show();
              
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
            list_comment.listview().listview('refresh');
            
            //Donot load oecds if they have been loaded before
            if($('#comment_oecds').children().length == 0) {
              controller.buildSelect("oecdobj", []);  
            }else {
              $.mobile.changePage("#page_actionitemdetails", {transition: "slide"});
            }
          });
        });
        
      });
      
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
      var placetype = $('#select_placetype').val();
      
      if ($("#form_add_location").valid()) {
        
        //save added location items
        var updates = {};
        
        updates['user-added'] = true;
        updates['nid'] = 1;
        
        updates['fresh_nid'] = "";
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
        
        var gpslonlat = localStorage.latlon;
        var coords = gpslonlat.split(" ");
        
        updates['field_place_lat_long'] = {};
        updates['field_place_lat_long']['und'] = [];
        updates['field_place_lat_long']['und'][0] = {};
        updates['field_place_lat_long']['und'][0]['geom'] = "POINT ("+localStorage.latlon+")";
        updates['field_place_lat_long']['und'][0]['lat'] = coords[1];
        updates['field_place_lat_long']['und'][0]['lon'] = coords[0];
        
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
        updates['taxonomy_vocabulary_1']['und'][0]['tid'] = placetype;
        
        //get district information
        updates['taxonomy_vocabulary_6'] = {};
        updates['taxonomy_vocabulary_6']['und'] = [];
        updates['taxonomy_vocabulary_6']['und'][0] = {};
        updates['taxonomy_vocabulary_6']['und'][0]['tid'] = "93";
        
        if(placetype.length > 0) {
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
        }else {
          controller.loadingMsg("Please select a placetype", 2000)
          
          
        }
        
      }else{
        console.log("location form is invalid");
      }
      
    },
    
    //create sitevisit or human interest story
    createSitevisitfromlocation: function (pnid, title) {
      
      var ftritemtype = "";
      var stringtype = localStorage.ftritem
      if(stringtype.indexOf("oa") != -1){
        ftritemtype = "Roadside Observation";
      }else if(stringtype.indexOf("uman") != -1){
        ftritemtype = "Human Interest Story";
      }else if(stringtype.indexOf("ite") != -1){
        ftritemtype = "Site Visit";
      }
      
      var updates = {};
      var images = {};
      
      images['base64s'] = controller.b64Images;
      images['names'] = controller.fnames;
      images['sizes'] = controller.fsizes;
      images['kitkat'] = controller.imageSrc;
      
      updates['user-added'] = true;
      updates['nid'] = 1;
      updates['fresh_nid'] = "";
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
      
      updates['field_ftritem_lat_long'] = {};
      updates['field_ftritem_lat_long']['und'] = [];
      updates['field_ftritem_lat_long']['und'][0] = {};
      updates['field_ftritem_lat_long']['und'][0]['geom'] = "POINT ("+localStorage.latlon+")";
      
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
            
            if(images['names'].length > 0) {
              
              devtrac.indexedDB.addImages(db, images).then(function() {
                controller.b64Images = [];
                controller.fnames = [];
                controller.fsizes = [];
                controller.imageSrc=[];
                
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
        images['kitkat'] = controller.imageSource;
        
        updates['user-added'] = true;
        updates['nid'] = 1;
        
        updates['fresh_nid'] = "";
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
              
              if(images['names'].length > 0) {
                devtrac.indexedDB.addImages(db, images).then(function() {
                  controller.base64Images = [];
                  controller.filenames = [];
                  controller.filesizes = [];
                  controller.filedimensions = [];
                  controller.imageSource = [];
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
      var commenttextarea = $("#add_actionitem_comment").val();
      var commentvalue = commenttextarea.substring(commenttextarea.lastIndexOf("<body>")+6, commenttextarea.lastIndexOf("</body>")).trim();
      
      var comment = {};
      
      if (commentvalue.length > 0) {
        var anid = "";
        
        if(localStorage.actionuser) {
          anid = parseInt(localStorage.anid);
          comment['actionnid'] = anid;
        }
        else
        {
          anid = localStorage.anid;
          comment['actionnid'] = anid;
        }
        var list_comment = $('#list_comments');
        
        comment['comment_body'] = {};
        comment['comment_body']['und']  = [];
        comment['comment_body']['und'][0] = {};
        comment['comment_body']['und'][0]['value'] = commentvalue;
        comment['comment_body']['und'][0]['format'] = 1;   
        comment['language'] = 'und';
        
        if(!localStorage.actionuser) {
          comment['nid'] = localStorage.anid;  
        }else {
          comment['nid'] = "";
        }
        
        comment['submit'] = 0;
        
        comment['format'] = '1';
        comment['status'] = '1';
        
        console.log("actionitem id "+localStorage.anid);
        console.log("user is "+localStorage.actionuser);
        
        comment['user_added'] = localStorage.actionuser;
        
        comment['field_actionitem_status'] = {};
        comment['field_actionitem_status']['und'] = [];
        comment['field_actionitem_status']['und'][0] = {};
        comment['field_actionitem_status']['und'][0]['value'] = $("#select-status :selected").val();
        
        comment['taxonomy_vocabulary_8'] = {};
        comment['taxonomy_vocabulary_8']['und'] = [];
        comment['taxonomy_vocabulary_8']['und'][0] = {};
        comment['taxonomy_vocabulary_8']['und'][0]['tid'] = $("#select_oecdobj :selected").val();
        
        comment['language'] = 'und';
        
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.addActionItemCommentsData(db, comment).then(function() {
            //Show the comments filter
            $("#list_comments").prev("form.ui-filterable").show();
            
            var li = $("<li></li>");
            var a = $("<a href='#' id='" + anid + "' onclick=''></a>");
            var h1 = $("<h1 class='heada2'>" + commentvalue + "</h1>");
            var p = $("<p class='para2'></p>");
            
            a.append(h1);
            a.append(p);
            li.append(a);
            list_comment.append(li);
            
            list_comment.listview('refresh');
            
            controller.loadingMsg("Saved", 800);
            
            $.mobile.changePage("#page_actionitemdetails", "slide", true, false);
            
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
      //Load user info from file
      window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, readUserInfo, failReadUserInfo);
      
      if(controller.checkCordova() != undefined) {
        
        //start qr scan
        $('#qr_code').bind('click', function(){
          controller.loadingMsg("Please wait...", 1000);
          cordova.plugins.barcodeScanner.scan(
              function (result) {
                
                if(!result.cancelled) {
                  var jsonObject = JSON.parse(result.text);
                  //alert("connect url is "+jsonObject['url']+" name is "+jsonObject['name']+" key is "+jsonObject['key']);
                  localStorage.appurl = jsonObject['url'];
                  
                  controller.loadingMsg("Logging into "+localStorage.appurl, 0);
                  
                  devtrac.indexedDB.open(function (db) {
                    
                    auth.login(jsonObject['name'], jsonObject['key'], db, "qrcodes").then(function() {
                      
                      devtracnodes.countFieldtrips().then(function(){
                        devtracnodes.countOecds().then(function() {
                          
                          //load field trip details from the database if its one and the list if there's more.
                          controller.loadFieldTripList();                    
                        }).fail(function() {
                          //download all devtrac data for user.
                          controller.fetchAllData().then(function(){
                            devtracnodes.countOecds().then(function() {
                              
                              //load field trip details from the database if its one and the list if there's more.
                              controller.loadFieldTripList();                    
                            }).fail(function() {
                              
                              controller.loadingMsg("Subjects were not found", 2000);
                              
                              
                              setTimeout(function() {
                                auth.logout().then(function(){
                                  if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                                  }
                                });
                              }, 2000);
                              
                            });
                          }).fail(function(error) {
                            auth.logout().then(function(){
                              if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                              }
                              
                            });
                            controller.loadingMsg(error,5000);
                            
                          });
                          
                        });
                        
                      }).fail(function() {
                        //download all devtrac data for user.
                        controller.fetchAllData().then(function(){
                          
                          devtracnodes.countOecds().then(function() {
                            
                            //load field trip details from the database if its one and the list if there's more.
                            controller.loadFieldTripList();                    
                          }).fail(function() {
                            
                            controller.loadingMsg("Subjects were not found", 2000);
                            
                            setTimeout(function() {
                              auth.logout().then(function(){
                                if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                                  window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                                }
                              });
                              
                            }, 2000);
                            
                          });
                        }).fail(function(error) {
                          auth.logout().then(function(){
                            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
                              window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, clearUserInfo, failclearUserInfo);
                            }
                          });
                          controller.loadingMsg(error,5000);
                          
                        });
                        
                      });
                    }).fail(function(error) {
                      controller.loadingMsg("Log In Error: "+error, 2000);
                    });
                    
                  });  
                }
                
              }, 
              function (error) {
                alert("Scanning failed: " + error);
              }
          );
        });
        
        //if device runs kitkat android 4.4 use plugin to access image files
        if( device.platform.toLowerCase() === 'android' && device.version.indexOf( '4.4' ) === 0 ) {
          
          $('#roadsidefile').click( function(e) {
            filechooser.open( {}, function(data){
              
              controller.filenames.push(data.name);
              controller.base64Images.push(data.content);
              controller.imageSource.push("hasnot");
              
              var listitem = "";
              
              listitem = ' <li><a href="#">'+
              '<img src="data:image/jpeg;base64,'+ data.content +'" style="width: 80px; height: 80px;">'+
              '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+data.name+'</div></h2></a>'+
              '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
              '</li>';
              
              controller.addImageEdits('roadside',listitem);
              
            }, function(error){
              alert(error);
            });
          });
          
          $('#sitevisitfile').click( function(e) {
            filechooser.open( {}, function(data){
              
              controller.fnames.push(data.name);
              controller.b64Images.push(data.content);
              controller.imageSrc.push("hasnot");
              
              
              var listitem = "";
              
              listitem = ' <li><a href="#">'+
              '<img src="data:image/jpeg;base64,'+ data.content +'" style="width: 80px; height: 80px;">'+
              '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+data.name+'</div></h2></a>'+
              '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
              '</li>';
              
              controller.addImageEdits('other',listitem);
              
            }, function(error) {
              alert(error);
            });
            
          });
          
          //handle file chooser for edited site visits
          $('#editImageFile').bind('click', function(e) {
            var currentdate = new Date(); 
            var datetime = currentdate.getDate()
            + (currentdate.getMonth()+1)
            + currentdate.getFullYear() + "_"  
            + currentdate.getHours()
            + currentdate.getMinutes()
            + currentdate.getSeconds();
            
            var imagename = "img_"+datetime+".jpeg";
            
            filechooser.open( {}, function(data){
              var ftritem_type = localStorage.reportType;
              var listitem = "";
              var imagedata = data.content;
              
              if(ftritem_type.indexOf("oa") != -1) {
                controller.filenames.push(imagename);
                controller.base64Images.push(imagedata);
                controller.imageSource.push("hasnot");
                
              }else {
                controller.fnames.push(imagename);
                controller.b64Images.push(imagedata);
                controller.imageSrc.push("hasnot");
                
              }
              
              listitem = ' <li><a href="#">'+
              '<img src="'+ data.filepath +'" style="width: 80px; height: 80px;">'+
              '<h2><div style="white-space:normal; word-wrap:break-word; overflow-wrap: break-word;">'+imagename+'</div></h2></a>'+
              '<a onclick="controller.deleteImageEdits(this);" data-position-to="window" class="deleteImage"></a>'+
              '</li>';
              
              controller.addImageEdits('edit',listitem);
              
            }, function(error) {
              alert(error);
            });
            
          });
          
        }  
      }
      
      
      //check online status and launch the app
      controller.checkOnline().then(function(networkType) {
        controller.connectionStatus = true;
        console.log("loading app while online");
        controller.startDevtracMobile_online();
        
      }).fail(function(networkType) {
        controller.connectionStatus = false;
        console.log("loading app while offline");
        controller.startDevtracMobile_offline();
        
      });
      
      //listen for menu button click
      document.addEventListener("menubutton", controller.doMenu, false);
      
      //camera settings
      controller.pictureSource= navigator.camera.PictureSourceType;
      controller.destinationType=navigator.camera.DestinationType;
      
      //notify if network connection is down
      if(navigator.network.connection.type == Connection.NONE) {
        //controller.loadingMsg("You are offline", 5000);
        
        controller.connectionStatus = false;
        
      } else {
        controller.connectionStatus = true;
        
      }
    },
    
    // Handle the back button
    //
    onBackKeyDown: function () {
      console.log("clicked back key");
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
      var select = "<select name='select_"+vocabularyname+"' id='select_"+vocabularyname+"' data-theme='b' data-mini='true' required>";
      var optgroup = "";
      
      controller.fetchOptions(vocabularyname).then(function(optionsarray) {
        
        for(var x in optionsarray) {
          optgroup = optgroup + "<optgroup label=" + optionsarray[x]['hname'] + ">";
          if (optionsarray[x]['children'] != undefined) {
            optgroup =  optgroup + controller.addSelectOptions(optionsarray[x]['children'], '', '') + "</optgroup>";
          }
          
        }
        
        select = select + optgroup + "</select>";
        
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
        
        if($.mobile.activePage.attr('id') == "page_site_report_type") {
          //create placetypes codes optgroup
          $('#location_placetypes').empty().append(selectGroup);
          $('#sitevisists_details_subjects').empty().append(selectGroup);
          $.mobile.changePage("#page_add_location", "slide", true, false);          
        } else if($.mobile.activePage.attr('id') == "page_location_edits") {
          //create placetypes codes optgroup
          $('#edit_placetypes').empty().append(selectGroup).trigger('create');
                  
        } else {
          $('#placetypes').empty().append(selectGroup).trigger('create');
        }
        
        
      } 
      else {
        //console.log("this page is "+$.mobile.activePage.attr('id'));
        
        if($.mobile.activePage.attr('id') == "page_add_actionitems") {
          //create oecd codes optgroup
          $('#actionitems_oecds').empty().append(selectGroup).trigger('create');
          $.mobile.changePage("#page_add_actionitems", "slide", true, false);
        }else if($.mobile.activePage.attr('id') == "page_sitevisits_details") {
          //create oecd codes optgroup
          $('#comment_oecds').empty().append(selectGroup).trigger('create');
          $.mobile.changePage("#page_actionitemdetails", "slide", true, false);
        }
        else
        {
          //create oecd codes optgroup
          $('#select_oecds').empty().append(selectGroup).trigger('create');
          $.mobile.changePage("#page_sitevisit_add", "slide", true, false);
          
        }
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
          width: '350px', 
          border: 'none',
          padding: '5px', 
          backgroundColor: '#000', 
          '-webkit-border-radius': '10px', 
          '-moz-border-radius': '10px', 
          opacity: .8, 
          color: '#fff' 
        } 
      }); 
      
      $('.blockUI.blockMsg').center();
      
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
