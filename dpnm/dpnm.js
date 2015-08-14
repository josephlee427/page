Tasks = new Mongo.Collection("tasks");    // Initialize the database

if (Meteor.isClient) {
  // This code only runs on the client

  Meteor.subscribe("tasks");    // Set the client to read the database

  Template.body.helpers({
    tasks: function () {
        return Tasks.find({}, {sort: {ip: 1}});
    },

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

      if (ip === String(ip)) {    // Check if input is a String
        if (port % 1 === 0) {   // Check if int
          Meteor.call("addTask", [ip, port]);   // Run the form into the database

          // Clear form
          event.target.serverIP.value = "";
          event.target.serverPort.value = "";
        }
      }

      // Prevent default form submit
      return false;
    },

    "submit .updateServers": function (event) {
      Meteor.call("updateServers");   // Manual updating
    },

    "submit .change-email": function (event) {
      var oldEmail, userEmail;

      if ((oldEmail = event.target.oldEmail.value) === "") {
        return false;
      }

      if ((newEmail = event.target.newEmail.value) === "") {
        return false;
      }

      if (oldEmail === String(oldEmail)) {
        if (newEmail === String(newEmail)) {
          Meteor.call("updateEmail", oldEmail, newEmail);

          event.target.email.value = "";    // Reset fields
          event.target.newEmail.value = "";
        }
      }

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
/**    isOwner: function () {    // Can be used to determine who made an entry
      return this.owner === Meteor.userId() || Meteor.user().username == "admin";
    },
*/
    serverOnline: function () {
      return this.status === "open";
    },

    isRDP: function () {   // Change the ms-wbt-server string to rdp
      return this.service === "ms-wbt-server";
    }

  });

  Accounts.ui.config({        // Users setup
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });
}

function updateServers() {

    var admin = Meteor.users.findOne({username: "admin"});  // Admin credentials
    var opts, serverInfo;
    var cursor = Tasks.find({});  // Start at the database
    cursor.forEach(function (info) {    // Iterate through each and run nmap
      opts = { range: [String(info.ip)], ports: String(info.port) }
      libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
        if (err) throw err
        report.forEach(function(item) {
        serverInfo = (item[0])

        Tasks.update({ip: info.ip, port: info.port}, {
          $set:
          {
            status: serverInfo.ports[0].state,
            service: serverInfo.ports[0].service,
  //          serverInfo: //Fill in
          }
        });
      });

      if (serverInfo.ports[0].state == "closed") {  // If server is down, send mail
            Email.send({to: admin.emails[0].address,  // Sends mail to admin
                  from: 'throwaway42794@gmail.com',
                  subject: info.ip,// + " (Server: " + info.server??? + ") has gone down (port:  " + info.port + ").",
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
    var opts = { range: [text[0]], ports: text[1] }
    console.log(opts);

    if (Meteor.user().username == "admin") {

      libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
        if (err) throw err
        report.forEach(function(item){
          info = (item[0])

          if (Tasks.findOne({ip: text[0], port: text[1]})) {
            return;       // If the entry already exists, exit
          }

          Tasks.insert({
            ip: text[0],
            port: text[1],
            status: info.ports[0].state,
            service: info.ports[0].service,
//            serverInfo: //Fill in
            createdAt: new Date(),
            owner: Meteor.userId(),
            username: Meteor.user().username

          });
        });
      }));
    }

  },
  updateServers: function () {

      var opts, serverInfo;
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
              service: serverInfo.ports[0].service,
//              serverInfo: //Fill in
            }
          });
        });

        if (serverInfo.ports[0].state == "closed") {  // If server is down, send mail
              Email.send({to: Meteor.user().emails[0].address,      // Sends to logged in user
                    from: 'throwaway42794@gmail.com',
                    subject: info.ip,// + " (Server: " + info.server??? + ") has gone down (port:  " + info.port + ").",
                    text: "Read subject!"
        });
        }

      }));
    });

  },

  deleteTask: function (taskId) {

    var task = Tasks.findOne(taskId);

    if (Meteor.user().username == "admin") {    // Admin can remove anything
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

    if (oldEmail !== Meteor.user().emails[0].address) {   // Verification
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
  var libnmap = Meteor.npmRequire('node-libnmap');  // for libnmap package
  var Api = new Restivus({
    useDefaultAuth: true,
    prettyJson: true
  });

  Api.addCollection(Tasks);

  Api.addCollection(Meteor.users, {
      excludedEndpoints: ['getAll', 'put'],
      routeOptions: {
        authRequired: true
      },
      endpoints: {
        post: {
          authRequired: false
        },
        delete: {
          roleRequired: 'admin'
        }
      }
  });

  Api.addRoute('tasks/:id', {authRequired: true}, {
  get: function () {
    return Tasks.findOne(this.urlParams.id);
  },
  delete: {
    roleRequired: ['author', 'admin'],
    action: function () {
      if (Tasks.remove(this.urlParams.id)) {
        return {status: 'success', data: {message: 'Task removed'}};
      }
      return {
        statusCode: 404,
        body: {status: 'fail', message: 'Tasks not found'}
      };
    }
  }
  });


  SyncedCron.add({
      name: 'Periodically check the DP&NM servers',
      schedule: function(parser) {
        // parser is a later.parse object
        return parser.text('every 15 minutes');
      },
      job: function() {
        updateServers();
      }
    });

  Meteor.startup(function () {
      // code to run on server at startup
      SyncedCron.start();
  });
}
