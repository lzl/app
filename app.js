Posts = new Mongo.Collection('posts');
AnonymousComments = new Mongo.Collection('anonymousComments');

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
  anonymousCommentSubmit: function (val) {
    if (!val.text) {
      throw new Meteor.Error(411, "Length required.")
    }
    return AnonymousComments.insert({
      text: val.text,
      postId: val.postId,
      createdAt: new Date()
    });
  }
});

if (Meteor.isClient) {
  var masonry = function () {
    var container = document.querySelector('#masonry');
    // initialize Masonry
    var msnry = new Masonry( container );
    // layout Masonry again after all images have loaded
    imagesLoaded( container, function() {
      msnry.layout();
    });
  };

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
    scroll(0,0);
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
    scroll(0,0);
  }, {
    name: 'singlePost'
  });

  Router.route('/dashboard', function () {
    if (! isAdmin()) {
      this.redirect('/');
    } else {
      this.wait(Meteor.subscribe('allAnonymousComments'));
      this.render('dashboard');
    }
  }, {
    name: 'dashboard'
  });

  Template.card.rendered = function () {
    masonry();
  };

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

  Template.singlePost.helpers({
    dateTime: function () {
      return moment(this.createdAt).calendar();
    }
  });

  Template.dashboard.helpers({
    comments: function () {
      return AnonymousComments.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.dashboard.events({
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

  Template.anonymousCommentSubmit.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var text = tmpl.find('[type=text]').value;
      text = $.trim(text);
      if (!text) return;
      var postId = tmpl.data._id;
      var val = {text: text, postId: postId};
      Meteor.call('anonymousCommentSubmit', val);
      tmpl.find('form').reset();
      alert("Your question is submitted!");
    }
  })
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
  Meteor.publish('allAnonymousComments', function () {
    return AnonymousComments.find({}, {sort: {createdAt: -1}});
  });
}
