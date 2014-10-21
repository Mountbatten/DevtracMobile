//Phonegap code to read the site report types from the sd card
function readTypes(fileSystem) {
  
  fileSystem.root.getFile("reporttypes.txt", null, readTypesFileEntry, failreadTypes);
}
function readTypesFileEntry(fileEntry) {
  
  fileEntry.file(readTypesFile, failreadTypes);
}
function readTypesFile(file) {
  
  readTypesAsText(file);
}
function readTypesAsText(file) {
  
  var reader = new FileReader();
  reader.onload = function(evt) {
    var text = evt.target.result;
    var words = text.split(',');
    
    localStorage.humaninterest = words[0];
    localStorage.roadside = words[1];
    localStorage.sitevisit = words[2];
    
    console.log("Read types "+localStorage.humaninterest + "," + localStorage.roadside+ "," +localStorage.sitevisit);
    
  };
  reader.readAsText(file);
}
function failreadTypes(evt) {
  console.log("cannot Read types");
}//sitereports read ends here


//Phonegap code to save the site report types to sd card
function saveTypes(fileSystem) {
  
  fileSystem.root.getFile("reporttypes.txt", {
    create : true,
    exclusive : false
  }, saveTypesFileEntry, failsaveTypes);
}
function saveTypesFileEntry(fileEntry) {
  
  fileEntry.createWriter(saveTypesFileWriter, failsaveTypes);
}
function saveTypesFileWriter(writer) {
  
  writer.onwriteend = function(evt) {
    
    console.log("Saved types "+localStorage.humaninterest + "," + localStorage.roadside+ "," +localStorage.sitevisit);
  };
  var auth = localStorage.humaninterest + "," + localStorage.roadside+ "," +localStorage.sitevisit ;
  writer.write(auth);
}
function failsaveTypes(error) {
  console.log("cannot Saved types");
  $.unblockUI();
}//save sitereports ends here

//Phonegap code to clear sitereport types saved in a file on the sd card
function clearTypes(fileSystem) {
  
  fileSystem.root.getFile("reporttypes.txt", {
    create : true,
    exclusive : false
  }, clearTypesFileEntry, failclearTypes);
}
function clearTypesFileEntry(fileEntry) {
  
  fileEntry.createWriter(clearTypesFileWriter, failclearTypes);
}
function clearTypesFileWriter(writer) {
  
  writer.onwriteend = function(evt) {
    
    console.log("cleared types");
  };
  var auth = 0 + "," + 0;
  writer.write(auth);
}
function failclearTypes(error) {
  console.log("canot clear types");
}//clear passwords ends here

