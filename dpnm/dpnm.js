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
    }
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
    },

    "submit .change-email": function (event) {
      var oldEmail, userEmail;

      if ((oldEmail = event.target.oldEmail.value) === "") {
        return false;
      }

      if ((newEmail = event.target.newEmail.value) === "") {
        return false;
      }

      Meteor.call("updateEmail", oldEmail, newEmail);

      event.target.email.value = "";
      event.target.newEmail.value = "";

      return false;
    }

  });

  Template.task.events({
    // Delete server info from database with a click
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId() || Meteor.user().username == "admin";
    },

    serverOnline: function () {
      return this.status === "open";
    }
  });

  Accounts.ui.config({        // Users setup
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });
}

function updateServers() {

    var admin = Meteor.users.findOne({username: "admin"});
    var opts, serverInfo;
    console.log("middle of updateServers");
    var cursor = Tasks.find({});
    cursor.forEach(function (info) {
/**      console.log(info)
      console.log("info ^^")
      console.log(info.ip)
      console.log(info.port) */
      opts = { range: [String(info.ip)], ports: String(info.port) }
//      console.log(opts)
//      console.log("opts is above this")

      libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
        if (err) throw err
        report.forEach(function(item) {
        serverInfo = (item[0])
//        console.log(info.status)
//        console.log(info.service)

        Tasks.update({ip: info.ip, port: info.port}, {
          $set:
          {
            status: serverInfo.ports[0].state,
            service: serverInfo.ports[0].service
          }
        });
      });

      if (serverInfo.ports[0].state == "closed") {  // If server is down, send mail
            Email.send({to: admin.emails[0].address,      // Can change email to anything
                  from: 'throwaway42794@gmail.com',
                  subject: info.ip + " has gone down (port:  " + info.port + ").",
                  text: "Read subject!"
      });
      }

    }));
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
//    var obj, obj2;
    var opts = { range: [text[0]], ports: text[1] }
    console.log(opts);

    if (Meteor.user().username == "admin") {

      libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
        if (err) throw err
        report.forEach(function(item){
          console.log(item[0])
          info = (item[0])
          console.log(info)
/**       console.log("this is info")
          obj = JSON.stringify(info)
          console.log(obj)
          console.log("this is obj")
          obj2 = JSON.parse(obj)
          console.log(obj2)
          console.log("this is obj2")
          var ippp = JSON.stringify(obj2.ip)
          var ippp = JSON.stringify(obj2.ports[0].port)
          console.log(String(ippp))
          console.log("the above should be ippp") */

          if (Tasks.findOne({ip: text[0], port: text[1]})) {
            return;       // If the entry already exists, exit
          }

          Tasks.insert({
            ip: text[0],
            port: text[1],
            status: info.ports[0].state,
            service: info.ports[0].service,
            createdAt: new Date(),
            owner: Meteor.userId(),
            username: Meteor.user().username

          });
        });
      }));
    }
      console.log("It was added");
      console.log("Checked server");

  },
  updateServers: function () {

      var opts, serverInfo;
      console.log("middle of updateServers");
      var cursor = Tasks.find({});
      cursor.forEach(function (info) {
        opts = { range: [String(info.ip)], ports: String(info.port) }
        libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
          if (err) throw err
          report.forEach(function(item) {
          serverInfo = (item[0])

          Tasks.update({ip: info.ip, port: info.port}, {
            $set:
            {
              status: serverInfo.ports[0].state,
              service: serverInfo.ports[0].service
            }
          });
        });

        if (serverInfo.ports[0].state == "closed") {  // If server is down, send mail
              Email.send({to: Meteor.user().emails[0].address,      // Can change email to anything
                    from: 'throwaway42794@gmail.com',
                    subject: info.ip + " has gone down (port:  " + info.port + ").",
                    text: "Read subject!"
        });
        }

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
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },

  updateEmail: function (oldEmail, userEmail) {

    var user = Meteor.user().username;

    if (oldEmail !== Meteor.user().emails[0].address) {
      return;   // Old email was not right
    }

    Meteor.users.update({_id: Meteor.user()._id},
      { $set: {
              "emails.0.address": userEmail
      }
    });
  }
});


if (Meteor.isServer) {
  // Only publish tasks that are public or belong to the current user
  Meteor.publish("tasks", function () {
    return Tasks.find({}, {sort: {ip: 1}})
  });

  SyncedCron.add({
      name: 'Periodically check the DP&NM servers',
      schedule: function(parser) {
        // parser is a later.parse object
        return parser.text('every 15 minutes');
      },
      job: function() {
        console.log("about to run updateServers");
        updateServers();
        console.log("end of updateServers");
      }
    });

  Meteor.startup(function () {
      // code to run on server at startup
      SyncedCron.start();
  });


  var libnmap = Meteor.npmRequire('node-libnmap');  // for libnmap package
/**  Meteor.startup(function () {
    Meteor.setInterval(function () {
        Meteor.call("updateServers")
      },  5000)});    // 600000 = 10 minutes
*/


}
/** Testing cases, insert in nodejs to find info
  var opts = {
  range: ['localhost', '141.223.163.64']
}

libnmap.nmap('scan', opts, function(err, report){
  if (err) throw err
  report.forEach(function(item){
    console.log(item[0])
  });
}); */
