/**
var opts, serverInfo;

var cursor = Tasks.find({});
cursor.forEach(function (info) {
/**      console.log(info)
  console.log("info ^^")
  console.log(info.ip)
  console.log(info.port) */
//  opts = { range: [String(info.ip)], ports: String(parseInt(info.port) + 1) }
//      console.log(opts)
//      console.log("opts is above this")
/**
  libnmap.nmap('scan', opts, Meteor.bindEnvironment(function(err, report){
    if (err) throw err
    report.forEach(function(item) {
    serverInfo = (item[0])
//        console.log(info.status)
//        console.log(info.service)

/**
    Tasks.update({ip: info.ip}, {
      $set:
      {
        port: serverInfo.ports[0].port,
        status: serverInfo.ports[0].state,
        service: serverInfo.ports[0].service
      }
    });
  });
}));
});

*/

/**
141.223.82.74
110
*/
