var devtrac = {};
devtrac.indexedDB = {};

//open database
devtrac.indexedDB.db = null;

devtrac.indexedDBopen = function(callback) {

  var version = 7;
  var request = indexedDB.open("f1", version);
  
  request.onsuccess = function(e) {
    devtrac.indexedDB.db = e.target.result;
    callback(devtrac.indexedDB.db);
    // Do some more stuff in a minute
  };
  request.onerror = devtrac.indexedDB.onerror;
};

//creating an object store
devtrac.indexedDB.open = function(callback) {

  var version = 7;
  var request = indexedDB.open("f1", version);

  // We can only create Object stores in a versionchange transaction.
  request.onupgradeneeded = function(e) {
    var db = e.target.result;
    // A versionchange transaction is started automatically.
    e.target.transaction.onerror = devtrac.indexedDB.onerror;

    if(db.objectStoreNames.contains("oecdobj")){
      db.deleteObjectStore("oecdobj");
    }
    if(db.objectStoreNames.contains("placetype")){
      db.deleteObjectStore("placetype");
    }
    if(db.objectStoreNames.contains("sitevisit")){
      db.deleteObjectStore("sitevisit");
    }
    if(db.objectStoreNames.contains("actionitemsobj")){
      db.deleteObjectStore("actionitemsobj");
    }
    if(db.objectStoreNames.contains("fieldtripobj")){
      db.deleteObjectStore("fieldtripobj");
    }
    if(db.objectStoreNames.contains("placesitemsobj")){
      db.deleteObjectStore("placesitemsobj");
    }
    if(db.objectStoreNames.contains("qtnsitemsobj")){
      db.deleteObjectStore("qtnsitemsobj");
    }
    if(db.objectStoreNames.contains("qtionairesitemsobj")){
      db.deleteObjectStore("qtionairesitemsobj");
    }
    if(db.objectStoreNames.contains("commentsitemsobj")){
      db.deleteObjectStore("commentsitemsobj");
    }
    if(db.objectStoreNames.contains("images")){
      db.deleteObjectStore("images");
    }
    if(db.objectStoreNames.contains("sublocations")){
      db.deleteObjectStore("sublocations");
    }

    var store = db.createObjectStore("oecdobj", {autoIncrement: true});
    
    var placetypesstore = db.createObjectStore("placetype", {autoIncrement: true});

    var fieldtripstore = db.createObjectStore("fieldtripobj", {keyPath: "nid"});
    fieldtripstore.createIndex('nid', 'nid', { unique: true });

    var sitevisitstore = db.createObjectStore("sitevisit", {keyPath: "nid"});
    sitevisitstore.createIndex('nid', 'nid', { unique: true });

    var actionitemstore = db.createObjectStore("actionitemsobj", {keyPath: "nid"});
    actionitemstore.createIndex('nid', 'nid', { unique: true });    

    var placesitemstore = db.createObjectStore("placesitemsobj", {keyPath: "nid"});
    placesitemstore.createIndex('nid', 'nid', { unique: true });

    var qtnsitemstore = db.createObjectStore("qtnsitemsobj", {keyPath: "nid"});
    qtnsitemstore.createIndex('nid', 'nid', { unique: true });

    var qtnairesitemstore = db.createObjectStore("qtionairesitemsobj", {keyPath: "qnid"});
    qtnairesitemstore.createIndex('qnid', 'qnid', { unique: true });

    var commentsitemstore = db.createObjectStore("commentsitemsobj", {autoIncrement: true});
    commentsitemstore.createIndex('nid', 'nid', { unique: false });
    
    var images = db.createObjectStore("images", {keyPath: "nid"});
    images.createIndex('nid', 'nid', { unique: true });
    
    var submittedlocations = db.createObjectStore("sublocations", {keyPath: "nid"});
    submittedlocations.createIndex('nid', 'nid', { unique: true });
    
  };

  request.onsuccess = function(e) {
    devtrac.indexedDB.db = e.target.result;
    callback(devtrac.indexedDB.db);
  };

  request.onerror = devtrac.indexedDB.onerror;
};

