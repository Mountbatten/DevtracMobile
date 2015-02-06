var devtracnodes = {
    
    updateNode: function(nid, node, siteid) {
      var d = $.Deferred();
      var updates = {};
      console.log("updates for node "+node);
      
      if(siteid['type']){
        node = siteid;
      }
      
      $.ajax({
        url: localStorage.appurl+"/api/node/" + encodeURIComponent(nid) + ".json",
        type: 'put',
        data: node,
        dataType: 'json',
        headers: {
          'X-CSRF-Token': localStorage.usertoken
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log(JSON.stringify(XMLHttpRequest));
          console.log(JSON.stringify(textStatus));
          console.log(JSON.stringify(errorThrown));
          d.reject(errorThrown);
        },
        success: function (data) {
          updates['submit'] = 1;
          
          console.log("We have updated the node "+nid);
          d.resolve(updates, siteid, nid);
        }
      });
      return d;
    },
    
    //create node
    postNode: function(node, index, location_len, pnid, loc_title) {
      var d = $.Deferred();
      var updates = [];
      
      if(pnid['type']){
        //pnid = JSON.stringify(pnid);
        node = pnid;
      }else if(loc_title['type']) {
        //loc_title = JSON.stringify(loc_title);
        node = loc_title;
      }
      
      $.ajax({
        url: localStorage.appurl+"/api/node.json",
        type: 'post',
        data: node,
        dataType: 'json',
        headers: {
          'X-CSRF-Token': localStorage.usertoken
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
          console.log('error '+errorThrown);
          console.log('response error '+XMLHttpRequest.responseText);
          d.reject(errorThrown+" "+XMLHttpRequest.responseText);
        },
        success: function (data) {         
          updates['submit'] = 1;
          updates['nid'] = data['nid'];
          
          var status = false;
          
          if(index == location_len-1) {
            status = true;  
          }
          
          d.resolve(updates, status, pnid, loc_title, index, location_len);
          
        }
      }); 
      return d;
    },
    
    //Post Questionnaire in devtrac
    postQuestionnaire: function() {
      var d = $.Deferred();
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllSavedAnswers(db, function (answers) {
          
          for (var ans in answers) {
            $.ajax({
              url: localStorage.appurl+"/api/questionnaire/submit",
              //url: "http://jenkinsge.mountbatten.net/devtracmanual/api/questionnaire/submit",
              type: 'post',
              data: JSON.stringify(answers[ans]),
              headers: {'X-CSRF-Token': localStorage.usertoken},
              dataType: 'json',
              contentType: 'application/json',
              error: function(XMLHttpRequest, textStatus, errorThrown) {
                console.log('error '+errorThrown);
                d.reject(errorThrown);
              },
              success: function (data) {
                console.log('Answers upload success');
                d.resolve();
              }
            });
          } 
        });
      });
      return d;
    },
    
    //Post action item comments to devtrac
    postComments: function(db, commentArray, comments, callback) {
      
      var commentId = "";
      var edit_comment = "";
      
      if(comments.length > 0) {
        if(commentArray['fresh_nid']) {
          commentId = commentArray['fresh_nid'];
          edit_comment = commentArray['anid'];
          
          commentArray[0] = [];
          commentArray[0]['editcomment'] = edit_comment;
          
        }else {
          commentId = commentArray[0]['actionnid'];
          edit_comment = commentArray[0]['anid'];
          
          commentArray[0]['editcomment'] = edit_comment;
          
        }
        
        commentId = commentId.toString();
        
        var info = {
            
            'node_type': 'comment_node_actionitem',
            "language": "und",
            "taxonomy_vocabulary_8": { "und": { "tid": comments[0]['taxonomy_vocabulary_8']['und'][0]['tid'] } },
            "nid": commentId,
            "uid": localStorage.uid,
            "format": 1,
            "status": '1',
            "comment_body": { "und": {0 : { "value": comments[0]['comment_body']['und'][0]['value'], "format": '1' }}},
            "field_actionitem_status": { "und": { "value": comments[0]['field_actionitem_status']['und'][0]['value'] }}
            
        }
        
        //updates for comments uploaded
        commentArray['title'] = comments[0]['comment_body']['und'][0]['value'];
        
        $.ajax({
          url: localStorage.appurl+"/api/comment",
          type: 'post',
          data: info,
          headers: {'X-CSRF-Token': localStorage.usertoken},
          error: function(XMLHttpRequest, textStatus, errorThrown) {
            console.log('error '+errorThrown);
            
            callback(errorThrown);
          },
          success: function (data) {
            commentArray['submit'] = 1;
            
            devtrac.indexedDB.editItemComments(db, commentArray).then(function() {
              
              var counter = parseInt($("#comment_count").html());
              var counter_update = counter - 1;
              $("#comment_count").html(counter_update);
              
              comments.splice(0, 1);
              devtracnodes.postComments(db, commentArray, comments, callback);  
            });
            
          }
        });
        
      }else{
        controller.countAllNodes();
        callback("");
        
      }
      
    },
    
    //upload action items
    uploadActionItems: function(actionitems, nodeStatus, callback){
      
      var nodestring = {};
      var jsonstring;
      
      if(actionitems.length > 0) {
        
        if(actionitems[0]['submit'] == 0 && actionitems[0]['user-added'] == true) {
          delete actionitems[0]['submit'];
          localStorage.currentanid = actionitems[0]['nid'];
          var actionitemNode = {};
          devtracnodes.getActionItemString(actionitems[0], "", actionitemNode, function(jsonstring, anid, actionitemNode) {
            console.log("Action item string is "+jsonstring);
            devtracnodes.postNode(jsonstring, 0, actionitems.length, anid, actionitemNode).then(function(updates, status, anid) {
              updates['fresh_nid'] = updates['nid'];
              nodeStatus['actionitems'][actionitems[0]['nid']]['nid'] = updates['fresh_nid'];
              
              updates['anid'] = actionitems[0]['nid'];
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.getActionItemComments(db, actionitems[0]['nid'], "actionnid", function (comments) {
                  
                  //loop thru comments and remove those that wea upload
                  for(var comment in comments) {
                    if(comments[comment]['submit'] == 1) {
                      comments.splice(comment, 1);
                    }
                  }
                  
                  devtracnodes.postComments(db, updates, comments, function() {
                    actionitems.splice(0,1);
                    devtracnodes.uploadActionItems(actionitems, nodeStatus, callback);   
                    
                  });                
                  
                });                
                
              });
              
            }).fail(function(e) {
              console.log("actionitem post error "+e);
              if(e == "Unauthorized: CSRF validation failed" || e == "Unauthorized") {
                auth.getToken().then(function(token) {
                  localStorage.usertoken = token;
                  devtracnodes.uploadActionItems(actionitems, nodeStatus, callback);
                });  
              }else
              {
                
                controller.loadingMsg(e, 2000);
                
                callback(nodeStatus);
                
              }
            });   
          });
        }
      }else{
        callback(nodeStatus);
        
      }
      
    },
    
    getLocations: function() {
      var d = $.Deferred();
      var user_locations = [];
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllplaces(db, function(locations) {
          
          for(var location in locations) {
            if((locations[location]['submit'] == 0 && locations[location]['user-added'] == true) || locations[location]['editflag'] == 1) {              
              user_locations.push(locations[location]);
            }
            
          }
          
          if(user_locations.length > 0) {
            d.resolve(user_locations, db);  
          }else 
          {
            d.reject();
          }
          
          
        });  
        
      });
      
      return d;
    },
    
    checkSitevisits: function() {
      var d = $.Deferred();
      var sitevisits = [];
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllSitevisits(db, function(ftritems) {
          var fresh_nid = "";
          for(var ftritem in ftritems) {
            if(ftritems[ftritem]['fresh_nid'] != undefined) {
              fresh_nid = ftritems[ftritem]['fresh_nid'];
            }
            if((ftritems[ftritem]['submit'] == 0 && ftritems[ftritem]['user-added'] == true && ftritems[ftritem]['taxonomy_vocabulary_7']['und'][0]['tid'] == localStorage.roadside) || ftritems[ftritem]['editflag'] == 1) {              
              sitevisits.push(ftritems[ftritem]);
            }
            
          }
          
          if(sitevisits.length > 0) {
            d.resolve(sitevisits, db);  
          }else{
            d.reject();
          }
          
        });  
        
      });
      
      return d;
    },
    
    countLocations: function(db) {
      var d = $.Deferred();
      var locations = [];
      
      var count = 0;
      
      devtrac.indexedDB.getAllplaces(db, function(locs) {
        var fresh_nid = "";
        for(var loc in locs) {
          if(locs[loc]['fresh_nid'] != undefined) {
            fresh_nid = locs[loc]['fresh_nid'];
          }
          
          if((locs[loc]['submit'] == 0 && fresh_nid.length == 0 && locs[loc]['user-added'] == true) || locs[loc]['editflag'] == 1) {              
            count = count + 1;
          }
          
        }        
        if(count > 0) {
          d.resolve(count);  
        }else
        {
          d.reject(count);
        }
      });  
      
      
      return d;
    },
    
    countSitevisits: function(db) {
      var d = $.Deferred();
      var sitevisits = [];
      
      var count = 0;
      devtrac.indexedDB.getAllSitevisits(db, function(ftritems) {
        var fresh_nid = "";
        for(var ftritem in ftritems) {
          if(ftritems[ftritem]['fresh_nid'] != undefined) {
            fresh_nid = ftritems[ftritem]['fresh_nid'];
          }
          
          if((ftritems[ftritem]['submit'] == 0 && ftritems[ftritem]['user-added'] == true ) || ftritems[ftritem]['editflag'] == 1 || (fresh_nid.length == 0 && ftritems[ftritem]['user-added'] == true)) {              
            count = count + 1
          }
          
        }        
        
        d.resolve(count);  
        
      });  
      
      return d;
    },
    
    
    countFieldtrips: function() {
      var d = $.Deferred();
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllFieldtripItems(db, function(tripsy) {
          
          if(tripsy.length > 0) {
            d.resolve();  
          }else
          {
            d.reject();
          }
          
        });  
        
        
        
      });
      
      return d;
    },
    
    countOecds: function() {
      var d = $.Deferred();
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.countTaxonomyItems(db, "oecdobj",function(tripsy) {
          
          if(tripsy.length > 0) {
            d.resolve();  
          }else
          {
            d.reject();
          }
          
        });  
        
      });
      
      return d;
    },
    
    countComments: function(db) {
      var d = $.Deferred();
      var comments = [];
      
      var count = 0;
      
      devtrac.indexedDB.getAllActionComments(db).then(function(comments) {
        
        for(var key in comments) {
          count = count + 1;
        }        
        
        if(count > 0) {
          d.resolve(count);  
        }else
        {
          d.reject(count);
        }
      });  
      
      
      return d;
    },
    
    checkActionitems: function() {
      var d = $.Deferred();
      var aitems = [];
      var items = 0;
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllActionitems(db, function(actionitems) {
          
          for(var actionitem in actionitems) {
            
            if(actionitems[actionitem]['submit'] == 0 && actionitems[actionitem]['user-added'] == true) {              
              aitems.push(actionitems[actionitem]);
              items = items + 1;
            }
            
          }
          
          if(aitems.length > 0) {
            d.resolve(aitems, items);  
          }else{
            d.reject(items);
          }
          
          
        });
      });
      
      return d;
    },
    
    
    //upload locations
    uploadLocations: function() {
      
      var d = $.Deferred();
      
      var poststrings = [];
      var posttitle = [];
      var postids = [];
      var end_location_loop = "";
      var jsonLocation = null;
      var pnid = 0;
      
      devtracnodes.getLocations().then(function(locs, db) {
        end_location_loop = locs.length;
        for(var mark = 0; mark < end_location_loop; mark++) {
          
          localStorage.currentpnid = locs[mark]['nid'];
          if(locs[mark]['user-added']){
            pnid = parseInt(localStorage.currentpnid);
          }else{
            pnid = localStorage.currentpnid;
          }
          
          delete locs[mark]['submit'];
          
          delete locs[mark]['field_actionitem_ftreportitem'];
          
          devtracnodes.getLocationString(locs[mark]).then(function(jsonstring, pnid, loc_title, jsonNode) {
            
            jsonLocation = jsonNode;
            poststrings.push(jsonstring);
            posttitle.push(loc_title);
            postids.push(pnid);
            
          }); 
        }
        
        if(end_location_loop == poststrings.length) {
          d.resolve(poststrings, posttitle, postids, locs, jsonLocation);
        }
        
        
      }).fail(function(){
        d.reject();
      });
      
      return d;
    },
    
    postLocationHelper: function(newlocationids, newlocationnames, oldlocationids, postStrings, titlearray, oldpnids, upNodes, loc_nodes, callback, jsonLocation){
      
      var oldids = oldlocationids;
      if(postStrings.length > 0) {
        
        if((loc_nodes[0]['user-added'] && loc_nodes[0]['fresh_nid'].length <= 0)) {
          devtracnodes.postNode(postStrings[0], oldlocationids, titlearray, jsonLocation).then(function(updates, id, location_title) {
            if(updates['nid'] != undefined || updates['nid'] != null) {
              var counter = parseInt($("#location_count").html());
              var counter_update = counter - 1;
              $("#location_count").html(counter_update);
              
              newlocationnames.push(titlearray[0]);
              newlocationids.push(updates['nid']);
              oldids.push(oldpnids[0]);
              
              upNodes['locations'][oldpnids[0]] = updates['nid'];
              upNodes['locations']["status"] = loc_nodes[0]['user-added'];
            }
            
            titlearray.splice(0, 1);
            postStrings.splice(0, 1);
            
            updates['fresh_nid'] = updates['nid'];
            var newlocationid = {};
            newlocationid['fresh_nid'] = updates['fresh_nid'];
            
            devtrac.indexedDB.open(function (db) {
              /*todo*/
              devtrac.indexedDB.editPlace(db, oldpnids[0], newlocationid).then(function(pid) {
                loc_nodes.splice(0, 1);
                oldpnids.splice(0, 1);
                devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, loc_nodes, callback);
                
              });
            });
            
          }).fail(function(e) {
            if(e.indexOf("CSRF validation") != -1 || e == "Unauthorized") {
              auth.getToken().then(function(token) {
                localStorage.usertoken = token;
                devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, loc_nodes, callback);
              });  
            }else
            {
              callback(e, "", "");
            }
            
          });
          
        }else if(loc_nodes[0]['editflag'] == 1) {
          var nid;
          if((!loc_nodes[0]['user-added'] && typeof loc_nodes[0]['user-added'] == 'undefined')) {
            nid = loc_nodes[0]['nid'];
          }else {
            nid = loc_nodes[0]['fresh_nid'];
          }
          
          devtracnodes.updateNode(nid, postStrings[0]).then(function(updates) {
            updates['editflag'] = 0;
            
            upNodes['locations'][oldpnids[0]] = nid+"_e";
            upNodes['locations']["status"] = loc_nodes[0]['user-added'];
            
            titlearray.splice(0, 1);
            postStrings.splice(0, 1);
            
            devtrac.indexedDB.open(function (db) {
              /*todo*/
              devtrac.indexedDB.editPlace(db, oldpnids[0], updates).then(function(pid) {
                loc_nodes.splice(0, 1);
                oldpnids.splice(0, 1);
                devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, loc_nodes, callback);
                
                
              });
              
            });
            
          }).fail(function(e) {
            //Unauthorized : CSRF validation failed
            if(e == "Unauthorized : CSRF validation failed" || e == "Unauthorized") {
              auth.getToken().then(function(token) {
                localStorage.usertoken = token;
                
                devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, loc_nodes, callback);
                
              });  
            }else
            {
              titlearray.splice(0, 1);
              postStrings.splice(0, 1);
              
              loc_nodes.splice(0, 1);
              oldpnids.splice(0, 1);
              devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, loc_nodes, callback);
              
            }
          }); 
        }
        
      }else
      {
        callback(newlocationnames, newlocationids, oldids, upNodes);
      }
      
    },
    
    //recursive node update for all images
    updateNodeHelper: function (ftrid, y, fd, names, sdate, upId, callback) {
      //var pack = "node[field_ftritem_images][und]["+y+"][fid]="+fd[y]+"&node[field_ftritem_images][und]["+y+"][filename]="+names[y]+"&node[field_ftritem_date_visited][und][0][value][date]="+sdate;
      var pack = "node[field_ftritem_images][und]["+y+"][fid]="+fd[y]+"&node[field_ftritem_images][und]["+y+"][filename]="+names[y]+"&node[field_ftritem_date_visited][und][0][value][date]="+sdate;
      devtracnodes.updateNode(ftrid, pack).then(function(updates, sid, uid) {
        console.log("node updated");
        y = y+1;
        if(y == names.length )  {
          callback(updates, uid, upId);
        }else{
          devtracnodes.updateNodeHelper(ftrid, y, fd, names, sdate, upId, callback);
        }
      }).fail(function(e) {
        callback(e, "error");
      });
    },
    
    //loop through and upload all images
    imagehelper: function (nid, index, fds, fdn, imagearr, sid_date, sid, ftritemType, upNodes, callback) {
      var imagestring = "";
      
      if(imagearr['base64s'][index] != undefined) {
        devtracnodes.postImageFile(imagearr, index, nid).then(function (fd, imagename, ftrid) {
          if(ftritemType.indexOf('road') != -1) {
            upNodes['roadside'][imagearr['nid']][imagearr['names'][index]] = fd;
          }else {
            upNodes['sitevisits'][imagearr['nid']][imagearr['names'][index]] = fd;  
          }
          
          index = parseInt(index, 10) + 1;
          fds.push(fd);
          fdn.push(imagename);
          
          if(parseInt(index, 10) === parseInt(imagearr['base64s'].length, 10)) {
            callback(fds, fdn, ftrid, sid_date, sid, upNodes);  
          }else {
            devtracnodes.imagehelper(nid, index, fds, fdn, imagearr, sid_date, sid, ftritemType, upNodes, callback);
          }
          
        }).fail(function(e) {
          if(e == "Could not create destination directory") {
            var newsitevisits = [];
            devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, function(newsitevisits) {
              $.unblockUI({ 
                onUnblock: function() {
                  document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                }
              
              });
            });
            
          }else{
            
            callback(e, "error", upNodes);
            
          }
        });
      }else {
        
        console.log("index is "+index+" base64s is "+imagearr['base64s'].length);
        
        if(parseInt(index, 10) == parseInt(imagearr['base64s'].length, 10)) {
          callback(fds, fdn, ftrid, sid_date, sid, upNodes);  
        }else {
          index = parseInt(index, 10) + 1;
          devtracnodes.imagehelper(nid, index, fds, fdn, imagearr, sid_date, sid, ftritemType, upNodes, callback);
        }
      }
      
      
    },
    
    //create node
    postImageFile: function(images, index, nid) {
      var d = $.Deferred();
      console.log("kitkat is "+images['kitkat'][index]);
      console.log("image base64 is "+images['base64s'][index]);
      console.log("image name is "+images['names'][index]);
      
      //if device runs kitkat android 4.4 use plugin to access image files
      if(images['kitkat'][index] == "has") {
        
        var parsedImage = images['base64s'][index].substring(images['base64s'][index].indexOf(",")+1);
      }else{
        var parsedImage = images['base64s'][index];  
      }
      console.log("using image "+localStorage.uid);
      var filedata = {
          "file": {
            "file": parsedImage,
            "filename": images['names'][index],
            "uid" : localStorage.uid,
            "target_uri":"public://media/images/"+localStorage.uid+"/browser/"+images['names'][index],
          }
      };
      
      $.ajax({
        url: localStorage.appurl+"/api/file.json",
        type: 'post',
        data: filedata,
        dataType: 'json',
        headers: {
          'X-CSRF-Token': localStorage.usertoken
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
          //console.log('image error '+errorThrown);
          d.reject(errorThrown);
          
        },
        success: function (data) {         
          //console.log("Image posted "+"public://media/images/"+localStorage.uid +"/"+nid+"/"+images['names'][index]);
          
          d.resolve(data['fid'], images['names'][index], nid, index);
          
        }
      }); 
      return d;
    },
    
    
    //upload sitevisits
    uploadsitevisits: function(db, sitevisits, newsitevisits, nodeStatus, callback) {
      
      var date_visited = "";
      if(sitevisits.length > 0) {
        
        if(sitevisits[0]['user-added'] == true && sitevisits[0]['taxonomy_vocabulary_7']['und'][0]['tid'] == localStorage.roadside) {
          nodeStatus['roadside'][sitevisits[0]['nid']] = {};
          
          devtracnodes.getSitevisitString(sitevisits[0]).then(function(jsonstring, active_sitereport, date, siteid, xy, ftritemJson) {
            devtracnodes.postNode(jsonstring, active_sitereport, date, siteid, ftritemJson).then(function(updates, x, y, z, active_ftritem, datevisited) {
              
              console.log("Checking for images using id "+parseInt(active_ftritem['nid']));
              
              devtrac.indexedDB.getImage(db, parseInt(active_ftritem['nid']), updates['nid'], datevisited, y).then(function(image, nid, vdate, sid) {
                console.log("Images found to upload");
                var indx = 0;
                var imageid = [];
                var imagename = [];
                
                for(var y = 0; y < image['names'].length; y++) {
                  nodeStatus['roadside'][sitevisits[0]['nid']][image['names'][y]] = "";  
                }
                
                devtracnodes.imagehelper(nid, indx, imageid, imagename, image, vdate, sid, "roadside", nodeStatus, function(fds, fdn, ftrid, ftrdate, updateId, uploadStatus) {
                  
                  if(fdn == "error") {
                    callback(fds, "error")
                  }else{
                    
                    var y = 0;
                    devtracnodes.updateNodeHelper(ftrid, y, fds, fdn, ftrdate, updateId, function(updates, ftritemid, activeid) {
                      newsitevisits[ftritemid] = sitevisits[0]['title'];
                      updates['fresh_nid'] = ftritemid;
                      updates['editflag'] = 0; 
                      
                      if(ftritemid != "error") {
                        
                        var newsiteid = {};
                        newsiteid['fresh_nid'] = updates['fresh_nid'];
                        
                        /*todo*/ 
                        devtrac.indexedDB.editSitevisit(db, parseInt(sitevisits[0]['nid']), newsiteid).then(function() {
                          
                          uploadStatus['roadside'][sitevisits[0]['nid']]['nid'] = ftritemid;
                          
                          sitevisits.splice(0, 1);
                          
                          devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, uploadStatus, callback);  
                        });
                        
                        
                      }else if(updates.indexOf('Unauthorized') != -1){
                        auth.getToken().then(function(token) {
                          localStorage.usertoken = token;
                          devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, uploadStatus, callback);
                        });
                      }
                      else{
                        
                        callback(updates, "error", uploadStatus);
                      }
                      
                    });                   
                  }
                  
                });
                //no images to upload for this site visit
              }).fail(function(){
                console.log("No images found to upload");
                newsitevisits[updates['nid']] = sitevisits[0]['title'];
                
                nodeStatus['roadside'][sitevisits[0]['nid']]['nid'] = updates['nid'];
                sitevisits.splice(0, 1);
                
                devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, callback);
              });
              
              //if post node fails because of expired token, restart
            }).fail(function(e){
              if(e == "Unauthorized: CSRF validation failed" || e == "Unauthorized") {
                auth.getToken().then(function(token) {
                  localStorage.usertoken = token;
                  devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, callback);
                });  
              }else
              {
                callback(e, "error", nodeStatus);
              }
            });
            
          });
          
          //edited site visit
        }else if(sitevisits[0]['user-added'] == undefined && sitevisits[0]['editflag'] == 1) {
          devtracnodes.getSitevisitString(sitevisits[0]).then(function(jsonstring, active_sitereport, date, siteid, xy, ftritemJson) {
            nodeStatus['sitevisits'][sitevisits[0]['nid']] = {};
            
            devtracnodes.updateNode(siteid, jsonstring, ftritemJson).then(function(updates, ftritemid, sid) {
              nodeStatus['sitevisits'][sitevisits[0]['nid']]['nid'] = sid;
              nodeStatus['sitevisits'][sitevisits[0]['nid']]['edit'] = true;
              
              newsitevisits[ftritemid] = sitevisits[0]['title'];
              
              var datevisited = sitevisits[0]['field_ftritem_date_visited']['und'][0]['value'];
              if(datevisited.indexOf('-') != -1) {
                var datepieces = datevisited.split('-');
                datevisited = datepieces[2]+"/"+datepieces[1]+"/"+datepieces[0];
              }
              
              devtrac.indexedDB.getImage(db, sitevisits[0]['nid'], sitevisits[0]['nid'], datevisited, sitevisits[0]['nid']).then(function(image, nid, vdate, sid) {
                console.log("Images found to upload");
                var indx = localStorage.imageIndex;
                var imageid = [];
                var imagename = [];
                
                for(var y = 0; y < image['names'].length; y++) {
                  nodeStatus['sitevisits'][sitevisits[0]['nid']][image['names'][y]] = "";  
                }
                
                devtracnodes.imagehelper(nid, indx, imageid, imagename, image, vdate, sid, "site", nodeStatus, function(fds, fdn, ftrid, ftrdate, updateId, uploadStatus) {
                  if(fdn == "error") {
                    
                  }else{
                    var y = 0;
                    devtracnodes.updateNodeHelper(ftrid, y, fds, fdn, ftrdate, updateId, function(updates, ftritemid, activeid) {
                      nodeStatus['sitevisits'][sitevisits[0]['nid']]['nid'] = sid;
                      nodeStatus['sitevisits'][sitevisits[0]['nid']]['edit'] = true;
                      
                      newsitevisits[ftritemid] = sitevisits[0]['title'];
                      updates['fresh_nid'] = ftritemid;
                      updates['editflag'] = 0;
                      
                      if(ftritemid != "error") {
                        
                        var newsiteid = {};
                        newsiteid['fresh_nid'] = updates['fresh_nid'];
                        
                        /*todo*/ 
                        devtrac.indexedDB.editSitevisit(db, sitevisits[0]['nid'], newsiteid).then(function() {
                          
                          sitevisits.splice(0, 1);
                          
                          devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, uploadStatus, callback);  
                        });
                        
                        
                      }else if(updates.indexOf('Unauthorized') != -1){
                        auth.getToken().then(function(token) {
                          localStorage.usertoken = token;
                          devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, uploadStatus, callback);
                        });
                      }
                      else{
                        
                        callback(updates, "error", uploadStatus);
                      }
                      
                    }); 
                    
                  }
                  
                });
                //no images to upload for this site visit
              }).fail(function() {
                sitevisits.splice(0, 1);
                devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, callback);
                
              });
              
            }).fail(function(e){
              if(e == "Unauthorized: CSRF validation failed" || e == "Unauthorized") {
                auth.getToken().then(function(token) {
                  localStorage.usertoken = token;
                  devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, callback);
                });  
              }else
              {
                callback(e, "error", nodeStatus);
              }
            });
            
          });
        }
        
      }else{
        callback(newsitevisits, nodeStatus);
      }
      
    },
    
    
    //upload sitevisits
    uploadFtritemswithLocations: function(names, newnids, oldnids, db) {
      var d = $.Deferred();
      var ftritems = [];
      var idstore = [];
      
      devtracnodes.loopFtritems(names, newnids, oldnids, db, ftritems, idstore, function(sitevisits, ids) {
        d.resolve(names, newnids, oldnids, sitevisits);
        
      });  
      
      return d;
    },
    
    //get individual site visits
    loopFtritems: function(names, newnids, oldids, db, sitev, idcontainer, callback) {
      var sitevisits = sitev;
      
      var idcontainer = idcontainer;
      
      devtrac.indexedDB.getSitevisitBypnid(db, parseInt(oldids[0])).then(function(sitevisit) {
        idcontainer.push(oldids[0]);
        if(sitevisit['taxonomy_vocabulary_7']['und'][0]['tid'] != localStorage.roadside) {
          oldids.splice(0, 1);
          sitevisits.push(sitevisit);
          
          if(oldids.length > 0) {
            devtracnodes.loopFtritems(names, newnids, oldids, db, sitevisits, idcontainer, callback);
          }else {
            callback(sitevisits, idcontainer);
          }
        }
        
      });
      
    },
    
    //upload fieldtrips
    uploadFieldtrips: function(nodeStatus) {
      var d = $.Deferred();
      var count = 0;
      
      if(parseInt($("#fieldtrip_count").html()) > 0) {
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getAllFieldtripItems(db, function(fieldtrips) {
            
            for(var k in fieldtrips) {
              if(fieldtrips[k]['editflag'] == 1) {
                nodeStatus['fieldtrip'][fieldtrips[k]['nid']] = {};
                
                count = count + 1;
                delete fieldtrips[k]['editflag'];
                localStorage.title = fieldtrips[k]['title'];
                localStorage.currentfnid = fieldtrips[k]['nid'];
                
                devtracnodes.getFieldtripString(fieldtrips[k]).then(function(jsonstring) {
                  
                  devtracnodes.updateNode(localStorage.currentfnid, jsonstring).then(function(updates) {
                    var updates = {};
                    updates['editflag'] = 0;
                    updates['title'] = localStorage.title;
                    
                    nodeStatus['fieldtrip'][fieldtrips[k]['nid']]['nid'] = localStorage.currentfnid;
                    
                    d.resolve(nodeStatus);
                    
                  }).fail(function(e) {
                    if(e == "Unauthorized: CSRF validation failed" || e == "Unauthorized") {
                      auth.getToken().then(function(token) {
                        localStorage.usertoken = token;
                        devtracnodes.uploadFieldtrips(nodeStatus);
                      });  
                    }else
                    {
                      d.reject(nodeStatus, e);
                      
                    }
                  }); 
                });
              }
            }
          });  
          
        });
      }else{
        console.log("hola");
        
        d.resolve(nodeStatus);
      }
      
      return d;
    },
    
    updateSyncData: function(syncData) {
      var actionitems = "";
      var locations = "";
      var sitevisits = "";
      var roadsides = "";
      var fieldtrips = "";
      var comments = "";
      
      if(syncData){
        actionitems = syncData['actionitems'];
        locations = syncData['locations'];
        sitevisits = syncData['sitevisits'];
        roadsides = syncData['roadside'];
        fieldtrips = syncData['fieldtrip'];
        comments = syncData['comments'];  
      }
      
      if(controller.sizeme(locations) > 0) {
        devtracnodes.getNodeUpdates('locations', locations, function(locationData) {
          devtrac.indexedDB.open(function (db) {
            devtracnodes.clearUploadedLocations(db, locationData['ids'], locationData['updates'], function() {
              
              syncData['locations'] = [];
              devtracnodes.updateSyncData(syncData)
              
            }); 
          });
          
        });
        
      }else if(controller.sizeme(sitevisits) > 0) {
        devtracnodes.getNodeUpdates('sitevisit', sitevisits, function(sitevisitData) {
          
          devtrac.indexedDB.open(function (db) {
            devtracnodes.clearUploadedSitevisits(db, sitevisitData, function() {
              syncData['sitevisits'] = [];
              devtracnodes.updateSyncData(syncData);  
            });  
            
          });
          
          
        });
        
      }else if(controller.sizeme(roadsides) > 0) {
        devtracnodes.getNodeUpdates('roadside', roadsides, function(roadsideData) {
          
          devtrac.indexedDB.open(function (db) {
            devtracnodes.clearUploadedSitevisits(db, roadsideData, function() {
              syncData['roadside'] = [];
              devtracnodes.updateSyncData(syncData);  
            });  
            
          });
          
        });
        
      }else if(controller.sizeme(actionitems) > 0) {
        devtracnodes.getNodeUpdates('actionitems', actionitems, function(actionitemData) {
          devtrac.indexedDB.open(function (db) {
            devtracnodes.clearUploadedActionitems(db, actionitemData['ids'], actionitemData['updates'], function() {
              
              syncData['actionitems'] = [];
              devtracnodes.updateSyncData(syncData)
              
            }); 
          });
          
        });
        
      }else if(controller.sizeme(fieldtrips) > 0) {
        for(var fieldtrip in fieldtrips) {
          if(controller.sizeme(fieldtrips[fieldtrip]) > 0) {
            if(fieldtrips[fieldtrip]['nid'] != "" && fieldtrips[fieldtrip]['nid'] != undefined) {
              var updates = {};
              updates['fresh_nid'] = parseInt(fieldtrips[fieldtrip]['nid']);
              updates['submit'] = 1;
              updates['editflag'] = 0;
              
              devtrac.indexedDB.open(function (db) {
                devtrac.indexedDB.editFieldtrip(db, localStorage.currentfnid, updates).then(function() {
                  controller.countAllNodes();
                  
                  syncData['fieldtrip'] = [];
                  devtracnodes.updateSyncData(syncData)
                  
                });
                
              });  
            } else{
              controller.loadingMsg("Fieldtrip Sync was interrupted; Please re-upload.", 2000);
            } 
          } else {
            controller.loadingMsg("Roadside visits Sync Error; Please re-upload.", 2000);
          } 
          
        }
      } else {
        controller.countAllNodes();
        
        $.unblockUI({ 
          onUnblock: function() {
            document.removeEventListener("backbutton", controller.onBackKeyDown, false);
          }
        
        });
      }
      
    },
    
    //mark uploaded sitevisits as completed in the dB
    clearUploadedSitevisits: function(db, updates, callback) {
      //where updates is the array updates with items => nid, ids and updates 
      if(updates['updates']['nid'].length > 0) {
        
        updates['fresh_nid'] = updates['updates']['nid'][0]['nid'];
        var flag = false;
        for(var t in updates['updates']['nid']) {
          if(updates['updates']['nid'][t].length == 0 && updates['updates']['nid'][t] != "error") {
            flag = true;
            break;
            
            for(var b in updates['updates']['images'][t]) {
              if(updates['updates']['images'][t][b].length > 0) {
                flag = true;
                break;    
              }
            }
          }
        }
        
        if(!flag) {
          var sid = "";
          if(updates['updates']['nid'][0]['edit']) {
            sid = updates['ids'][0];
          }else {
            sid = parseInt(updates['ids'][0]);
          }
          
          //Fill in site visit values to be edited
          updates['fresh_nid'] = updates['updates']['nid'][0]['nid'];
          updates['submit'] = 1;
          updates['editflag'] = 0;
          
          devtrac.indexedDB.editSitevisit(db, sid, updates).then(function() {
            updates['ids'].splice(0, 1);
            updates['updates']['nid'].splice(0, 1);
            
            controller.countAllNodes();
            
            devtracnodes.clearUploadedSitevisits(db, updates, callback);
            
          });               
        }else {
          console.log("this has an issue");
          
          updates['nid'].splice(0, 1);
          controller.countAllNodes();
          devtracnodes.clearUploadedSitevisits(db, updates, callback);
        }
        
        
      }else {
        callback();
      }
      
    },
    
    //mark uploaded locations as completed in the dB
    clearUploadedLocations: function(db, locIds, updates, callback) {
      if(locIds.length > 0) {
        
        
        updates['fresh_nid'] = updates['nid'][0];
        updates['submit'] = 1;
        
        devtrac.indexedDB.editPlace(db, locIds[0], updates).then(function() {
          locIds.splice(0, 1);
          updates['nid'].splice(0, 1);
          controller.countAllNodes();
          
          devtracnodes.clearUploadedLocations(db, locIds, updates, callback);
        });   
        
        
      }else {
        callback();
      }
      
    },
    
    //mark uploaded actionitems as completed in the dB
    clearUploadedActionitems: function(db, actionIds, updates, callback) {
      if(actionIds.length > 0) {
        
        updates['submit'] = 1;
        updates['fresh_nid'] = updates['nid'][0]['nid'];
        devtrac.indexedDB.editActionitem(db, parseInt(actionIds[0]), updates).then(function() {
          actionIds.splice(0, 1);
          updates['nid'].splice(0, 1);
          controller.countAllNodes();
          
          devtracnodes.clearUploadedActionitems(db, actionIds, updates, callback);
        });   
        
        
      }else {
        callback();
      }
      
    },
    
    //Get node updates
    getNodeUpdates: function(nodeType, nodeObject, callback) {
      var nodeUpdates = {};
      var updates = {};
      
      if(nodeType == 'locations') {
        var loc_ids = [];
        
        updates['nid'] = [];
        
        for(var location in nodeObject) {
          if(nodeObject[location] != "" && location != "status") {
            if(nodeObject["status"] == true) {
              loc_ids.push(parseInt(location));  
            }else{
              loc_ids.push(location);
            }
            
            updates['nid'].push(nodeObject[location]);  
          }else {
           // controller.loadingMsg("Locations Sync Error; Please re-upload.", 2000);
          }
          
        }
        
        nodeUpdates['ids'] = loc_ids;
        nodeUpdates['updates'] = updates;
        
        callback(nodeUpdates);
        
      }else if(nodeType == 'roadside') {
        
        var site_ids = [];
        var updates = {};
        updates['nid'] = [];
        updates['images'] = devtracnodes.sanitizeSitevisits(nodeObject);
        
        //first get the db ids for the roadside visits
        for(var roadside in nodeObject) {
          if(nodeObject[roadside]['nid'] != "" && nodeObject[roadside]['nid'] != "error") {
            site_ids.push(roadside);
            updates['nid'].push(nodeObject[roadside]);
          }else {
            controller.loadingMsg("Roadside visits Sync Error; Please re-upload.", 2000);
          }
          
        }
        
        nodeUpdates['ids'] = site_ids;
        nodeUpdates['updates'] = updates;
        
        callback(nodeUpdates);
        
      }else if(nodeType == 'sitevisit') {
        
        var site_ids = [];
        var updates = {};
        updates['nid'] = [];
        updates['images'] = devtracnodes.sanitizeSitevisits(nodeObject);
        
        //first get the db ids for the sitevisits
        for(var sitevisit in nodeObject) {
          if(nodeObject[sitevisit]['nid'] != "" && nodeObject[sitevisit]['nid'] != "error") {
            site_ids.push(sitevisit);
            updates['nid'].push(nodeObject[sitevisit]);
          }else {
            controller.loadingMsg("Site visits Sync Error; Please re-upload.", 2000);
          }
          
        }
        
        nodeUpdates['ids'] = site_ids;
        nodeUpdates['updates'] = updates;
        
        callback(nodeUpdates);
        
      }else if(nodeType == 'actionitems') {
        
        var action_ids = [];
        updates['nid'] = [];
        
        for(var actionitem in nodeObject) {
          if(nodeObject[actionitem]['nid'] != "") {
            action_ids.push(actionitem);
            updates['nid'].push(nodeObject[actionitem]);  
          } else {
            controller.loadingMsg("Actionitems Sync Error; Please re-upload.", 2000);
          }
        }
        
        nodeUpdates['ids'] = action_ids;
        nodeUpdates['updates'] = updates;
        
        callback(nodeUpdates);
        
      }
      
    },
    
    sanitizeSitevisits: function(sitevisitObject){
      var sitevisit = []; 
      
      for(var item in sitevisitObject){
        var images = {};
        for(var mark in sitevisitObject[item]) {
          if(mark != "nid") {
            images[mark] = sitevisitObject[item][mark];
            
          }    
        }
        sitevisit.push(images);
        
      }
      
      return sitevisit;
    },
    
    syncSitevisits: function(ftritemdetails, ftritems_locs, nodeStatus) {
      var ftritems = false;
      var nodeStatus = nodeStatus;
      
      //upload site visits (road side observations)
      devtracnodes.checkSitevisits().then(function(sitevisits) {
        
        for(var y = 0; y < sitevisits.length; y++) {
          nodeStatus['roadside'][sitevisits[y]['nid']] = {};  
        }
        devtrac.indexedDB.open(function (db) {
          var newsitevisits = [];
          devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, function(uploadedftritems, state) {
            if(state == "error"){
              controller.loadingMsg(uploadedftritems, 3000);
              
            }else{
              ftritems = true;
              controller.loadingMsg("Finished Syncing Roadside Sitevisits ...", 0);
              
              if(ftritems_locs = true && ftritems == true) {
                
                devtracnodes.syncActionitems(ftritems, state);
                
              }
            }
          });
        });
        
        //no site visits to upload
      }).fail(function() {
        ftritems = true;
        if(ftritems_locs = true && ftritems == true) {
          devtracnodes.syncActionitems(ftritems, nodeStatus);
        }
      });
      
    },
    
    
    syncActionitems: function(ftritems, nodeStatus){
      var actionitems = false;
      
      if(parseInt($("#actionitem_count").html()) > 0) {
        console.log("Inside sync action items");
        
        //upload action items and comments
        devtracnodes.checkActionitems().then(function(actionitems, db) {
          for(var item in actionitems) { 
            nodeStatus['actionitems'][actionitems[item]['nid']] = {};
          }
          
          devtracnodes.uploadActionItems(actionitems, nodeStatus, function(updatedStatus){
            actionitems = true;
            controller.loadingMsg("Finished Syncing Action Items ...", 0);
            
            if(ftritems == true && actionitems == true){
              devtracnodes.syncFieldtrips(actionitems, updatedStatus);
              
            }
            
          });
          
        }).fail(function(){
          actionitems = true;
          if(ftritems == true && actionitems == true){
            devtracnodes.syncFieldtrips(actionitems, nodeStatus);
          }
        });
        
      }else{
        actionitems = true;
        if(ftritems == true && actionitems == true){
          devtracnodes.syncFieldtrips(actionitems, nodeStatus);
        }
        
      }
    },
    
    syncFieldtrips: function(actionitems, nodeStatus) {
      var fieldtrips = false;
      if(parseInt($("#fieldtrip_count").html()) > 0) {
        //upload fieldtrips
        devtracnodes.uploadFieldtrips(nodeStatus).then(function(status, e) {
          fieldtrips = true;
          controller.loadingMsg("Finished Syncing Fieldtrips ...", 0);
          $("#fieldtrip_count").html("0");
          
          if(fieldtrips == true && actionitems == true) {
            devtracnodes.syncComments(fieldtrips, status);
            
          }
          
        }).fail(function(status, e){
          controller.loadingMsg("Fieldtrips "+e, 0);
          
          fieldtrips = true;
          if(fieldtrips == true && actionitems == true){
            devtracnodes.syncComments(fieldtrips, status);
            
          }
          
        });  
        
      }else{
        fieldtrips = true;
        if(fieldtrips == true && actionitems == true) {
          devtracnodes.syncComments(fieldtrips, nodeStatus);
          
        }
      }
    },
    
    syncComments: function(fieldtrips, nodeStatus) {
      var comments = false;
      
      devtrac.indexedDB.open(function (db) {
        devtracnodes.countComments(db).then(function(items) {
          //Upload comments
          devtracnodes.uploadComments().then(function() {
            comments = true;
            controller.loadingMsg("Finished Syncing Comments ...", 0);
            
            if(fieldtrips == true && comments == true) {
              devtracnodes.updateSyncData(status);
              
            }
            
          }).fail(function(e){
            controller.loadingMsg("Error Uploading Comments, Please try again ..."+e, 0);
            
            comments = true;
            if(fieldtrips == true && comments == true){
              devtracnodes.updateSyncData(nodeStatus);
              
            }
            
          });
        }).fail(function(lcount){
          comments = true;
          if(fieldtrips == true && comments == true) {
            devtracnodes.updateSyncData(nodeStatus);
            
          }
        });
        
      });
      
    },
    
    //upload fieldtrips
    uploadComments: function() {
      var d = $.Deferred();
      var count = 0;
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllActionComments(db).then(function(comments) {
          
          devtracnodes.postComments(db, comments, comments, function(response) {
            if(response.length == 0){
              d.resolve();  
            }else{
              d.reject(response);
            }
            
          });
          
        });  
        
      });
      
      return d;
    },
    
    syncAll: function() {
      
      var ftritems_locs = false;
      var uploadedNodes = {
          "locations": {},
          "actionitems": {},
          "sitevisits": {},
          "roadside": {},
          "fieldtrip": {}
      };
      
      if(controller.connectionStatus) {
        
        if(parseInt($("#location_count").html()) > 0 || parseInt($("#sitevisit_count").html()) > 0 || parseInt($("#comment_count").html()) > 0 || parseInt($("#actionitem_count").html()) > 0 || parseInt($("#fieldtrip_count").html()) > 0) {
          //Register the event listener to disable native back button
          document.addEventListener("backbutton", controller.onBackKeyDown, false);
          
          controller.loadingMsg("Syncing, Please Wait...", 0);
          
          if(parseInt($("#location_count").html()) > 0) {
            
            //upload locations and sitevisits (human interest stories and site visits)
            devtracnodes.uploadLocations().then(function(postarray, titlearray, pnid, location_nodes, jsonLocation) {
              
              var newlocationnames = [];
              var newlocation_nids = [];
              var oldlocation_nids = [];
              
              //initialize array with old ids for sitevisits and locations
              for(var x = 0; x < pnid.length; x++) {
                uploadedNodes['locations'][pnid[x]] = "";
              }
              
              devtracnodes.postLocationHelper(newlocation_nids, newlocationnames, oldlocation_nids, postarray, titlearray, pnid, uploadedNodes, location_nodes, function(newnames, newids, oldids, upNodes){
                
                if(newids == "" && oldids == "") {
                  controller.loadingMsg(newnames, 3000);
                  
                  
                  ftritems_locs = true;
                  var ftritemdetails = [];
                  
                  devtracnodes.syncSitevisits(ftritemdetails, ftritems_locs, upNodes);
                  
                }else {
                  controller.loadingMsg("Finished Syncing Locations ...", 0);
                  
                  devtrac.indexedDB.open(function (dbs) {
                    devtracnodes.uploadFtritemswithLocations(newnames, newids, oldids, dbs).then(function(names, newnids, oldnids, sitevisits) {
                      
                      //initialize array with empty objects for sitevisits
                      for(var x = 0; x < sitevisits.length; x++) {
                        upNodes['sitevisits'][sitevisits[x]['nid']] = {};
                      }
                      
                      devtracnodes.postSitevisitHelper(sitevisits, names, newnids, [], upNodes, function(ftritemdetails, state, nodeStatus){
                        if(state == "result"){
                          controller.loadingMsg("Finished Syncing Sitevisits with Locations ...", 0);
                          
                          ftritems_locs = true;
                          
                          devtracnodes.syncSitevisits(ftritemdetails, ftritems_locs, nodeStatus);
                        }else{
                          controller.loadingMsg(ftritemdetails, 3000);
                          
                          
                          ftritems_locs = true;
                          devtracnodes.syncSitevisits(ftritemdetails, ftritems_locs, nodeStatus);
                        }
                        
                      });
                      
                    });
                  });
                }
                
              }, jsonLocation);
              
            });
            
          }else {
            ftritems_locs = true;
            var ftritemdetails = [];
            
            devtracnodes.syncSitevisits(ftritemdetails, ftritems_locs, uploadedNodes);
          }
          
          
        }else {
          controller.loadingMsg("Nothing New to Upload", 3000);
          
        }
        
        
        
      }
      else
      {
        controller.loadingMsg("No Internet Connection", 2000);
        
      }
    },
    
    postSitevisitHelper: function(sitevisits, names, newnids, ftritemdetails, upNodes, callback) {
      if(sitevisits.length > 0){
        devtracnodes.getSitevisitString(sitevisits[0], names[0], newnids[0]).then(function(jsonstring, p, q, r, mark, ftritemJson) {
          
          devtracnodes.postNode(jsonstring, mark, sitevisits.length, r, ftritemJson).then(function(updates, stat, snid) {
            
            devtrac.indexedDB.open(function (db) {
              devtrac.indexedDB.getImage(db, parseInt(sitevisits[0]['nid']), updates['nid']).then(function(image, ftritemid) {
                
                var indx = 0;
                var imageid = [];
                var imagename = [];
                var emptystring = "";
                
                for(var y = 0; y < image['names'].length; y++) {
                  upNodes['sitevisits'][sitevisits[0]['nid']][image['names'][y]] = "";  
                }
                
                //upload images
                devtracnodes.imagehelper(ftritemid, indx, imageid, imagename, image, emptystring, emptystring, "site", upNodes, function(fds, fdn, ftrid, dummy, dummy2, upNodes2) {
                  
                  if(fdn == "error") {
                    callback(fds, "error", upNodes2);
                  }else{
                    
                    var y = 0;
                    //update site report nodes with fids for uploaded images
                    devtracnodes.updateNodeHelper(ftrid, y, fds, fdn, localStorage.visiteddate, "dummy", function(updates, ftritemid) {
                      
                      if(ftritemid != undefined) {
                        
                        var newsiteid = {};
                        newsiteid['fresh_nid'] = ftritemid; 
                        newsiteid['editflag'] = 0;
                        
                        /*todo*/ 
                        devtrac.indexedDB.editSitevisit(db, parseInt(sitevisits[0]['nid']), newsiteid).then(function() {
                          
                          upNodes2['sitevisits'][sitevisits[0]['nid']]['nid'] = ftritemid;
                          ftritemdetails[updates['nid']] =  sitevisits[0]['title'];
                          sitevisits.splice(0, 1);
                          names.splice(0, 1);
                          newnids.splice(0, 1);
                          devtracnodes.postSitevisitHelper(sitevisits, names, newnids, ftritemdetails, upNodes2, callback);
                          
                        });
                        
                      }else if(updates.indexOf('Unauthorized') != -1) {
                        auth.getToken().then(function(token) {
                          localStorage.usertoken = token;
                          devtracnodes.postSitevisitHelper(sitevisits, names, newnids, ftritemdetails, upNodes2, callback);
                        });
                      }
                      
                    });                   
                  }
                  
                });
                //No images found for this site visit so edit and proceed to the next
              }).fail(function(){
                console.log("not found images");
                updates['editflag'] = 0;
                /*todo*/ 
                devtrac.indexedDB.editSitevisit(db, sitevisits[0]['nid'], updates).then(function() {
                  
                  upNodes['sitevisits'][sitevisits[0]['nid']]['nid'] = updates['nid'];
                  
                  ftritemdetails[updates['nid']] =  sitevisits[0]['title'];
                  sitevisits.splice(0, 1);
                  names.splice(0, 1);
                  newnids.splice(0, 1);
                  
                  devtracnodes.postSitevisitHelper(sitevisits, names, newnids, ftritemdetails, upNodes, callback);
                });
                
                
              });
              
            });
            
          }).fail(function(e){
            if(e == "Unauthorized: CSRF validation failed" || e == "Unauthorized") {
              auth.getToken().then(function(token) {
                localStorage.usertoken = token;
                devtracnodes.uploadLocations();
              });  
            }else
            {
              callback(e, "error", upNodes);
            }
          });
          
        });
        
      }else{
        callback(ftritemdetails, "result", upNodes);
      }
      
    },
    
    //check sitevisits to update
    checkSitevisitforUpdate: function() {
      var d = $.Deferred();
      var sitevisit = false;
      
      devtrac.indexedDB.open(function (db) {
        //check for sitevisits to upload
        devtrac.indexedDB.getAllSitevisits(db, function(sitevisits) {
          for(var k in sitevisits) {
            if(sitevisits[k]['submit'] == 0 && sitevisits[k]['user-added'] == undefined) {
              sitevisit = true;
              break;
            }
          }
          if(sitevisit) {
            d.resolve();
          }else{
            d.reject();
          }
        });
        
      });
      
      return d;
    },
    
    // check locations to upload
    checkLocationsforUpload: function(){
      var d = $.Deferred();
      var place = false;
      
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllplaces(db, function(places) {
          for(var k in places) {
            if(places[k]['submit'] == 0 && places[k]['user-added'] == true) {
              place = true;
              break;
            }
          }
          if(place) {
            d.resolve();
          }else{
            d.reject();
          }
        });  
      });
      
      return d;
    },
    
    //return site visit string
    getSitevisitString: function(aObj, placename, placeid, index) {
      var d = $.Deferred();      
      var sitevisit_backup = aObj;
      var visited_date = "";
      var nodeObject = {};
      
      //delete aObj['dbsavetime'];
      delete aObj['submit'];
      delete aObj['editflag'];
      delete aObj['field_actionitem_ftreportitem'];
      
      var nodestring = '';
      for(var a in aObj) {
        if(typeof aObj[a] == 'object') {
          switch(a) {
            case 'taxonomy_vocabulary_7': 
              
              nodeObject['taxonomy_vocabulary_7'] = {};
              nodeObject['taxonomy_vocabulary_7']['und'] = {};
              nodeObject['taxonomy_vocabulary_7']['und']['tid'] = aObj[a]['und'][0]['tid'];
              
              nodestring = nodestring + a+'[und][tid]='+aObj[a]['und'][0]['tid']+'&';
              break;
            case 'field_ftritem_public_summary': 
              
              nodeObject['field_ftritem_public_summary'] = {};
              nodeObject['field_ftritem_public_summary']['und'] = [];
              nodeObject['field_ftritem_public_summary']['und'][0] = {};
              nodeObject['field_ftritem_public_summary']['und'][0]['value'] = aObj[a]['und'][0]['value'];
              
              nodestring = nodestring +a+'[und][0][value]='+aObj[a]['und'][0]['value']+'&';
              break;
            case 'field_ftritem_narrative':
              
              nodeObject['field_ftritem_narrative'] = {};
              nodeObject['field_ftritem_narrative']['und'] = [];
              nodeObject['field_ftritem_narrative']['und'][0] = {};
              nodeObject['field_ftritem_narrative']['und'][0]['value'] =  aObj[a]['und'][0]['value'];
              
              nodestring = nodestring +a+'[und][0][value]='+aObj[a]['und'][0]['value']+'&';
              break;
            case 'field_ftritem_field_trip':
              
              nodeObject['field_ftritem_field_trip'] = {};
              nodeObject['field_ftritem_field_trip']['und'] = [];
              nodeObject['field_ftritem_field_trip']['und'][0] = {};
              nodeObject['field_ftritem_field_trip']['und'][0]['target_id'] = localStorage.ftitle+"("+aObj[a]['und'][0]['target_id']+")";
              
              nodestring = nodestring +a+'[und][0][target_id]='+localStorage.ftitle+"("+aObj[a]['und'][0]['target_id']+")"+'&';
              break;
            case 'field_ftritem_date_visited':
              var duedate = null;
              
              console.log("original date is "+aObj[a]['und'][0]['value']);
              
              if(aObj[a]['und'][0]['value'].indexOf('T') == -1) {
                var dateparts = "";
                if(aObj[a]['und'][0]['value'].indexOf('/') != -1) {
                  dateparts = aObj[a]['und'][0]['value'].split('/');  
                }else if(aObj[a]['und'][0]['value'].indexOf('-') != -1){
                  dateparts = aObj[a]['und'][0]['value'].split('-');
                }
                
                duedate = dateparts[2]+'/'+dateparts[1]+'/'+dateparts[0];

                nodeObject['field_ftritem_date_visited'] = {};
                nodeObject['field_ftritem_date_visited']['und'] = [];
                nodeObject['field_ftritem_date_visited']['und'][0] = {};
                nodeObject['field_ftritem_date_visited']['und'][0]['value'] = {};
                nodeObject['field_ftritem_date_visited']['und'][0]['value']['date'] = duedate;
                
                console.log("clean date is "+duedate);
                
              }else{
                var sitedate = aObj[a]['und'][0]['value'];
                
                var sitedatestring = JSON.stringify(sitedate);
                var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
                var sitedatearray = sitedateonly.split("-");
                
                duedate =  sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
                
                nodeObject['field_ftritem_date_visited'] = {};
                nodeObject['field_ftritem_date_visited']['und'] = [];
                nodeObject['field_ftritem_date_visited']['und'][0] = {};
                nodeObject['field_ftritem_date_visited']['und'][0]['value'] = sitedateonly;
                
                console.log("unclean date is "+duedate);
              }
              
              visited_date = duedate;
              localStorage.visiteddate = visited_date; 
              
              console.log("upload date is "+duedate);
              
              nodestring = nodestring +a+'[und][0][value][date]='+duedate+'&';
              
              break;
            case 'field_ftritem_place':
              if(placename != undefined && placename != null){
                
                nodeObject['field_ftritem_place'] = {};
                nodeObject['field_ftritem_place']['und'] = [];
                nodeObject['field_ftritem_place']['und'][0] = {};
                nodeObject['field_ftritem_place']['und'][0]['target_id'] = placename+"("+placeid+")";
                
                nodestring = nodestring +a+'[und][0][target_id]='+placename+"("+placeid+")"+'&';
              }
              
              break;
              
            case 'field_ftritem_lat_long':
              
              nodeObject['field_ftritem_lat_long'] = {};
              nodeObject['field_ftritem_lat_long']['und'] = [];
              nodeObject['field_ftritem_lat_long']['und'][0] = {};
              nodeObject['field_ftritem_lat_long']['und'][0]['geom'] = aObj[a]['und'][0]['geom'];
              
              nodestring = nodestring +a+'[und][0][geom]='+aObj[a]['und'][0]['geom']+'&';
              break;
              
            default :
              break
          }
        }
        else {
          if(a != 'user-added' && a != 'image' && a != "nid" && a != "ftritem_place" && a != "fresh_nid") {
            
            nodeObject[a] = aObj[a];
            
            nodestring = nodestring +a+'='+aObj[a]+"&";  
          }
        }
      }
      var nodestringlen = nodestring.length;
      var newnodestring = nodestring.substring(0, nodestringlen - 1);
      
      d.resolve(newnodestring, sitevisit_backup, visited_date, aObj['nid'], index, nodeObject);
      
      return d;
      
    },
    
    //return fieldtrip string
    getFieldtripString: function(aObj) {
      var d = $.Deferred();         
      var nodestring = '';
      for(var a in aObj) {
        if(typeof aObj[a] == 'object') {
          switch(a) {
            case 'field_fieldtrip_start_end_date':
              var sitedate = aObj[a]['und'][0]['value'];
              var sitedate2 = aObj[a]['und'][0]['value2'];
              
              var sitedatestring = JSON.stringify(sitedate);
              var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
              var sitedatearray = sitedateonly.split("-");
              
              var formatedsitedate = sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
              
              var sitedatestring2 = JSON.stringify(sitedate2);
              var sitedateonly2 = sitedatestring2.substring(1, sitedatestring2.indexOf('T'));
              var sitedatearray2 = sitedateonly2.split("-");
              
              var formatedsitedate2 = sitedatearray2[2] + "/" + sitedatearray2[1] + "/" + sitedatearray2[0];
              
              nodestring = nodestring + 'node['+a+'][und][0][value][date]='+formatedsitedate+'&';
              nodestring = nodestring + 'node['+a+'][und][0][value2][date]='+formatedsitedate2+'&';
              break;
              
            default :
              break
          }
        }
        else{
          if(a == 'title') {
            nodestring = nodestring + 'node['+a+']='+aObj[a]+"&";  
          }
          
        }
      }
      var nodestringlen = nodestring.length;
      var newnodestring = nodestring.substring(0, nodestringlen - 1);
      
      d.resolve(newnodestring);
      
      return d;
      
    },
    
    //return fieldtrip string
    getCommentString: function(cObj) {
      var d = $.Deferred();         
      var nodestring = '';
      for(var c in cObj) {
        if(typeof cObj[c] == 'object') {
          switch(a) {
            case 'field_fieldtrip_start_end_date':
              var sitedate = aObj[a]['und'][0]['value'];
              var sitedate2 = aObj[a]['und'][0]['value2'];
              
              var sitedatestring = JSON.stringify(sitedate);
              var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
              var sitedatearray = sitedateonly.split("-");
              
              var formatedsitedate = sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
              
              var sitedatestring2 = JSON.stringify(sitedate2);
              var sitedateonly2 = sitedatestring2.substring(1, sitedatestring2.indexOf('T'));
              var sitedatearray2 = sitedateonly2.split("-");
              
              var formatedsitedate2 = sitedatearray2[2] + "/" + sitedatearray2[1] + "/" + sitedatearray2[0];
              
              nodestring = nodestring + 'node['+a+'][und][0][value][date]='+formatedsitedate+'&';
              nodestring = nodestring + 'node['+a+'][und][0][value2][date]='+formatedsitedate2+'&';
              break;
              
            default :
              break
          }
        }
        else{
          if(a == 'title') {
            nodestring = nodestring + 'node['+a+']='+aObj[a]+"&";  
          }
          
        }
      }
      var nodestringlen = nodestring.length;
      var newnodestring = nodestring.substring(0, nodestringlen - 1);
      
      d.resolve(newnodestring);
      
      return d;
      
    },
    
    //return place
    getLocationString: function(pObj, purpose) {
      var d = $.Deferred();
      var nodeJsonObject = {};
      var nodeType = "";
      nodeJsonObject['type'] = pObj['type'];
      
      var nodestring = '';
      for(var p in pObj) {
        if(typeof pObj[p] == 'object') {
          switch(p) {
            case 'field_place_website': 
              var url;
              var website = {};
              
              if(pObj[p]['und']) {
                
                nodeJsonObject['field_place_website'] = {};
                nodeJsonObject['field_place_website']['und'] = [];
                nodeJsonObject['field_place_website']['und'][0] = {};
                nodeJsonObject['field_place_website']['und'][0]['url'] = pObj[p]['und'][0]['url'];
                
                url = pObj[p]['und'][0]['url'];
                nodestring = nodestring + 'node['+p+'][und][0][url]='+encodeURIComponent(url)+'&';
              }
              break;
            case 'field_place_email': 
              var email;
              if(pObj[p]['und']) {
                
                nodeJsonObject['field_place_email'] = {};
                nodeJsonObject['field_place_email']['und'] = [];
                nodeJsonObject['field_place_email']['und'][0] = {};
                nodeJsonObject['field_place_email']['und'][0]['email'] = pObj[p]['und'][0]['email'];;
                
                email = pObj[p]['und'][0]['email'];
                nodestring = nodestring + 'node['+p+'][und][0][email]='+encodeURIComponent(email)+'&';
              }
              
              break;
            case 'field_place_phone': 
              var phone;
              if(pObj[p]['und']) {
                
                nodeJsonObject['field_place_phone'] = {};
                nodeJsonObject['field_place_phone']['und'] = [];
                nodeJsonObject['field_place_phone']['und'][0] = {};
                nodeJsonObject['field_place_phone']['und'][0]['value'] = pObj[p]['und'][0]['phone'];
                
                phone = pObj[p]['und'][0]['phone'];
                nodestring = nodestring + 'node['+p+'][und][0][value]='+encodeURIComponent(phone)+'&'; 
              }
              
              break;
            case 'field_place_responsible_person': 
              
              nodeJsonObject['field_place_responsible_person'] = {};
              nodeJsonObject['field_place_responsible_person']['und'] = [];
              nodeJsonObject['field_place_responsible_person']['und'][0] = {};
              nodeJsonObject['field_place_responsible_person']['und'][0]['value'] = pObj[p]['und'][0]['value'];
              
              nodestring = nodestring + 'node['+p+'][und][0][value]='+pObj[p]['und'][0]['value']+'&';
              break;
            case 'field_place_lat_long': 
              
              nodeJsonObject['field_place_lat_long'] = {};
              nodeJsonObject['field_place_lat_long']['und'] = [];
              nodeJsonObject['field_place_lat_long']['und'][0] = {};
              nodeJsonObject['field_place_lat_long']['und'][0]['geom'] = pObj[p]['und'][0]['geom'];
              nodeJsonObject['field_place_lat_long']['und'][0]['lat'] = parseInt(pObj[p]['und'][0]['lat']);
              nodeJsonObject['field_place_lat_long']['und'][0]['lon'] = parseInt(pObj[p]['und'][0]['lon']);
              
              nodestring = nodestring + 'node['+p+'][und][0][geom]='+pObj[p]['und'][0]['geom']+'&';
              break;
            case 'taxonomy_vocabulary_6':
              
              nodeJsonObject['taxonomy_vocabulary_6'] = {};
              nodeJsonObject['taxonomy_vocabulary_6']['und'] = [];
              nodeJsonObject['taxonomy_vocabulary_6']['und'][0] = {};
              nodeJsonObject['taxonomy_vocabulary_6']['und'][0]['tid'] = pObj[p]['und'][0]['tid'];
              
              nodestring = nodestring + 'node['+p+'][und][0][tid]='+pObj[p]['und'][0]['tid']+'&';
              break;
            case 'taxonomy_vocabulary_1':
              
              nodeJsonObject['taxonomy_vocabulary_1'] = {};
              nodeJsonObject['taxonomy_vocabulary_1']['und'] = [];
              nodeJsonObject['taxonomy_vocabulary_1']['und'][0] = {};
              nodeJsonObject['taxonomy_vocabulary_1']['und'][0]['tid'] = pObj[p]['und'][0]['tid'];
              
              nodestring = nodestring + 'node['+p+'][und][0][tid]='+pObj[p]['und'][0]['tid']+'&';
              break;
            default :
              break
          }
        }
        else{
          if(p != 'user-added' && p != 'nid' && p != 'type' && p != 'status' && p != 'promote' && p != 'sticky' && p != 'vuuid' && p != 'created' && p != 'changed' && p != 'tnid' && p != 'translate' && p != 'uuid' && p != 'revision_timestamp' && p != 'revision_uid' &&  
          p != 'last_comment_timestamp' && p != 'last_comment_uid' && p != 'comment_count' && p != 'name' && p != 'fresh_nid' && p != 'picture' && p != 'data') {
            
            nodeJsonObject[p] = pObj[p];
            
            nodestring = nodestring + 'node['+p+']='+pObj[p]+"&";  
          }
          
        }
      }
      var nodestringlen = nodestring.length;
      var newnodestring = nodestring.substring(0, nodestringlen - 1);
      
      d.resolve(newnodestring, pObj['nid'], pObj['title'], nodeJsonObject);
      
      return d;
      
    },
    
    //return action item string
    getActionItemString: function(aObj, nodestring, actionitemNode, callback) {
      
      if(aObj.hasOwnProperty('field_actionitem_severity')){
        actionitemNode['field_actionitem_severity'] = {};
        actionitemNode['field_actionitem_severity']['und'] = [];
        //actionitemNode['field_actionitem_severity']['und'][0] = {};
        //actionitemNode['field_actionitem_severity']['und'][0]['value'] = aObj['field_actionitem_severity']['und'][0]['value'];
        actionitemNode['field_actionitem_severity']['und']['value'] = aObj['field_actionitem_severity']['und'][0]['value'];
        
        nodestring = nodestring + 'node[field_actionitem_severity][und][value]='+aObj['field_actionitem_severity']['und'][0]['value']+'&';
        delete aObj['field_actionitem_severity'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_resp_place')) {
        if(aObj['has_location'] == true) {
          
          var pid = aObj['field_actionitem_resp_place']['und'][0]['target_id'];
          var locationtype = aObj['loctype'];
          if(locationtype.indexOf('user_added') != -1) {
            pid = parseInt(pid);
          }
          
          devtrac.indexedDB.open(function (db) {
            devtrac.indexedDB.getPlace(db, pid, function(place) {
              var pid = "";
              if(place['fresh_nid'] == undefined){
                pid = place['nid'];
                 
              }
              else{
                pid = place['fresh_nid']+")";
                
              }
              
              actionitemNode['field_actionitem_resp_place'] = {};
              actionitemNode['field_actionitem_resp_place']['und'] = [];
              actionitemNode['field_actionitem_resp_place']['und'][0] = {};
              actionitemNode['field_actionitem_resp_place']['und'][0]['target_id'] = place['title']+"("+pid+")";
              
              nodestring = nodestring + 'node[field_actionitem_resp_place][und][0][target_id]='+place['title']+"("+pid+")"+'&';
              
              delete aObj['field_actionitem_resp_place'];
              
              devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
            });
            
          }); 
        }else{
          delete aObj['field_actionitem_resp_place'];
          devtracnodes.getActionItemString(aObj, nodestring, callback);
        }
        
        
      }else if(aObj.hasOwnProperty('field_actionitem_ftreportitem')) {
        
        var sid = aObj['field_actionitem_ftreportitem']['und'][0]['target_id'];
        if(aObj['sitetype'].indexOf('user') != -1) {
          sid = parseInt(sid);
        }
        
        devtrac.indexedDB.open(function (db) {
          devtrac.indexedDB.getSitevisit(db, sid).then(function(sitevisit) {
            var nid = "";
            if(sitevisit['fresh_nid'] == undefined){
              nid = sitevisit['nid'];
                
            }
            else {
              nid = sitevisit['fresh_nid'];
              
            }
            
            nodestring = nodestring + 'node[field_actionitem_ftreportitem][und][0][target_id]='+sitevisit['title']+"("+nid+")"+'&';
            
            actionitemNode['field_actionitem_ftreportitem'] = {};
            actionitemNode['field_actionitem_ftreportitem']['und'] = [];
            actionitemNode['field_actionitem_ftreportitem']['und'][0] = {};
            actionitemNode['field_actionitem_ftreportitem']['und'][0]['target_id'] = sitevisit['title']+"("+nid+")";
            
            delete aObj['field_actionitem_ftreportitem'];
            
            devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
          });
          
        });
        
        
      }else if(aObj.hasOwnProperty('field_actionitem_followuptask')) {

        actionitemNode['field_actionitem_followuptask'] = {};
        actionitemNode['field_actionitem_followuptask']['und'] = [];
        actionitemNode['field_actionitem_followuptask']['und'][0] = {};
        actionitemNode['field_actionitem_followuptask']['und'][0]['value'] = aObj['field_actionitem_followuptask']['und'][0]['value'];
        
        nodestring = nodestring + 'node[field_actionitem_followuptask][und][0][value]='+aObj['field_actionitem_followuptask']['und'][0]['value']+'&';
        delete aObj['field_actionitem_followuptask'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('taxonomy_vocabulary_8')) {
        actionitemNode['taxonomy_vocabulary_8'] = {};
        actionitemNode['taxonomy_vocabulary_8']['und'] = {};
        actionitemNode['taxonomy_vocabulary_8']['und']['tid'] = aObj['taxonomy_vocabulary_8']['und'][0]['tid'];
        
        nodestring = nodestring + 'node[taxonomy_vocabulary_8][und][tid]='+aObj['taxonomy_vocabulary_8']['und'][0]['tid']+'&';
        delete aObj['taxonomy_vocabulary_8'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_due_date')) {
        
        var duedate = null;
        if(aObj['user-added']) {
          var dateparts = aObj['field_actionitem_due_date']['und'][0]['value']['date'].split('/');
          duedate = dateparts[2]+'/'+dateparts[1]+'/'+dateparts[0];
        }else{
          var sitedate = aObj['field_actionitem_due_date']['und'][0]['value'];
          var sitedatestring = JSON.stringify(sitedate);
          var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
          var sitedatearray = sitedateonly.split("-");
          
          duedate =  sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
          
        }
        
        actionitemNode['field_actionitem_due_date'] = {};
        actionitemNode['field_actionitem_due_date']['und'] = [];
        actionitemNode['field_actionitem_due_date']['und'][0] = {};
        actionitemNode['field_actionitem_due_date']['und'][0]['value'] = {};
        actionitemNode['field_actionitem_due_date']['und'][0]['value']['date'] = duedate;
        
        nodestring = nodestring + 'node[field_actionitem_due_date][und][0][value][date]='+duedate+'&';
        delete aObj['field_actionitem_due_date'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_status')) {
        
        actionitemNode['field_actionitem_status'] = {};
        actionitemNode['field_actionitem_status']['und'] = [];
        actionitemNode['field_actionitem_status']['und'][0] = {};
        actionitemNode['field_actionitem_status']['und'][0]['value'] = {};
        
        nodestring = nodestring + 'node[field_actionitem_status][und][value]='+aObj['field_actionitem_status']['und'][0]['value']+'&';
        delete aObj['field_actionitem_status'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_responsible')) {
        
        actionitemNode['field_actionitem_responsible'] = {};
        actionitemNode['field_actionitem_responsible']['und'] = [];
        actionitemNode['field_actionitem_responsible']['und'][0] = {};
        actionitemNode['field_actionitem_responsible']['und'][0]['target_id'] = aObj['field_actionitem_responsible']['und'][0]['target_id'];
        
        nodestring = nodestring + 'node[field_actionitem_responsible][und][0][target_id]='+aObj['field_actionitem_responsible']['und'][0]['target_id']+'&';
        delete aObj['field_actionitem_responsible'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('type')) {
        
        actionitemNode['type'] = aObj['type'];
        
        nodestring = nodestring + 'node[type]='+aObj['type']+"&";
        delete aObj['type'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('title')) {
        
        actionitemNode['title'] = aObj['title'];
        
        nodestring = nodestring + 'node[title]='+aObj['title']+"&";
        delete aObj['title'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('uid')) {
        
        actionitemNode['uid'] = aObj['uid'];
        
        nodestring = nodestring + 'node[uid]='+aObj['uid']+'&';
        delete aObj['uid'];
        
        devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        
      }else if(aObj.hasOwnProperty('field_action_items_tags')) {
        var tags = aObj['field_action_items_tags'];
        
        if(tags.length > 0) {
          var clean_tagstring = tags.replace(/,\s*$/, "");
          
          actionitemNode['field_action_items_tags'] = {};
          actionitemNode['field_action_items_tags']['und'] = clean_tagstring;
          
          nodestring = nodestring + 'node[field_action_items_tags][und]='+clean_tagstring;
          delete aObj['field_action_items_tags'];
          
          devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);  
        }else {
          delete aObj['field_action_items_tags'];
          devtracnodes.getActionItemString(aObj, nodestring, actionitemNode, callback);
        }
        
      }
      else{
        console.log("actionitem callback "+nodestring);
        callback(nodestring, aObj['nid'], actionitemNode);  
      }
      
    },
    
    //Returns devtrac fieldtrips json list and saves to indexdb
    getFieldtrips: function(db) {
      var d = $.Deferred();
      
      $.ajax({
        url : localStorage.appurl+"/api/views/api_fieldtrips.json?display_id=current_trip&filters[field_fieldtrip_status_value]=All",
        type : 'get',
        dataType : 'json',
        headers: {
          'X-CSRF-Token': localStorage.usertoken//,
          //'Cookie': localStorage.sname +"="+localStorage.sid
        },
        error : function(XMLHttpRequest, textStatus, errorThrown) { 
          console.log('fieldtrips error '+XMLHttpRequest.responseText);
          d.reject(errorThrown);
        },
        success : function(data) {
          //create bubble notification
          if(data.length <= 0) {
            $.unblockUI({ 
              onUnblock: function(){ 
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              } 
            });
            
            d.reject("No Fieldtrips Found");
            
          }
          else {
            for(var x in data) {
              data[x]['editflag'] = 0;  
            }
            
            devtrac.indexedDB.addFieldtripsData(db, data).then(function() {
              
              d.resolve();
            }).fail(function() {
              console.log("Error saving fieldtrips");
              d.resolve();
            });
          }
          
        }
      });
      
      return d;
      
    },
    
    //Returns devtrac site visit json list 
    getSiteVisits: function(db, callback) {
      
      devtrac.indexedDB.getAllFieldtripItems(db, function(fnid) {
        if(controller.sizeme(fnid) > 0) {
          for(var key in fnid) {
            $.ajax({
              url : localStorage.appurl+"/api/views/api_fieldtrips.json?display_id=sitevisits&filters[field_ftritem_field_trip_target_id]="+fnid[key]['nid'],
              type : 'get',
              dataType : 'json',
              headers: {
                'X-CSRF-Token': localStorage.usertoken
              },
              error : function(XMLHttpRequest, textStatus, errorThrown) { 
                //create bubble notification
                console.log('sitevisits error '+XMLHttpRequest.responseText);
                callback("Error "+errorThrown);
                
              },
              success : function(data) {

                callback(data);
                
              }
            });
            
          }
        }else {
          devtracnodes.getSiteVisits(db, callback);
        }
        
      });
    },
    
    //Returns devtrac site report type json list 
    getSitereporttypes: function(db) {
      var d = $.Deferred();
      
      $.ajax({
        url : localStorage.appurl+"/api/views/api_vocabularies.json?display_id=sitereporttypes",
        type : 'get',
        error : function(XMLHttpRequest, textStatus, errorThrown) { 
          
          console.log('Sitereporttypes error '+XMLHttpRequest.responseText);
          d.reject(errorThrown);
        },
        success : function(data) {
          //create bubble notification
          if(data.length <= 0) {
            console.log("No types returned from server");
            d.reject("No types returned from server");
          }else{
            
            for(var k = 0; k < data.length; k++){
              if(data[k]['name'].indexOf("uman") != -1){
                localStorage.humaninterest = data[k]['term id'];
              }else if(data[k]['name'].indexOf("oa") != -1){
                localStorage.roadside = data[k]['term id'];
              }else if(data[k]['name'].indexOf("ite") != -1){
                localStorage.sitevisit = data[k]['term id'];    
              }
              if(k == data.length -1){
                d.resolve();  
              }
            }
            
            
            
          }
        }
      });
      
      return d;
      
    },
    
    //Returns devtrac action items json list 
    getActionItems: function(db) {
      var d = $.Deferred();
      
      devtrac.indexedDB.getAllFieldtripItems(db, function(fnid) {
        
          $.ajax({
            url : localStorage.appurl+"/api/views/api_fieldtrips.json?display_id=actionitems&args[nid]="+fnid['0']['nid']+"&filters[field_actionitem_status_value][]=1&filters[field_actionitem_status_value][]=3",
            type : 'get',
            dataType : 'json',
            error : function(XMLHttpRequest, textStatus, errorThrown) { 
              
              console.log('actionitems error '+XMLHttpRequest.responseText);
              d.reject(errorThrown);
            },
            success : function(data) {
              
              console.log("received action items "+data.length);
              //create bubble notification
              if(data.length <= 0) {
                d.resolve("Action Items");
              }else {
                
                devtracnodes.saveActionItems(db, data, 0, function(){
                  d.resolve("Action Items");
                });
              }
            }
          });
        
      });
      return d;
      
    },
    
    //Returns devtrac action item comments 
    getActionComments: function(db, actionitems, callback) {
      //alert("we have received these items "+actionitems.length);
      if(actionitems.length > 0) {
        $.ajax({  
          url : localStorage.appurl+"/api/node/"+actionitems[0]['nid']+"/comments",
          type : 'get',
          dataType : 'json',
          error : function(XMLHttpRequest, textStatus, errorThrown) { 
            
            console.log('actionitem comments error '+XMLHttpRequest.responseText);
            actionitems.splice(0, 1);
            devtracnodes.getActionComments(db, actionitems, callback);
            
          },
          success : function(data) {
            var items = [];
            for(var key in data) {
              data[key]['anid'] = actionitems[0]['nid'];
              data[key]['user_added'] = false;
              
              items.push(data[key]);
            }
            
            //create bubble notification
            if(items.length > 0) {
              devtracnodes.saveItemComments(db, items, function() {
                actionitems.splice(0, 1);
                devtracnodes.getActionComments(db, actionitems, callback);        
              });
            
            }else{
              actionitems.splice(0, 1);
              devtracnodes.getActionComments(db, actionitems, callback);
            }
          }
        });  
      }else {
        callback();
      }
      
    },
    
    saveItemComments: function(db, data, callback) {
        devtrac.indexedDB.addActionItemCommentsData(db, data).then(function(){
          callback();
          
        }).fail(function(){
          callback();
          
        });
    },
    
    saveActionItems: function(db, data, count, callback) {
      
      var arrlength = data.length;
      var counter = count;
      
      if(counter != arrlength) {
        data[counter]['submit'] = 0;
        devtrac.indexedDB.addActionItemsData(db, data[counter]).then(function(){
          counter = counter + 1;
          devtracnodes.saveActionItems(db, data, counter, callback);  
        });
        
      }
      else {
        callback();
      }
      
    },
    
    saveSiteVisit: function(db, data, callback) {
      var arrlength = data.length;
      
      if(arrlength > 0 && data[0] != undefined && data[0] != null) {
        
        devtrac.indexedDB.addSiteVisitsData(db, data[0]).then(function(){
          data.shift();
          devtracnodes.saveSiteVisit(db, data, callback);  
        });
        
      }
      else {
        callback();
      }
      
    },
    
    //Returns devtrac places json list 
    downloadPlaces: function(db, snid) {
      $.ajax({
        url : localStorage.appurl+"/api/views/api_fieldtrips.json?display_id=place&filters[nid]="+snid,
        type : 'get',
        dataType : 'json',
        error : function(XMLHttpRequest, textStatus, errorThrown) { 
          
          $.unblockUI({ 
            onUnblock: function() {
              document.removeEventListener("backbutton", controller.onBackKeyDown, false);
            }
          
          });
        },
        success : function(data) {
          
          //create bubble notification
          if(data.length <= 0) {
            
          }else {
            
            for(var item in data) {
              data[item]['editflag'] = 0;
              devtrac.indexedDB.addPlacesData(db, data[item]).then(function(){
                controller.loadingMsg("Places Saved",1000);
                
              });
            }
            
          }
          
        }
      });
    },
    
    getPlaces: function(db, snid) {
        if(snid.length > 0) {
          for(var k in snid){
            if(snid[k]['fresh_nid'] != undefined) {
              devtracnodes.downloadPlaces(db, snid[k]['fresh_nid']);
            }else {
              devtracnodes.downloadPlaces(db, snid[k]['nid']);
            }
          }
        }
      
    },
    
    //Returns devtrac question json list 
    getQuestions: function(db) {
      var d = $.Deferred();
      
      $.ajax({
        url : localStorage.appurl+"/api/views/api_questions?offset=0&limit=10&filters[active]=1&filters[changed]=2%20011­02­01",
        type : 'get',
        dataType : 'json',
        error : function(XMLHttpRequest, textStatus, errorThrown) { 
          
          d.reject(errorThrown);
        },
        success : function(data) {
          //create bubble notification
          if(data.length <= 0) {
            
          }else {
            
            devtrac.indexedDB.addQuestionsData(db, data).then(function(){
              
              d.resolve("Questions");
            }).fail(function(e) {
              
              d.resolve();
            });
          }
          
        }
      });
      return d;
      
    }
} 
