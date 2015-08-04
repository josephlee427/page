Tasks = new Mongo.Collection("tasks");    // Initialize the database

Handlebars.registerHelper("isNull", function(value) {
  return value === null;    // Helper to see if a value is null
});


if (Meteor.isClient) {
  // This code only runs on the client

  Meteor.subscribe("tasks");    // Set the client to read the database

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideOffline")) {
        return Tasks.find({offline: {$ne: true}}, {sort: {ip: 1}});
      } else {
        return Tasks.find({}, {sort: {ip: 1}});
    }},
    onlineServers: function () {      // Count the online servers
                                      // "List of DPNM Servers" (x Online)
      return Tasks.find({status: {$ne: "closed"}}).count();
    },
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // This function is called when the new server form is submitted
      var port, ip;

      if ((ip = event.target.serverIP.value) === "") {
        return false;       // Prevent empty form
      }

      if ((port = event.target.serverPort.value) === "") {
        return false;
      }

      Meteor.call("addTask", [ip, port]);   // Run the form into the database

      // Clear form
      event.target.serverIP.value = "";
      event.target.serverPort.value = "";

      // Prevent default form submit
      return false;
    },
    "submit .update-task": function (event) {
    },

    "submit .updateServers": function (event) {
      Meteor.call("updateServers");
    }

  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    // Delete server info from database with a click
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId() || Meteor.user().username == "admin";
    }
  });

  Accounts.ui.config({        // Users setup
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods(

{
  // Add a server into the database and check the status of it

  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.user()) {
      throw new Meteor.Error("not-authorized");
    }
    var info;
    var obj, obj2;
    var opts = { range: [text[0]], ports: text[1] }
    console.log(opts);

    if (Meteor.user().username == "admin") {

      libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
        if (err) throw err
        report.forEach(function(item){
          console.log(item[0])
          info = (item[0])
          console.log(info)
          console.log("this is info")
          obj = JSON.stringify(info)
          console.log(obj)
          console.log("this is obj")
          obj2 = JSON.parse(obj)
          console.log(obj2)
          console.log("this is obj2")
//          var ippp = JSON.stringify(obj2.ip)
//          var ippp = JSON.stringify(obj2.ports[0].port)
//          console.log(String(ippp))
          console.log("the above should be ippp")
          var serverStatus = JSON.stringify(obj2.ports[0].state);
          var serverService = JSON.stringify(obj2.ports[0].service);

          Tasks.insert({
            ip: text[0],
            port: text[1],
            status: serverStatus,
            service: serverService,
            createdAt: new Date(),
            owner: Meteor.userId(),
            username: Meteor.user().username

          });
        });
      }));
    }
/**
      var serverStatus = JSON.stringify(obj2.ports[0].state);
      var serverService = JSON.stringify(obj2.ports[0].service);


      Tasks.insert({
        ip: text[0],
        port: text[1],
        status: stat,
        service: serve,
        createdAt: new Date(),
        owner: Meteor.userId(),
        username: Meteor.user().username
      });
*/
      console.log("It was added");

      console.log("Checked server");

  },

  updateServers: function () {
    if (! Meteor.user()) {
      throw new Meteor.Error("not-authorized");
    }

    var opts, serverInfo;

    var cursor = Tasks.find({});
    cursor.forEach(function (info) {
      opts = { range: [info.ip], ports: info.ports[0].port }
      libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
        if (err) throw err
        report.forEach(function(item) {
          serverInfo = (item[0])
          var serverStatus = JSON.stringify(info.ports[0].state);
          var serverService = JSON.stringify(info.ports[0].service);

          Tasks.update({ip: info.ip, port: info.ports[0].port}, { $set: { status: serverStatus, service: serverService}
          });
        });
    }));
  });
},
  deleteTask: function (taskId) {

    var task = Tasks.findOne(taskId);

    if (Meteor.user().username == "admin") {
      Tasks.remove(taskId);
      return;
    }

    if (task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
});




if (Meteor.isServer) {
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({}, {sort: {ip: 1}})
  });

  var fs = Meteor.npmRequire("fs");
  var libnmap = Meteor.npmRequire('node-libnmap');



/**
  var opts = {
  range: ['localhost', '141.223.163.64']
}

libnmap.nmap('scan', opts, function(err, report){
  if (err) throw err
  report.forEach(function(item){
    console.log(item[0])
  });
}); */

}