//adding taxonomy data to object store
devtrac.indexedDB.addTaxonomyData = function(db, storename, pObj) {
  var d = $.Deferred();
  var trans = db.transaction(storename, "readwrite");
  var store = trans.objectStore(storename);
  var request;

  if(pObj.length > 0) {
    for (var i in pObj) {
      request = store.add({
        "hname": pObj[i]['parent name'],
        "htid": pObj[i]['parent term id'],
        "dname": pObj[i]['name'], 
        "weight": pObj[i]['weight'], 
        "tid": pObj[i]['term id']
      });
    }

    request.onsuccess = function(e) {
      console.log('we have saved the '+storename+' data');
      d.resolve();
    };

    request.onerror = function(e) {
      console.log(e.value);
      d.resolve();
    };
  }else{
    console.log("Server returned no "+storename);
    d.resolve();
  }
  return d;
};

//adding fieldtrips data to object store
devtrac.indexedDB.addFieldtripsData = function(db, fObj) {
  var d = $.Deferred();
  var trans = db.transaction("fieldtripobj", "readwrite");
  var store = trans.objectStore("fieldtripobj");
  var request;

  if(fObj.length > 0){
    for (var i in fObj) {
      request = store.add(fObj[i])
    }

    request.onsuccess = function(e) {
      d.resolve();
    };

    request.onerror = function(e) {
      d.reject(e);
    };
  }else{
    d.reject("No fieldtrips returned");
  }

  return d;
};


//adding uploaded locations data to object store
devtrac.indexedDB.addUploadedLocations = function(db, lObj) {
  var d = $.Deferred();
  var trans = db.transaction("sublocations", "readwrite");
  var store = trans.objectStore("sublocations");
  var request;

  if(lObj.length > 0){
    for (var i in lObj) {
      request = store.add(lObj[i])
    }

    request.onsuccess = function(e) {
      d.resolve();
    };

    request.onerror = function(e) {
      d.reject(e);
    };
  }else {
    d.reject("No locations returned");
  }

  return d;
};

//adding questions data to object store
devtrac.indexedDB.addQuestionsData = function(db, qObj) {
  var d = $.Deferred();
  var trans = db.transaction("qtnsitemsobj", "readwrite");
  var store = trans.objectStore("qtnsitemsobj");
  var request;

  if(qObj.length > 0){
    for (var i in qObj) {
      request = store.add(qObj[i])
    }

    request.onsuccess = function(e) {
      d.resolve();
    };

    request.onerror = function(e) {
      d.reject(e);
    };
  }else{
    d.reject("No Questions returned");
  }

  return d;
};

//adding sitevisits data to object store
devtrac.indexedDB.addSiteVisitsData = function(db, sObj) {
  var d = $.Deferred();
  var trans = db.transaction("sitevisit", "readwrite");
  var sitevisitstore = trans.objectStore("sitevisit");
  var sitevisitrequest;
  var timestamp = new Date().getTime();

  if(controller.sizeme(sObj) > 0 && sObj['title'] == undefined){
    for (var i in sObj) {
      if(!(sObj[i]['dbsavetime'] && sObj[i]['editflag'])){
        sObj[i]['dbsavetime'] = timestamp;
        sObj[i]['editflag'] = 0;
        
      }
      
      sitevisitrequest = sitevisitstore.add(sObj[i]);

    }

    sitevisitrequest.onsuccess = function(e) {
      console.log("added site visits");
      d.resolve();
    };

    sitevisitrequest.onerror = function(e) {
      console.log("error adding site visits");
      d.reject(e);
    };
  }else{
    console.log("title is "+sObj['title']);
    console.log("nid is "+sObj['nid']);
    
    if(!(sObj['dbsavetime'] && sObj['editflag'])){
      sObj['dbsavetime'] = timestamp;
      sObj['editflag'] = 0;
      
    }
    sitevisitrequest = sitevisitstore.add(sObj);

    sitevisitrequest.onsuccess = function(e) {
      console.log("added site visits");
      d.resolve();
    };

    sitevisitrequest.onerror = function(e) {
      console.log("error adding site visits "+e.target.error.message);
      d.reject(e);
    };

  }


  return d;
};

