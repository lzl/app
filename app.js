Posts = new Mongo.Collection('posts');

if (Meteor.isClient) {
  Template.posts.helpers({
    posts: function () {
      return Posts.find();
    }
  });

  Template.posts.events({
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
        Posts.insert({text: post.text,
                      createdAt: new Date(timestamp)});
        timestamp += 1;
      });
    }
  });
}
