//Phonegap code to read the username and passwords from the sd card
function readUserInfo(fileSystem) {
  
  fileSystem.root.getFile("devmobileInfo.txt", null, readUserInfoEntry, failReadUserInfo);
}
function readUserInfoEntry(fileEntry) {
  
  fileEntry.file(readUserInfoFile, failReadUserInfo);
}
function readUserInfoFile(file) {
  
  readUserInfoAsText(file);
}
function readUserInfoAsText(file) {
  
  var reader = new FileReader();
  reader.onload = function(evt) {
    var text = evt.target.result;
    var words = text.split(',');
    
    localStorage.username = words[0];
    localStorage.password = words[1];
    localStorage.title    = words[2];
    
    console.log("Read user info "+localStorage.username + "," + localStorage.password + ","+localStorage.title);
    
  };
  reader.readAsText(file);
}
function failReadUserInfo(evt) {
  console.log("cannot Read UserInfo");
}//User Info read ends here


//Phonegap code to save the site report types to sd card
function saveUserInfo(fileSystem) {
  
  fileSystem.root.getFile("devmobileInfo.txt", {
    create : true,
    exclusive : false
  }, saveUserInfoEntry, failsaveUserInfo);
}
function saveUserInfoEntry(fileEntry) {
  
  fileEntry.createWriter(saveUserInfoFileWriter, failsaveUserInfo);
}
function saveUserInfoFileWriter(writer) {
  
  writer.onwriteend = function(evt) {
    
    console.log("Saved user info "+localStorage.username + "," + localStorage.usertitle);
    
  };
  var auth = localStorage.username + "," + localStorage.password+ ","+localStorage.usertitle;
  writer.write(auth);
}
function failsaveUserInfo(error) {
  console.log("cannot Saved UserInfo");
  $.unblockUI();
}//save User Info ends here

//Phonegap code to clear UserInfo saved in a file on the sd card
function clearUserInfo(fileSystem) {
  
  fileSystem.root.getFile("devmobileInfo.txt", {
    create : true,
    exclusive : false
  }, clearUserInfoEntry, failclearUserInfo);
}
function clearUserInfoEntry(fileEntry) {
  
  fileEntry.createWriter(clearUserInfoFileWriter, failclearUserInfo);
}
function clearUserInfoFileWriter(writer) {
  
  writer.onwriteend = function(evt) {
    
    console.log("cleared UserInfo");
  };
  var auth = 0 + "," + 0 + "," + 0;
  writer.write(auth);
}
function failclearUserInfo(error) {
  console.log("cannot clear UserInfo");
}//clear UserInfo ends here

