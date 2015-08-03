Tasks = new Mongo.Collection("tasks");

Handlebars.registerHelper("isNull", function(value) {
  return value === null;
});



if (Meteor.isClient) {


  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideOffline")) {
        return Tasks.find({offline: {$ne: true}}, {sort: {ip: 1}});
      } else {
        return Tasks.find({}, {sort: {ip: 1}});
    }
    },
    hideOffline: function () {
      return Session.get("hideOffline");
    },
    onlineServers: function () {
      return Tasks.find({offline: {$ne: true}}).count();
    },
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // This function is called when the new task form is submitted
      var port, ip;

      if ((ip = event.target.serverIP.value) === "") {
        return false;
      }

      if ((port = event.target.serverPort.value) === "") {
        return false;
      }

      Meteor.call("addTask", [ip, port]);

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
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId() || Meteor.user().username == "admin";
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods(

{
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.user()) {
      throw new Meteor.Error("not-authorized");
    }
    var info;
    if (Meteor.user().username == "admin") {
      Tasks.insert({
        ip: text[0],
        port: text[1],
        status: "Offline",
        service: "???",
        createdAt: new Date(),
        owner: Meteor.userId(),
        username: Meteor.user().username
      });
      console.log("It was added");
      var opts = { range: [text[0]], ports: text[1] }
      console.log(opts);


      libnmap.nmap('scan', opts, function(err, report){
        if (err) throw err
        report.forEach(function(item){
          console.log(item[0])
          info = (item[0])
        });
      });
      console.log("Checked server");

//      Tasks.update({ip: text[0]}, {$set: {status: "Online"}});
//      document.getElementById("test").innerHTML = "Added!?";
    }

    var obj = JSON.parse(info);
    if (obj.ports.state == 'open') {
        Tasks.update({ip: obj.ip}, {$set: {status: "Online"}});
        Tasks.update({ip: obj.ip}, {$set: {service: obj.ports.service}});
    }

  },

  initialCheck: function(text) {
    if (! Meteor.user()) {
      throw new Meteor.Error("not-authorized");
    }
    var obj = JSON.parse(text);
    if (obj.ports.state == 'open') {
        Tasks.update({ip: obj.ip}, {$set: {status: "Online"}});
        Tasks.update({ip: obj.ip, {$set: {service: obj.ports.service}});
    }
  },

  updateServers: function () {
    if (! Meteor.user()) {
      throw new Meteor.Error("not-authorized");
    }
    var List = { range: Tasks.distinct("ip") }
    document.write(List);


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

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    if (Meteor.user().username == "admin") {
      Tasks.update(taskId, { $set: { private: setToPrivate } });
      return;
    }

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});




if (Meteor.isServer) {
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({}, {sort: {ip: 1}})
  });


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