//adding site visit images to object store
devtrac.indexedDB.addImages = function(db, iObj) {
  var d = $.Deferred();
  var trans = db.transaction("images", "readwrite");
  var store = trans.objectStore("images");

  var request = store.add(iObj);

  request.onsuccess = function(e) {
    devtracnodes.notify("Images Saved");
    d.resolve();
  };

  request.onerror = function(e) {
    devtracnodes.notify("Images Not Saved");
    d.resolve(e);
  };

  return d;
};

//adding action items data to object store
devtrac.indexedDB.addActionItemsData = function(db, aObj) {
  var d = $.Deferred();
  var trans = db.transaction("actionitemsobj", "readwrite");
  var store = trans.objectStore("actionitemsobj");

  request = store.add(aObj);

  request.onsuccess = function(e) {
    devtracnodes.notify("Action Items Saved");
    d.resolve();
  };

  request.onerror = function(e) {
    if(e.target.error.message != "Key already exists in the object store." && e.target.error.message != undefined) {
      devtracnodes.notify("Action Items Error: "+e.target.error.message);
    }
    
    d.resolve(e);
  };

  return d;
};

//adding comments data to object store
devtrac.indexedDB.addCommentsData = function(db, cObj) {
  var d = $.Deferred();
  var trans = db.transaction("commentsitemsobj", "readwrite");
  var store = trans.objectStore("commentsitemsobj");
  var request;

  request = store.add(cObj);

  request.onsuccess = function(e) {
    d.resolve();
  };

  request.onerror = function(e) {
    d.reject(e);
  };

  return d;
};

//adding questions data to object store
devtrac.indexedDB.addSavedQuestions = function(db, aObj) {
  var d = $.Deferred();
  var trans = db.transaction("qtionairesitemsobj", "readwrite");
  var store = trans.objectStore("qtionairesitemsobj");
  var request;

  request = store.add(aObj);

  request.onsuccess = function(e) {
    d.resolve();
  };

  request.onerror = function(e) {
    d.reject(e);
  };

  return d;
};

//adding place data to object store
devtrac.indexedDB.addPlacesData = function(db, placeObj) {
  var d = $.Deferred();
  var trans = db.transaction("placesitemsobj", "readwrite");
  var store = trans.objectStore("placesitemsobj");
  var request;

  if(placeObj != undefined) {
    for (var i in placeObj) {
      request = store.add(placeObj[i]);
    }

    request.onsuccess = function(e) {
      d.resolve();
    };

    request.onerror = function(e) {
      d.reject(e);
    };
  }else {
    d.reject("No places returned");
  }
  return d;
};

//query taxonomy data from datastore
devtrac.indexedDB.getAllTaxonomyItems = function(db, storename, callback) {
  var trans = db.transaction([storename], "readonly");
  var store = trans.objectStore(storename);

  var categories = [];
  var categoryValues = []; 
  var category = "";
  var htid;
  var flag = false;
  var categoryflag = false;
  var keyval;

  var i = 0;

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(categoryValues, categories);
      return;
    }
    i = i + 1;

    if(category != result.value["hname"]) {
      category = result.value["hname"];
      
      /*for(var key in categories) {
        if(categories[key][name] == result.value["hname"]) {
          categoryflag = true;
          keyval = key;
          break;
        }else {
          continue;
        }
      }*/
      
/*      if(categoryflag) {
        var childname = result.value["dname"];
        var childobject = {keyval: {"name":childname, "level":2 }};
        categoryValues[keyval].push(childobject);
        
      }else{*/
      
        htid = result.value["htid"];
        var category_name = category;
        var category_object = {"name": category_name, "level": 0, "htid": htid};
        
        categories.push(category_object);

        /*for(var key in categoryValues) {
          if(categoryValues[key]['name'] == result.value["dname"]) {
            flag = true;
            break;
          }else {
            
            continue;
          }
        }*/

        //if(!flag) {
          var childname = result.value["dname"];
          var childId = result.value["tid"];
          var childobject = {"name":childname, "level": 1 , "tid": childId, "htid": htid };
          categoryValues.push(childobject);
         /* 
        }else {
          
          flag = false;
        }*/ 
      //}

    }else{
      var childname = result.value["dname"];
      var childId = result.value["tid"];
      var childobject = {"name":childname, "level":1 , "tid": childId, "htid": htid };
      categoryValues.push(childobject);
    }

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//get all fieldtrips in database
devtrac.indexedDB.getAllFieldtripItems = function(db, callback) {
  var fieldtrips = [];
  var trans = db.transaction(["fieldtripobj"], "readonly");
  var store = trans.objectStore("fieldtripobj");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(fieldtrips);
      return;
    }

    fieldtrips.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//get all questions in database
