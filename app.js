Posts = new Mongo.Collection('posts');

Router.configure({
  layoutTemplate: 'appBody'
});

isAdmin = function () {
  var email = Meteor.user().emails[0].address;
  return email === "lizunlong@gmail.com";
};

Meteor.methods({
  submit: function (val) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    if (!val.title || !val.text || !val.topic) {
      throw new Meteor.Error(411, "Length required.")
    }
    return Posts.insert({
      title: val.title,
      text: val.text,
      topic: val.topic,
      userId: Meteor.userId(),
      createdAt: new Date()
    });
  },
})

if (Meteor.isClient) {
  var subs = new SubsManager();

  Router.route('/', function () {
    this.wait(subs.subscribe('allPosts'));
    this.render('allPosts');
  }, {
    name: 'allPosts'
  });

  Router.route('/t/:topic', function () {
    var topic = this.params.topic;
    Session.set('topic', topic);
    this.wait(subs.subscribe('topicPosts', topic));
    this.render('topicPosts');
  }, {
    name:'topicPosts'
  });

  Router.route('/p/:_id', function () {
    this.wait(subs.subscribe('singlePost', this.params._id));
    this.render('singlePost', {
      data: function () {
        return Posts.findOne(this.params._id);
      }
    });
  }, {
    name: 'singlePost'
  });

  Router.route('/compose', function () {
    if (! isAdmin()) {
      this.redirect('/');
    } else {
      this.render('compose');
    }
  }, {
    name: 'compose'
  });

  Template.navbar.helpers({
    isAdmin: function () {
      return isAdmin();
    }
  });

  Template.allPosts.helpers({
    posts: function () {
      return Posts.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.topicPosts.helpers({
    posts: function (topic) {
      return Posts.find({topic: topic}, {sort: {createdAt: -1}});
    },
    topic: function () {
      return Session.get('topic');
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
      Meteor.call('submit', val);
      tmpl.find('form').reset();
      tmpl.find('#title').focus();
    }
  });
}

if (Meteor.isServer) {
  FastRender.route('/', function () {
    this.subscribe('allPosts');
  });
  FastRender.route('/t/:topic', function (params) {
    this.subscribe('topicPosts', params.topic);
  });
  FastRender.route('/p/:_id', function (params) {
    this.subscribe('singlePost', params._id);
  });

  Meteor.publish('allPosts', function () {
    return Posts.find({}, {sort: {createdAt: -1}});
  });
  Meteor.publish('topicPosts', function (topic) {
    return Posts.find({topic: topic}, {sort: {createdAt: -1}});
  });
  Meteor.publish('singlePost', function (id) {
    return Posts.find({_id: id});
  });
}
