$(document).ready(function() {
  owlhandler.initialise();
  
});

var owlhandler = {
    
    owlObject : null,
    
    initialise: function() {
      var owl = $(".owl-carousel");
      
      owl.owlCarousel({
        items: 1,
        slideSpeed : 300,
        paginationSpeed : 400,
        singleItem:true,
        pagination : false,
        paginationNumbers: true,
        navigation : false,
        responsive: true
        
      });
      
      owlhandler.owlObject = owl;
      
    },
    
    notes: function(notesy) {
      console.log("inside notes");
      
      $("body").obNotificationCenter({
        trigger: "click",
        selectors: "#notify_fieldtrip",
        content: function(){
          var data = "";
          for(var note in notesy) {
            data = data + '<div class="obNotifItem">'+
            '<div class="obNotifImgWrapper"></div><div class="obNotifContent">'+
            
            '<div class="obNotifTitleWrapper"><div class="obNotifTitle">'+notesy[note]+'</div><div class="obNotifCloseItem"></div>'+
            '</div><p class="obNotifDescription"><a class="notifLink" href="">Saved</a></p></div></div>';

          }
          
          return data;
        },
        beforeCloseItem: function (item) {
          item.addClass("closed");

          if($(".obNotifScrollable").children(':not(.closed)').length < 1) {
            $("#notify_fieldtrip").hide();

          }
            
        }
        
      });
      $("#notify_fieldtrip").show();
      $(".obNotifScrollable").children().removeClass('closed').show();
    },
    
    populateOwl: function(snid) {
      var owl = owlhandler.owlObject;
      localStorage.numbercount = 0;
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getSitevisit(db, snid).then(function (ftritem) {
          
          devtrac.indexedDB.getAllQuestionItems(db, ftritem, function (qtns) {
            if(qtns.length > 0) {
              var firstslide = '<div class="item"><h1>Swipe to Start</h1></div>';   
              owl.data('owlCarousel').addItem(firstslide);
              
              for (var qtn in qtns) {
                
                switch (qtns[qtn].questionnaire_question_type.und[0].value) {
                  case "radios":
                    var radios = "";
                    
                    localStorage.numbercount = parseInt(localStorage.numbercount) + 1;
                    
                    for (var option in qtns[qtn].questionnaire_question_options.und) {
                      var html = '<label for="'+qtns[qtn].nid+'_'+qtns[qtn].questionnaire_question_options.und[option].value+'">'+qtns[qtn].questionnaire_question_options.und[option].value+'</label><input type="radio" name="radio'+qtns[qtn].nid+'" id="'+qtns[qtn].nid+'_'+qtns[qtn].questionnaire_question_options.und[option].value+'" value="'+qtns[qtn].questionnaire_question_options.und[option].value+'">';            
                      radios = radios + html;
                      
                    }
                    
                    var qtncontent = '<div class="item"><h3>'+qtns[qtn].title+'</h3><div data-role="controlgroup" class="qtions">' + radios + '</div></div>';
                    
                    owl.data('owlCarousel').addItem(qtncontent);
                    
                    break;
                    
                  case "number":
                    
                    localStorage.numbercount = parseInt(localStorage.numbercount) + 1;
                    
                    var qtncontent = '<div class="item"><h3>'+qtns[qtn].title+'</h3><div class="qtions"><input type="text" name="text_"'+qtns[qtn].nid+'" id=' + qtns[qtn].nid + ' value=""></div></div>';
                    owl.data('owlCarousel').addItem(qtncontent);
                    
                    break;
                    
                  case "select":
                    
                    localStorage.numbercount = parseInt(localStorage.numbercount) + 1;
                    var arr =  [];
                    var obj = {};
                    
                    for (var option in qtns[qtn].questionnaire_question_options.und) {                        
                      arr.push(qtns[qtn].questionnaire_question_options.und[option].value);
                    }        
                    
                    var options = '<option value="Select One">Select One</option>';
                    for(var item in arr) {
                      options = options + '<option value="'+arr[item]+'">'+arr[item]+'</option>';
                    }
                    
                    var innerdiv = '<div class="item"><h3>'+qtns[qtn].title+'</h3><div class="qtions" data-role="controlgroup"><select id=select_'+qtns[qtn].nid+' name=select'+qtns[qtn].nid+'>'+options+'</select></div></div>';                                
                    
                    owl.data('owlCarousel').addItem(innerdiv);
                    
                    break;
                    
                  case "checkboxes":
                    
                    var checkbox = "";
                    localStorage.numbercount = parseInt(localStorage.numbercount) + 1;
                    
                    for (var option in qtns[qtn].questionnaire_question_options.und) {
                      var html = '<label for="'+qtns[qtn].nid+'_'+qtns[qtn].questionnaire_question_options.und[option].value+'">'+qtns[qtn].questionnaire_question_options.und[option].value+'</label><input type="checkbox" name="checkbox'+qtns[qtn].nid+'" id="'+qtns[qtn].nid+'_'+qtns[qtn].questionnaire_question_options.und[option].value+'" value="'+qtns[qtn].questionnaire_question_options.und[option].value+'">';            
                      checkbox = checkbox + html;
                      
                    }
                    
                    var qtncontent = '<div class="item"><h3>'+qtns[qtn].title+'</h3><div data-role="controlgroup" class="qtions">' + checkbox+'</div></div>';
                    
                    owl.data('owlCarousel').addItem(qtncontent);
                    
                    break;
                  default:
                    break;
                }
              }   
              
              var lastslide = '<div class="item"><h1 id="endqtntitle">Questionnaire Complete</h1><div class="movie-text"><div id="endbuttons">'
                +'<a class="ui-input-btn ui-btn" href="#" id="save_questionnaire" onclick="controller.saveQuestionnaireAnswers()">Save</a><a class="ui-input-btn ui-btn" href="#" id="cancel_questionnaire" data-rel="back">Cancel</a></li>'
                +'<a class="ui-input-btn ui-btn" href="#" onclick="devtracnodes.postQuestionnaire()">Upload</a></div></div></div>';   
              
              owl.data('owlCarousel').addItem(lastslide);
              
            }else {
              var noqtnscontent = '<div class="item"><div><h1 id="endqtntitle">No Questions Available</h1></div></div>';   
              
              owl.data('owlCarousel').addItem(noqtnscontent);
            }
            
            $("#page_add_questionnaire").trigger("create");
            
          });  
          
        });
        
      }); 
      
    }
}