devtrac.indexedDB.getAllQuestionItems = function(db, ftritem, callback) {
  var qtns = [];
  var trans = db.transaction(["qtnsitemsobj"], "readonly");
  var store = trans.objectStore("qtnsitemsobj");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    
    if(!!result == false) {
      callback(qtns);
      return;
    }
    
    result["continue"]();
    
    if(ftritem['taxonomy_vocabulary_1'] != undefined) {
      //check for question to retrieve
      if(ftritem['taxonomy_vocabulary_1']['und'] != undefined && result.value.status == 1) {
        if(ftritem['taxonomy_vocabulary_1']['und'][0]['tid'] == result.value.taxonomy_vocabulary_1.und[0].tid) {
          qtns.push(result.value);
        }  
      }
      
    }
    
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//search fieldtrips using index of nid
devtrac.indexedDB.getFieldtrip = function(db, fnid, callback) {
  var fieldtrips = [];
  var trans = db.transaction(["fieldtripobj"], "readonly");
  var store = trans.objectStore("fieldtripobj");

  var index = store.index("nid");
  index.get(fnid).onsuccess = function(event) {
    callback(event.target.result);
  };

};

//get all sitevisits in database
devtrac.indexedDB.getAllSitevisits = function(db, callback) {
  var sitevisits = [];
  var trans = db.transaction(["sitevisit"], "readonly");
  var store = trans.objectStore("sitevisit");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(sitevisits);
      return;
    }

    sitevisits.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//search sitevisits using index of nid
devtrac.indexedDB.getSitevisit = function(db, snid) {
  var d = $.Deferred();
  var trans = db.transaction(["sitevisit"], "readonly");
  var store = trans.objectStore("sitevisit");
  //var ftritem = "";

  var index = store.index("nid");
  index.get(snid).onsuccess = function(event) {
    //callback(event.target.result);
    //d.resolve(event.target.result);
    ftritem = event.target.result;
  };
  
  trans.oncomplete = function(event) {
    d.resolve(ftritem);
  };
  
  trans.error = function(event) {
    //d.resolve(ftritem);
    console.log("get site visit error");
  };
  
  return d;
};

//search images using index of nid
devtrac.indexedDB.getImage = function(db, inid, newnid, vd, siteid) {
  var d = $.Deferred();
  var trans = db.transaction(["images"], "readonly");
  var store = trans.objectStore("images");

  var index = store.index("nid");
  index.get(inid).onsuccess = function(event) {
    d.resolve(event.target.result, newnid, vd, siteid);
  };
  return d;
};

//search action items 
devtrac.indexedDB.getActionItem = function(db, anid) {
  var d = $.Deferred();
  var trans = db.transaction(["actionitemsobj"], "readonly");
  var store = trans.objectStore("actionitemsobj");

  var index = store.index("nid");
  index.get(anid).onsuccess = function(event) {
    d.resolve(event.target.result);
  };

  return d;
};


//get all action items in database
devtrac.indexedDB.getAllActionitems = function(db, callback) {
  var actionitems = [];
  var trans = db.transaction(["actionitemsobj"], "readonly");
  var store = trans.objectStore("actionitemsobj");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(actionitems);
      return;
    }

    actionitems.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//get all user saved answers in database
devtrac.indexedDB.getAllSavedAnswers = function(db, callback) {
  var answers = [];
  var trans = db.transaction(["qtionairesitemsobj"], "readonly");
  var store = trans.objectStore("qtionairesitemsobj");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(answers);
      return;
    }

    answers.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//get all locations or places in database
devtrac.indexedDB.getAllplaces = function(db, callback) {
  var places = [];
  var trans = db.transaction(["placesitemsobj"], "readonly");
  var store = trans.objectStore("placesitemsobj");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(places);
      return;
    }

    places.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//get all images in database
devtrac.indexedDB.getAllImages = function(db, callback) {
  var images = [];
  var trans = db.transaction(["images"], "readonly");
  var store = trans.objectStore("images");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(images);
      return;
    }

    images.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};


