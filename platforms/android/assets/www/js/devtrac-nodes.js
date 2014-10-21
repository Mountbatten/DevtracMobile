var devtracnodes = {
    
    updateNode: function(nid, node, siteid) {
      var d = $.Deferred();
      var updates = {};
      console.log("updates for node "+node);
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
      
      $.ajax({
        url: localStorage.appurl+"/api/node.json",
        type: 'post',
        data: node,
        //data: "node[title]=test70&node[status]=1&node[type]=ftritem&node[uid]=314&node[taxonomy_vocabulary_7][und][tid]=209&node[field_ftritem_date_visited][und][0][value][date]=29/04/2014&node[field_ftritem_public_summary][und][0][value]=Check for sanitation and hygiene at food service points&node[field_ftritem_narrative][und][0][value]=Compile statistics of cleanliness&node[field_ftritem_field_trip][und][0][target_id]=Inspect the Warehouses(14065)&node[field_ftritem_place][und][0][target_id]=Amuru(14066)&node[field_ftritem_images][0][fid]=7895",
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
    postComments: function(commentId) {
      var d = $.Deferred();
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.getAllComments(db, function (comments) {
          if(comments.length > 0){
            for (var comment in comments) {
              comments[comment]['nid'] = commentId['nid'];
              
              var info = {
                  
                  'node_type': 'comment_node_actionitem',
                  "subject": "<p>Some body text</p>",
                  "language": "und",
                  "taxonomy_vocabulary_8": { "und": { "tid": "328" } },
                  "nid": commentId,
                  
                  "uid": localStorage.uid,
                  "format": 1,
                  "status": '1',
                  "comment_body": { "und": {0 : { "value": "<p>Some body text</p>", "format": '1' }}},
                  "field_actionitem_status": { "und": { "value": '1' }}
                  
              }
              
              $.ajax({
                url: localStorage.appurl+"/api/comment",
                type: 'post',
                data: info,
                headers: {'X-CSRF-Token': localStorage.usertoken},
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                  console.log('error '+errorThrown);
                  d.reject();
                },
                success: function (data) {
                  console.log('Comments upload success');
                  d.resolve();
                }
              });
            } 
          }else{
            d.reject();
          }
          
        });
      });
      return d;
    },
    
    //upload action items
    uploadActionItems: function(actionitems, nodeStatus, callback){
      
      var nodestring = {};
      var jsonstring;
      
      if(actionitems.length > 0) {
        
        if(actionitems[0]['submit'] == 0 && actionitems[0]['user-added'] == true) {
          delete actionitems[0]['submit'];
          localStorage.currentanid = actionitems[0]['nid'];
          
          devtracnodes.getActionItemString(actionitems[0], "", function(jsonstring, anid) {
            console.log("Action item string is "+jsonstring);
            devtracnodes.postNode(jsonstring, 0, actionitems.length, anid).then(function(updates, status, anid) {
              
              updates['fresh_nid'] = updates['nid'];
              nodeStatus['actionitems'][actionitems[0]['nid']]['nid'] = updates['fresh_nid'];
              
              actionitems.splice(0,1);
              devtracnodes.uploadActionItems(actionitems, nodeStatus, callback);
              
              devtracnodes.postComments(updates).then(function() {
                
                
              }).fail(function(){
                
                
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
            
            if(locations[location]['submit'] == 0 && locations[location]['user-added'] == true) {              
              user_locations.push(locations[location]);
            }
            
          }
          
          if(user_locations.length > 0) {
            d.resolve(user_locations, db);  
          }else{
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
          
          for(var ftritem in ftritems) {
            
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
        for(var loc in locs) {
          
          if(locs[loc]['submit'] == 0 && locs[loc]['user-added'] == true) {              
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
        
        for(var ftritem in ftritems) {
          
          if((ftritems[ftritem]['submit'] == 0 && ftritems[ftritem]['user-added'] == true ) || ftritems[ftritem]['editflag'] == 1) {              
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
      console.log("counting oecds");
      devtrac.indexedDB.open(function (db) {
        devtrac.indexedDB.countTaxonomyItems(db, "oecdobj",function(tripsy) {
          
          if(tripsy.length > 0) {
            console.log("found oecds "+tripsy.length);
            d.resolve();  
          }else
          {
            console.log("not found oecds "+tripsy.length);
            d.reject();
          }
          
        });  
        
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
      
      var pnid = 0;
      
      devtracnodes.getLocations().then(function(locs, db){
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
          
          devtracnodes.getLocationString(locs[mark]).then(function(jsonstring, pnid, loc_title) {
            
            poststrings.push(jsonstring);
            posttitle.push(loc_title);
            postids.push(pnid);
            
          }); 
        }
        
        if(end_location_loop == poststrings.length) {
          d.resolve(poststrings, posttitle, postids);
        }
        
        
      }).fail(function(){
        d.reject();
      });
      
      return d;
    },
    
    postLocationHelper: function(newlocationids, newlocationnames, oldlocationids, postStrings, titlearray, oldpnids, upNodes, callback){
      
      var oldids = oldlocationids;
      if(postStrings.length > 0) {
        devtracnodes.postNode(postStrings[0], oldlocationids, titlearray).then(function(updates, id, location_title) {
          if(updates['nid'] != undefined || updates['nid'] != null) {
            newlocationnames.push(titlearray[0]);
            newlocationids.push(updates['nid']);
            oldids.push(oldpnids[0]);
            
            upNodes['locations'][oldpnids[0]] = updates['nid'];
          }
          
          titlearray.splice(0, 1);
          postStrings.splice(0, 1);
          
          updates['fresh_nid'] = updates['nid'];
          var newlocationid = {};
          newlocationid['fresh_nid'] = updates['fresh_nid'];
          
          devtrac.indexedDB.open(function (db) {
            /*todo*/
            devtrac.indexedDB.editPlace(db, oldpnids[0], newlocationid).then(function(pid) {
              
              oldpnids.splice(0, 1);
              devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, callback);
              
              
            });
            
          });
          
        }).fail(function(e) {
          if(e == "Unauthorized: CSRF validation failed" || e == "Unauthorized") {
            auth.getToken().then(function(token) {
              localStorage.usertoken = token;
              devtracnodes.postLocationHelper(newlocationids, newlocationnames, oldids, postStrings, titlearray, oldpnids, upNodes, callback);
            });  
          }else
          {
            callback(e, "", "");
          }
          
        });
        
      }else
      {
        callback(newlocationnames, newlocationids, oldids, upNodes);
      }
      
    },
    
    //recursive node update for all images
    updateNodeHelper: function (ftrid, y, fd, names, sdate, upId, callback) {
      var pack = "node[field_ftritem_images][und]["+y+"][fid]="+fd[y]+"&node[field_ftritem_images][und]["+y+"][title]="+names[y]+"&node[field_ftritem_date_visited][und][0][value][date]="+sdate;
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
      
      devtracnodes.postImageFile(imagearr, index, nid).then(function (fd, imagename, ftrid) {
        if(ftritemType.indexOf('road') != -1){
          upNodes['roadside'][imagearr['nid']][imagearr['names'][index]] = fd;
        }else {
          upNodes['sitevisits'][imagearr['nid']][imagearr['names'][index]] = fd;  
        }
        
        index = index + 1;
        fds.push(fd);
        fdn.push(imagename);
        //fds, fdn, ftrid, ftrdate, updateId
        if(parseInt(index, 10) === parseInt(imagearr['base64s'].length, 10)){
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
      
    },
    
    //create node
    postImageFile: function(images, index, nid) {
      var d = $.Deferred();
      
    //if device runs kitkat android 4.4 use plugin to access image files
      if(images['kitkat']) {
        var parsedImage = images['base64s'][index];
      }else{
        var parsedImage = images['base64s'][index].substring(images['base64s'][index].indexOf(",")+1);  
      }
      
      var filedata = {
          "file": {
            "file": parsedImage,
            "filename": images['names'][index],
            "filepath":"public://"+images['names'][index],
          }
      };
      
      console.log("image is "+parsedImage);
      
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
          devtracnodes.getSitevisitString(sitevisits[0]).then(function(jsonstring, active_sitereport, date, siteid) {
            devtracnodes.postNode(jsonstring, active_sitereport, date, siteid).then(function(updates, x, y, z, active_ftritem, datevisited) {
              devtrac.indexedDB.getImage(db, parseInt(active_ftritem['nid']), updates['nid'], datevisited, y).then(function(image, nid, vdate, sid) {
                
                var indx = 0;
                var imageid = [];
                var imagename = [];
                
                for(var y = 0; y < image['names'].length; y++) {
                  nodeStatus['roadside'][sitevisits[0]['nid']][image['names'][y]] = "";  
                }
                
                devtracnodes.imagehelper(nid, indx, imageid, imagename, image, vdate, sid, "road", nodeStatus, function(fds, fdn, ftrid, ftrdate, updateId, uploadStatus) {
                  
                  if(fdn == "error") {
                    callback(fds, "error")
                  }else{
                    
                    var y = 0;
                    devtracnodes.updateNodeHelper(ftrid, y, fds, fdn, ftrdate, updateId, function(updates, ftritemid, activeid) {
                      newsitevisits[ftritemid] = sitevisits[0]['title'];
                      updates['fresh_nid'] = ftritemid;
                      
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
          devtracnodes.getSitevisitString(sitevisits[0]).then(function(jsonstring, active_sitereport, date, siteid) {
            devtrac.indexedDB.open(function (db) {
              
              devtracnodes.updateNode(siteid, jsonstring).then(function(updates, ftritemid, sid) {
                nodeStatus['roadside'][sitevisits[0]['nid']]['nid'] = updates['nid'];
                nodeStatus['roadside'][sitevisits[0]['nid']]['edit'] = true;
                
                newsitevisits[ftritemid] = sitevisits[0]['title'];
                
                sitevisits.splice(0, 1);
                
                devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, callback);
                
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
      
      devtracnodes.loopFtritems(names, newnids, oldnids, db, ftritems, idstore).then(function(sitevisits, ids) {
        d.resolve(names, newnids, oldnids, sitevisits);
        
      });  
      
      return d;
    },
    
    //get individual site visits
    loopFtritems: function(names, newnids, oldids, db, sitev, idcontainer, uNodes) {
      var d = $.Deferred();
      var sitevisits = sitev;
      
      var idcontainer = idcontainer;
      
      devtrac.indexedDB.getSitevisitBypnid(db, parseInt(oldids[0])).then(function(sitevisit) {
        idcontainer.push(oldids[0]);
        
        oldids.splice(0, 1);
        sitevisits.push(sitevisit);
        if(oldids.length > 0) {
          devtracnodes.loopFtritems(names, newnids, oldids, db, sitevisits, idcontainer).then(function(sitevisit, idstore) {
            d.resolve(sitevisit, idstore);
          });
        }else{
          d.resolve(sitevisits, idcontainer, uNodes);
        }
      });
      
      return d;
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
      
      for(var nodeType in syncData) {
        switch(nodeType) {
          case 'actionitems':
            if(controller.sizeme(syncData[nodeType]) > 0) {
              for(var actionitem in syncData[nodeType]) {
                if(controller.sizeme(syncData[nodeType][actionitem]) > 0) {
                  var updates = {};
                  updates['nid'] = syncData[nodeType][actionitem]['nid'];
                  updates['submit'] = 1;
                  
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.editActionitem(db, parseInt(actionitem), updates).then(function() {
                      var count_container = $("#actionitem_count").html().split(" ");
                      var updated_count = parseInt(count_container[0]) - 1;
                      $("#actionitem_count").html(updated_count);
                      
                      $.unblockUI({ 
                        onUnblock: function() {
                          document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                        }
                      
                      });
                      
                    });           
                  }); 
                }else {
                  controller.loadingMsg("Actionitems Sync Error; Please re-upload.", 2000);
                }                
              }  
            }else{
              $.unblockUI({ 
                onUnblock: function() {
                  document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                }
              
              });
            }
            
            break;
          case 'locations':
            if(controller.sizeme(syncData[nodeType]) > 0) {
              for(var location in syncData[nodeType]) {
                var updates = {};
                updates['nid'] = syncData[nodeType][location]['nid'];
                updates['submit'] = 1;
                
                if(syncData[nodeType][location] != "") {
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.editPlace(db, parseInt(location), updates).then(function() {
                      var count_container = $("#location_count").html().split(" ");
                      var updated_count = parseInt(count_container[0]) - 1;
                      $("#location_count").html(updated_count);
                      
                      $.unblockUI({ 
                        onUnblock: function() {
                          document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                        }
                      
                      });
                      
                    });   
                    
                  });
                }else {
                  controller.loadingMsg("Location Sync Error; Please re-upload.", 2000);
                  
                }
              }
              
            } else{
              $.unblockUI({ 
                onUnblock: function() {
                  document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                }
              
              });
            }
            break;
          case 'sitevisits':
            if(controller.sizeme(syncData[nodeType]) > 0) {
              for(var sitevisit in syncData[nodeType]) {
                if(controller.sizeme(syncData[nodeType][sitevisit]) > 0) {
                  var updates = {};
                  updates['fresh_nid'] = parseInt(syncData[nodeType][sitevisit]['nid']);
                  updates['submit'] = 1;
                  updates['editflag'] = 0;
                  
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.editSitevisit(db, parseInt(sitevisit), updates).then(function() {
                      var count_container = $("#sitevisit_count").html().split(" ");
                      if(typeof parseInt(count_container[0]) == "number") {
                        var updated_count = parseInt(count_container[0]) - 1;
                        $("#sitevisit_count").html(updated_count);
                      }
                      else
                      {                      
                        $("#sitevisit_count").html(0);
                      }
                      
                      $.unblockUI({ 
                        onUnblock: function() {
                          document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                        }
                      
                      });
                      
                    }); 
                    
                  });  
                } else {
                  controller.loadingMsg("Site visits Sync Error; Please re-upload.", 2000);
                } 
                
              }
            }else {
              $.unblockUI({ 
                onUnblock: function() {
                  document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                }
              
              });
            }
            break;
          case 'roadside':
            if(controller.sizeme(syncData[nodeType]) > 0) {
              for(var roadsidevisit in syncData[nodeType]) {
                if(syncData[nodeType][roadsidevisit]['nid'] != "" && syncData[nodeType][roadsidevisit]['nid'] != undefined) {
                  var updates = {};
                  updates['fresh_nid'] = parseInt(syncData[nodeType][roadsidevisit]['nid']);
                  updates['submit'] = 1;
                  updates['editflag'] = 0;
                  
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.editSitevisit(db, parseInt(roadsidevisit), updates).then(function() {
                      var count_container = $("#sitevisit_count").html().split(" ");
                      if(typeof parseInt(count_container[0]) == "number") {
                        var updated_count = parseInt(count_container[0]) - 1;
                        $("#sitevisit_count").html(updated_count);
                      }
                      else
                      {                      
                        $("#sitevisit_count").html(0);
                      }
                      
                      $.unblockUI({ 
                        onUnblock: function() {
                          document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                        }
                      
                      });
                      
                    }); 
                    
                  });  
                } else{
                  controller.loadingMsg("Roadside visits Sync Error; Please re-upload.", 2000);
                } 
                
              }
            }else {
              $.unblockUI({ 
                onUnblock: function() {
                  document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                }
              
              });
            }
            
            break;
          case 'fieldtrip':
            
            if(controller.sizeme(syncData[nodeType]) > 0) {
              for(var fieldtrip in syncData[nodeType]) {
                if(syncData[nodeType][fieldtrip]['nid'] != "" && syncData[nodeType][fieldtrip]['nid'] != undefined) {
                  var updates = {};
                  updates['fresh_nid'] = parseInt(syncData[nodeType][fieldtrip]['nid']);
                  updates['submit'] = 1;
                  updates['editflag'] = 0;
                  
                  devtrac.indexedDB.open(function (db) {
                    devtrac.indexedDB.editFieldtrip(db, localStorage.currentfnid, updates).then(function() {
                      var count_container = $("#fieldtrip_count").html().split(" ");
                      var updated_count = parseInt(count_container[0]) - 1;
                      $("#fieldtrip_count").html(updated_count);
                      
                      $.unblockUI({ 
                        onUnblock: function() {
                          document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                        }
                      
                      });
                      
                    });
                    
                  });  
                } else{
                  controller.loadingMsg("Fieldtrip Sync was interrupted; Please re-upload.", 2000);
                } 
                
              }
            }else {
              $.unblockUI({ 
                onUnblock: function() {
                  document.removeEventListener("backbutton", controller.onBackKeyDown, false);
                }
              
              });
            }
            
            break;
          default:
            break;
        }
      }
    },
    
    syncSitevisits: function(ftritemdetails, ftritems_locs, nodeStatus) {
      var ftritems = false;
      var nodeStatus = nodeStatus;
      
      if(parseInt($("#sitevisit_count").html()) > 0) {
        //upload site visits road side observations
        devtracnodes.checkSitevisits().then(function(sitevisits) { 
          
          for(var r = 0; r < sitevisits.length; r++) {
            nodeStatus['roadside'][sitevisits[r]['nid']] = {};
          }
          
          devtrac.indexedDB.open(function (db) {
            var newsitevisits = [];
            devtracnodes.uploadsitevisits(db, sitevisits, newsitevisits, nodeStatus, function(uploadedftritems, state) {
              if(state == "error"){
                controller.loadingMsg(uploadedftritems, 3000);
                
              }else{
                ftritems = true;
                controller.loadingMsg("Finished Syncing Roadside Sitevisits ...", 0);
                
                for(var k in ftritemdetails) {
                  uploadedftritems[k] = ftritemdetails[k];
                }
                
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
        
      }else{
        ftritems = true;
        if(ftritems_locs = true && ftritems == true){
          devtracnodes.syncActionitems(ftritems, nodeStatus);
          
        }
        
      }
      
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
          
          if(fieldtrips == true && actionitems == true) {
            devtracnodes.updateSyncData(status);
            
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              } 
            });
          }
          
        }).fail(function(status, e){
          controller.loadingMsg("Fieldtrips "+e, 0);
          
          fieldtrips = true;
          if(fieldtrips == true && actionitems == true){
            devtracnodes.updateSyncData(nodeStatus);
            $.unblockUI({ 
              onUnblock: function() {
                document.removeEventListener("backbutton", controller.onBackKeyDown, false);
              }
            
            });
            
          }
          
        });  
        
      }else{
        fieldtrips = true;
        if(fieldtrips == true && actionitems == true) {
          devtracnodes.updateSyncData(nodeStatus);
          
        }
      }
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
        
        if(parseInt($("#location_count").html()) > 0 || parseInt($("#sitevisit_count").html()) > 0 || parseInt($("#actionitem_count").html()) > 0 || parseInt($("#fieldtrip_count").html()) > 0) {
          //Register the event listener to disable native back button
          document.addEventListener("backbutton", controller.onBackKeyDown, false);
          
          controller.loadingMsg("Syncing, Please Wait...", 0);
          
          if(parseInt($("#location_count").html()) > 0) {
            
            //upload locations and sitevisits (human interest stories and site visits)
            devtracnodes.uploadLocations().then(function(postarray, titlearray, pnid) {
              
              var newlocationnames = [];
              var newlocation_nids = [];
              var oldlocation_nids = [];
              
              //initialize array with old ids for sitevisits and locations
              for(var x = 0; x < pnid.length; x++) {
                uploadedNodes['locations'][pnid[x]] = "";
              }
              
              devtracnodes.postLocationHelper(newlocation_nids, newlocationnames, oldlocation_nids, postarray, titlearray, pnid, uploadedNodes, function(newnames, newids, oldids, upNodes){
                
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
                
              });
              
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
        devtracnodes.getSitevisitString(sitevisits[0], names[0], newnids[0]).then(function(jsonstring, p, q, r, mark) {
          console.log("sitevisit string is "+jsonstring);
          devtracnodes.postNode(jsonstring, mark, sitevisits.length, r).then(function(updates, stat, snid) {
            //upNodes['sitevisits'][sitevisits[0]['nid']] = updates['nid'];
            
            devtrac.indexedDB.open(function (db) {
              devtrac.indexedDB.getImage(db, sitevisits[0]['nid'], updates['nid']).then(function(image, ftritemid) {
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
                        
                        /*todo*/ 
                        devtrac.indexedDB.editSitevisit(db, parseInt(sitevisits[0]['nid']), newsiteid).then(function() {
                          
                          upNodes2['sitevisits'][sitevisits[0]['nid']]['nid'] = ftritemid;
                          ftritemdetails[updates['nid']] =  sitevisits[0]['title'];
                          sitevisits.splice(0, 1);
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
                /*todo*/ 
                devtrac.indexedDB.editSitevisit(db, sitevisits[0]['nid'], updates).then(function() {
                  
                  upNodes['sitevisits'][sitevisits[0]['nid']]['nid'] = updates['nid'];
                  
                  ftritemdetails[updates['nid']] =  sitevisits[0]['title'];
                  sitevisits.splice(0, 1);
                  
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
      
      //delete aObj['dbsavetime'];
      delete aObj['submit'];
      delete aObj['editflag'];
      delete aObj['field_actionitem_ftreportitem'];
      
      var nodestring = '';
      for(var a in aObj) {
        if(typeof aObj[a] == 'object') {
          switch(a) {
            case 'taxonomy_vocabulary_7': 
              nodestring = nodestring + a+'[und][tid]='+aObj[a]['und'][0]['tid']+'&';
              break;
            case 'field_ftritem_public_summary': 
              nodestring = nodestring +a+'[und][0][value]='+aObj[a]['und'][0]['value']+'&';
              break;
            case 'field_ftritem_narrative':
              nodestring = nodestring +a+'[und][0][value]='+aObj[a]['und'][0]['value']+'&';
              break;
            case 'field_ftritem_field_trip':
              nodestring = nodestring +a+'[und][0][target_id]='+localStorage.ftitle+"("+aObj[a]['und'][0]['target_id']+")"+'&';
              break;
            case 'field_ftritem_date_visited':
              var duedate = null;
              if(aObj['user-added'] && aObj[a]['und'][0]['value'].indexOf('/') != -1) {
                var dateparts = aObj[a]['und'][0]['value'].split('/');
                duedate = dateparts[2]+'/'+dateparts[1]+'/'+dateparts[0];
                
              }else{
                var sitedate = aObj[a]['und'][0]['value'];
                
                var sitedatestring = JSON.stringify(sitedate);
                var sitedateonly = sitedatestring.substring(1, sitedatestring.indexOf('T'));
                var sitedatearray = sitedateonly.split("-");
                
                duedate =  sitedatearray[2] + "/" + sitedatearray[1] + "/" + sitedatearray[0];
                
              }
              
              visited_date = duedate;
              localStorage.visiteddate = visited_date; 
              
              nodestring = nodestring +a+'[und][0][value][date]='+duedate+'&';
              
              break;
            case 'field_ftritem_place':
              if(placename != undefined && placename != null){
                nodestring = nodestring +a+'[und][0][target_id]='+placename+"("+placeid+")"+'&';
              }
              
              break;
              
            case 'field_ftritem_lat_long':
              nodestring = nodestring +a+'[und][0][geom]='+aObj[a]['und'][0]['geom']+'&';
              break;
              
              /*case 'field_ftritem_images':
            nodestring = nodestring + a+'[und][0][fid]='+imageObj['fid']+'&['+a+'][und][0][title]='+imageObj['title']+'&';
            break;*/
              
            default :
              break
          }
        }
        else {
          if(a != 'user-added' && a != 'image' && a != "nid" && a != "ftritem_place") {
            nodestring = nodestring +a+'='+aObj[a]+"&";  
          }
        }
      }
      var nodestringlen = nodestring.length;
      var newnodestring = nodestring.substring(0, nodestringlen - 1);
      
      d.resolve(newnodestring, sitevisit_backup, visited_date, aObj['nid'], index);
      
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
    getLocationString: function(pObj) {
      var d = $.Deferred();
      
      var nodestring = '';
      for(var p in pObj) {
        if(typeof pObj[p] == 'object') {
          switch(p) {
            case 'field_place_responsible_website': 
              nodestring = nodestring + 'node['+p+'][und][0][url]='+pObj[p]['und'][0]['url']+'&';
              break;
            case 'field_place_responsible_email': 
              nodestring = nodestring + 'node['+p+'][und][0][email]='+pObj[p]['und'][0]['email']+'&';
              break;
            case 'field_place_responsible_phone': 
              nodestring = nodestring + 'node['+p+'][und][0][value]='+pObj[p]['und'][0]['value']+'&';
              break;
            case 'field_place_responsible_person': 
              nodestring = nodestring + 'node['+p+'][und][0][value]='+pObj[p]['und'][0]['value']+'&';
              break;
            case 'field_place_lat_long': 
              nodestring = nodestring + 'node['+p+'][und][0][geom]='+pObj[p]['und'][0]['geom']+'&';
              break;
            case 'taxonomy_vocabulary_6':
              nodestring = nodestring + 'node['+p+'][und][tid]='+pObj[p]['und'][0]['tid']+'&';
              break;
            case 'taxonomy_vocabulary_1':
              nodestring = nodestring + 'node['+p+'][und][tid]='+pObj[p]['und'][0]['tid']+'&';
              break;
            default :
              break
          }
        }
        else{
          if(p != 'user-added' || p != 'nid') {
            nodestring = nodestring + 'node['+p+']='+pObj[p]+"&";  
          }
          
        }
      }
      var nodestringlen = nodestring.length;
      var newnodestring = nodestring.substring(0, nodestringlen - 1);
      
      d.resolve(newnodestring, pObj['nid'], pObj['title']);
      
      return d;
      
    },
    
    //return action item string
    getActionItemString: function(aObj, nodestring, callback) {
      
      if(aObj.hasOwnProperty('field_actionitem_severity')){
        nodestring = nodestring + 'node[field_actionitem_severity][und][value]='+aObj['field_actionitem_severity']['und'][0]['value']+'&';
        delete aObj['field_actionitem_severity'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_resp_place')) {
        if(aObj['has_location'] == true) {
          var pid = aObj['field_actionitem_resp_place']['und'][0]['target_id'];
          var locationtype = aObj['loctype'];
          if(locationtype.indexOf('user_added') != -1) {
            pid = parseInt(pid);
          }
          
          devtrac.indexedDB.open(function (db) {
            devtrac.indexedDB.getPlace(db, pid, function(place) {
              
              if(place['fresh_nid'] == undefined){
                nodestring = nodestring + 'node[field_actionitem_resp_place][und][0][target_id]='+place['title']+"("+place['nid']+")"+'&';  
              }
              else{
                nodestring = nodestring + 'node[field_actionitem_resp_place][und][0][target_id]='+place['title']+"("+place['fresh_nid']+")"+'&';
              }
              delete aObj['field_actionitem_resp_place'];
              
              devtracnodes.getActionItemString(aObj, nodestring, callback);
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
            if(sitevisit['fresh_nid'] == undefined){
              nodestring = nodestring + 'node[field_actionitem_ftreportitem][und][0][target_id]='+sitevisit['title']+"("+sitevisit['nid']+")"+'&';  
            }
            else{
              nodestring = nodestring + 'node[field_actionitem_ftreportitem][und][0][target_id]='+sitevisit['title']+"("+sitevisit['fresh_nid']+")"+'&';
            }
            delete aObj['field_actionitem_ftreportitem'];
            
            devtracnodes.getActionItemString(aObj, nodestring, callback);
          });
          
        });
        
        
      }else if(aObj.hasOwnProperty('field_actionitem_followuptask')) {
        nodestring = nodestring + 'node[field_actionitem_followuptask][und][0][value]='+aObj['field_actionitem_followuptask']['und'][0]['value']+'&';
        delete aObj['field_actionitem_followuptask'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('taxonomy_vocabulary_8')) {
        nodestring = nodestring + 'node[taxonomy_vocabulary_8][und][tid]='+aObj['taxonomy_vocabulary_8']['und'][0]['tid']+'&';
        delete aObj['taxonomy_vocabulary_8'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
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
        
        nodestring = nodestring + 'node[field_actionitem_due_date][und][0][value][date]='+duedate+'&';
        delete aObj['field_actionitem_due_date'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_status')) {
        
        nodestring = nodestring + 'node[field_actionitem_status][und][value]='+aObj['field_actionitem_status']['und'][0]['value']+'&';
        delete aObj['field_actionitem_status'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('field_actionitem_responsible')) {
        
        nodestring = nodestring + 'node[field_actionitem_responsible][und][0][target_id]='+aObj['field_actionitem_responsible']['und'][0]['target_id']+'&';
        delete aObj['field_actionitem_responsible'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('type')) {
        
        nodestring = nodestring + 'node[type]='+aObj['type']+"&";
        delete aObj['type'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('title')) {
        
        nodestring = nodestring + 'node[title]='+aObj['title']+"&";
        delete aObj['title'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else if(aObj.hasOwnProperty('uid')) {
        
        nodestring = nodestring + 'node[uid]='+aObj['uid'];
        delete aObj['uid'];
        
        devtracnodes.getActionItemString(aObj, nodestring, callback);
        
      }else{
        console.log("actionitem callback "+nodestring);
        callback(nodestring, aObj['nid']);  
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
                //create bubble notification
                if(data.length <= 0) {
                  callback();
                }else{
                  
                  devtracnodes.saveSiteVisit(db, data, function() {
                    callback();
                  });
                  
                }
                
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
      
      devtrac.indexedDB.getAllFieldtripItems(db, function(fnid){
        for(var key in fnid){
          $.ajax({
            url : localStorage.appurl+"/api/views/api_fieldtrips.json?display_id=actionitems&args[nid]="+fnid[key]['nid']+"&filters[field_actionitem_status_value][]=1&filters[field_actionitem_status_value][]=3",
            type : 'get',
            dataType : 'json',
            error : function(XMLHttpRequest, textStatus, errorThrown) { 
              
              console.log('actionitems error '+XMLHttpRequest.responseText);
              d.reject(errorThrown);
            },
            success : function(data) {
              //create bubble notification
              if(data.length <= 0) {
                
              }else{
                data[0]['submit'] = 0;
                devtracnodes.saveActionItems(db, data, 0).then(function(){
                  d.resolve("Action Items");
                });
              }
            }
          });
        }
      });
      return d;
      
    },
    
    saveActionItems: function(db, data, count) {
      var d = $.Deferred();
      var arrlength = data.length;
      var counter = count;
      
      if(counter != arrlength) {
        devtrac.indexedDB.addActionItemsData(db, data[counter]);
        counter = counter + 1;
        devtracnodes.saveActionItems(db, data, counter); 
      }
      else {
        d.resolve();
      }
      return d;
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
    
    /*    saveSitetypes: function(db, data, callback) {
      console.log("inside save site types "+data.length);
      console.log("One site type is "+data[0]);
      var arrlength = data.length;
      
      if(arrlength > 0 && data[0] != undefined && data[0] != null) {
        devtrac.indexedDB.addSitereporttypes(db, data[0]).then(function(){
          data.shift();
          devtracnodes.saveSitetypes(db, data, callback);  
        });
        
      }
      else {
        callback();
      }
      
    },*/
    
    //Returns devtrac places json list 
    downloadPlaces: function(db, snid) {
      $.ajax({
        url : localStorage.appurl+"/api/views/api_fieldtrips.json?display_id=place&filters[nid]="+snid,
        type : 'get',
        dataType : 'json',
        error : function(XMLHttpRequest, textStatus, errorThrown) { 
          //console.log("Error location "+errorThrown);
          $.unblockUI({ 
            onUnblock: function() {
              document.removeEventListener("backbutton", controller.onBackKeyDown, false);
            }
          
          });
        },
        success : function(data) {
          //console.log("Downloaded location "+data[0]['title']);
          
          //create bubble notification
          if(data.length <= 0) {
            
          }else {
            
            for(var item in data){
              devtrac.indexedDB.addPlacesData(db, data[item]).then(function(){
                
                controller.loadingMsg("Places Saved",1000);
                
              });
            }
            
          }
          
        }
      });
    },
    
    //
    getPlaces: function(db) {
      devtrac.indexedDB.getAllSitevisits(db, function(snid){
        if(snid.length > 0) {
          for(var k in snid) {
            if(snid[k]['fresh_nid'] != undefined) {
              devtracnodes.downloadPlaces(db, snid[k]['fresh_nid']);
            }else {
              devtracnodes.downloadPlaces(db, snid[k]['nid']);
            }
          }
        }
      });
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
