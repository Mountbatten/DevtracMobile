var vocabularies = {

    //Returns devtrac Oecd json list and saves the values to a database
    getOecdVocabularies: function(db) {
      var d = $.Deferred();
      $.ajax({
        url : localStorage.appurl+"/api/views/api_vocabularies.json?display_id=oecd",
        type : 'get',
        dataType : 'json',
        error : function(XMLHttpRequest, textStatus, errorThrown) { 

          d.reject(errorThrown);
        },
        success : function(data) {
          if(data.length <= 0) {

            d.reject("No Oecds Found");
          }else {
            devtrac.indexedDB.open(function (dbs) {
              devtrac.indexedDB.addTaxonomyData(dbs, "oecdobj", data).then(function() {
                d.resolve("Oecds");
              }).fail(function(err) {
                d.resolve("Oecds Not Saved");

              });
            });
  
          }
          
        }
      });

      return d;

    },

    //Returns devtrac placetype json list and saves the values to a database
    getPlacetypeVocabularies: function(db) {
      var d = $.Deferred();

      $.ajax({
        url : localStorage.appurl+"/api/views/api_vocabularies.json?display_id=placetypes",
        type : 'get',
        dataType : 'json',
        error : function(XMLHttpRequest, textStatus, errorThrown) {

          d.reject(errorThrown);
        },
        success : function(data) {

          if(data.length <= 0) {

            d.reject("No Placetypes Found");
          }else{
            
            devtrac.indexedDB.open(function (dbs) {
              devtrac.indexedDB.addTaxonomyData(dbs, "placetype", data).then(function() {
                d.resolve("Placetypes");
              }).fail(function(err) {
                d.resolve("Placetypes Not Saved");
              });
            });

          }
          
        }
      });
      return d;

    }
};