//get all comments in database
devtrac.indexedDB.getAllComments = function(db, callback) {
  var comments = [];
  var trans = db.transaction(["commentsitemsobj"], "readonly");
  var store = trans.objectStore("commentsitemsobj");

  // Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);

  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      callback(comments);
      return;
    }

    comments.push(result.value);

    result["continue"]();
  };

  cursorRequest.onerror = devtrac.indexedDB.onerror;
};

//get a place items from database
devtrac.indexedDB.getPlace = function(db, pnid, callback) {
  var trans = db.transaction(["placesitemsobj"], "readonly");
  var store = trans.objectStore("placesitemsobj");

  var index = store.index("nid");
  index.get(pnid).onsuccess = function(event) {
    callback(event.target.result);
  };

};

//get action item from database
devtrac.indexedDB.getActionitem = function(db, anid, callback) {
  var trans = db.transaction(["actionitemsobj"], "readonly");
  var store = trans.objectStore("actionitemsobj");

  var index = store.index("nid");
  index.get(anid).onsuccess = function(event) {
    callback(event.target.result);
  };

};

//get fieldtrip item from database
devtrac.indexedDB.getFieldtrip = function(db, fnid, callback) {
  var d = $.Deferred();

  var trans = db.transaction(["fieldtripobj"], "readonly");
  var store = trans.objectStore("fieldtripobj");

  var index = store.index("nid");
  index.get(fnid).onsuccess = function(event) {
    callback(event.target.result);
    d.resolve();
  };

  return d;

};

//edit fieldtrip
devtrac.indexedDB.editFieldtrip = function(db, fnid, updates) {
  var d = $.Deferred();
  var trans = db.transaction(["fieldtripobj"], "readwrite");
  var store = trans.objectStore("fieldtripobj");

  var request = store.get(fnid);
  request.onerror = function(event) {
    // Handle errors!
    console.log("Error getting fieldtrip to update "+fnid);
  };

  request.onsuccess = function(event) {
    var timestamp = new Date().getTime();

    // Get the old value that we want to update
    var data = request.result;
    data.title = updates['title'];
    data.editflag = updates['editflag'];
    // update the value(s) in the object that you want to change

    // Put this updated object back into the database.
    var requestUpdate = store.put(data);

    requestUpdate.onerror = function(event) {
      // Do something with the error
      console.log("Fieldtrip update failed");
      d.resolve();
    };

    requestUpdate.onsuccess = function(event) {
      // Success - the data is updated!
      console.log("Fieldtrip update success");
      //callback();
      d.resolve();
    };
  };
  return d;
};

//edit actionitem information
devtrac.indexedDB.editActionitem = function(db, anid, updates) {
  var d = $.Deferred();

  var trans = db.transaction(["actionitemsobj"], "readwrite");
  var store = trans.objectStore("actionitemsobj");

  var request = store.get(anid);
  request.onerror = function(event) {
    // Handle errors!
    console.log("Error getting action items to update "+anid);
  };
  request.onsuccess = function(event) {
    // Get the old value that we want to update
    var data = request.result;
    data.submit = updates['submit'];

    // Put this updated object back into the database.
    var requestUpdate = store.put(data);
    requestUpdate.onerror = function(event) {
      // Do something with the error
      console.log("Action item update failed");
      d.reject();
    };
    requestUpdate.onsuccess = function(event) {
      // Success - the data is updated!
      store['delete'](anid);
      console.log("Action item update success");
      d.resolve();
    };
  };
  return d;
};

//edit place
devtrac.indexedDB.editPlace = function(db, pnid, updates) {
  var d = $.Deferred();

  var trans = db.transaction(["placesitemsobj"], "readwrite");
  var store = trans.objectStore("placesitemsobj");

  var request = store.get(pnid);
  request.onerror = function(event) {
    // Handle errors!
    console.log("Error getting place to update "+pnid);
  };
  request.onsuccess = function(event) {
    // Get the old value that we want to update
    var data = request.result;
    
    for(var key in updates){
      if(key == "email"){
        data['field_place_responsible_email']['und'][0]['email'] = updates['email'];
      }else if(key == "responsible"){
        data['field_place_responsible_person']['und'][0]['value'] = updates['responsible']; 
      }else if(key == "title"){
       data['title'] = updates['title']; 
      }else if(key == "submit"){
       data['submit'] = updates['submit']; 
      }else if(key == "nid"){
       data['new_nid'] = updates['nid']; 
      }
    }

    // Put this updated object back into the database.
    var requestUpdate = store.put(data);
    requestUpdate.onerror = function(event) {
      // Do something with the error
      console.log("Place update failed");
      d.reject();
    };
    requestUpdate.onsuccess = function(event) {
      // Success - the data is updated!
      console.log("Place update success");
      d.resolve(pnid);
    };
  };
  return d;
};

