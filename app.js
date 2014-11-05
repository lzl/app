Posts = new Mongo.Collection('posts');

Router.configure({
  layoutTemplate: 'appBody'
});

Meteor.methods({
  submit: function (val) {
    return Posts.insert({
      title: val.title,
      text: val.text,
      topic: val.topic,
      createdAt: new Date()
    });
  },
})

if (Meteor.isClient) {
  var isAdmin = function () {
    var email = Meteor.user().emails[0].address;
    return email === "lizunlong@gmail.com";
  };

  Router.route('/', function () {
    this.wait(Meteor.subscribe('allPosts'));
    this.render('posts');
  });

  Router.route('/t/:topic', function () {
    this.wait(Meteor.subscribe('topicPosts', this.params.topic));
    this.render('posts');
  });

  Router.route('/p/:_id', function () {
    this.wait(Meteor.subscribe('post', this.params._id));
    this.render('post', {
      data: function () {
        return Posts.findOne(this.params._id);
      }
    });
  });

  Router.route('/compose', function () {
    if (! isAdmin()) {
      this.redirect('/');
    } else {
      this.render('compose');
    }
  });

  Template.navbar.helpers({
    isAdmin: function () {
      return isAdmin();
    }
  });

  Template.posts.helpers({
    posts: function () {
      return Posts.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.compose.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var title = tmpl.find('#title').value;
      title = $.trim(title);
      var text = tmpl.find('#text').value;
      text = $.trim(text);
      var topic = tmpl.find('#topic').value;
      topic = $.trim(topic);
      var val = {title: title, text: text, topic: topic};
      if (val && isAdmin()) {
        Meteor.call('submit', val);
        tmpl.find('form').reset();
        tmpl.find('#title').focus();
      }
    }
  });
}

if (Meteor.isServer) {
  Meteor.publish('allPosts', function () {
    return Posts.find({}, {sort: {createdAt: -1}});
  });
  Meteor.publish('topicPosts', function (topic) {
    return Posts.find({topic: topic}, {sort: {createdAt: -1}});
  })
  Meteor.publish('post', function (id) {
    return Posts.find({_id: id});
  })
}
