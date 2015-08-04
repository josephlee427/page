Meteor.startup(function(){
        process.env.MAIL_URL = 'smtp://throwaway42794:dudqjadl427@smtp.gmail.com:587/'
});


Meteor.methods({
  sendEmail: function (subject, text) {
    check([subject, text], [String]);

    Email.send({to: 'josephl@live.ca',
                from: 'throwaway42794@gmail.com',
                subject: subject + " has gone down.",
                text: text
    });
  }
})