//edit site visit
devtrac.indexedDB.editSitevisit = function(db, snid, updates) {
  var d = $.Deferred();

  var trans = db.transaction(["sitevisit"], "readwrite");
  var store = trans.objectStore("sitevisit");

  var request = store.get(snid);
  request.onerror = function(event) {
    // Handle errors!
    console.log("Error getting site visit to update "+snid);
  };
  request.onsuccess = function(event) {
    // Get the old value that we want to update
    var data = request.result;
    
    for(var key in updates){
     if(key == "title"){
       data['title'] = updates['title'];   
     } 
     if(key == "date"){
       data['field_ftritem_date_visited']['und'][0]['value'] = updates['date'];
     }
     if(key  == "summary"){
       data['field_ftritem_public_summary']['und'][0]['value'] = updates['summary'];
     }
     if(key == "submit"){
       data['submit'] = updates['submit'];
     }
     if(key == "editflag"){
       data['editflag'] = updates['editflag'];
     }
    }
    
    // Put this updated object back into the database.
    var requestUpdate = store.put(data);
    requestUpdate.onerror = function(event) {
      // Do something with the error
      console.log("Site visit update failed");
      d.reject();
    };
    requestUpdate.onsuccess = function(event) {
      // Success - the data is updated!
      //console.log("Site visit update success");

      //store['delete'](snid);
      d.resolve();
    };
  };

  return d;
};

//delete place
devtrac.indexedDB.deletePlace = function(db, pnid) {
  var trans = db.transaction(["placesitemsobj"], "readwrite");
  var store = trans.objectStore("placesitemsobj");

  var request = store['delete'](pnid);

  request.onsuccess = function(e) {
    console.log("Deleted sitevisit "+pnid);
  };

  request.onerror = function(e) {
    console.log(e);
  };
};

//delete sitevisit
devtrac.indexedDB.deleteSitevisit = function(db, snid) {
  var trans = db.transaction(["sitevisit"], "readwrite");
  var store = trans.objectStore("sitevisit");

  var request = store['delete'](snid);

  request.onsuccess = function(e) {
    console.log("Deleted sitevisit "+snid);
  };

  request.onerror = function(e) {
    console.log(e);
  };
};

//delete image
devtrac.indexedDB.deleteImage = function(db, id) {
  var trans = db.transaction(["images"], "readwrite");
  var store = trans.objectStore("images");

  var request = store['delete'](id);

  request.onsuccess = function(e) {
    console.log("Deleted image "+id);
  };

  request.onerror = function(e) {
    console.log(e);
  };
};

//delete action item
devtrac.indexedDB.deleteActionitem = function(db, id) {
  var trans = db.transaction(["actionitemsobj"], "readwrite");
  var store = trans.objectStore("actionitemsobj");

  var request = store['delete'](id);

  request.onsuccess = function(e) {
    console.log("deleted action item "+id);
  };

  request.onerror = function(e) {
    console.log(e);
  };
};

//delete all tables in database
devtrac.indexedDB.deleteAllTables = function(db, objectstore) {
  var d = $.Deferred();
  var trans = db.transaction([objectstore], "readwrite");
  var store = trans.objectStore(objectstore);

  //Get everything in the store;
  var keyRange = IDBKeyRange.lowerBound(0);
  var cursorRequest = store.openCursor(keyRange);
  
  cursorRequest.onsuccess = function(e) {
    var result = e.target.result;
    if(!!result == false) {
      d.resolve();
      return;
    }
    
    store['delete'](result.key);
    result["continue"]();
  };
  
  cursorRequest.onerror = function(e) {
    d.reject(e);
  }  
  
  return d;
};