Posts = new Mongo.Collection('posts');

Meteor.methods({
  submit: function (val) {
    return Posts.insert({
      text: val,
      createdAt: new Date()
    });
  },
})

if (Meteor.isClient) {
  Template.posts.helpers({
    posts: function () {
      return Posts.find();
    }
  });

  Template.compose.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var val = tmpl.find('#text').value;
      val = $.trim(val);
      if (val) {
        Meteor.call('submit', val);
        tmpl.find('form').reset();
        tmpl.find('#text').focus();
      }
    }
  });
}

if (Meteor.isServer) {
  // if the database is empty on server start, create some sample data.
  Meteor.startup(function () {
    if (Posts.find().count() === 0) {
      var data = [
        {text: "Meteor Principles"},
        {text: "Languages"},
        {text: "Favorite Scientists"}
      ];

      var timestamp = (new Date()).getTime();
      _.each(data, function(post) {
        Posts.insert({
          text: post.text,
          createdAt: new Date(timestamp)
        });
        timestamp += 1;
      });
    }
  });
}
