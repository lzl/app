Posts = new Mongo.Collection('posts');
Logs = new Mongo.Collection('logs');
AnonymousComments = new Mongo.Collection('anonymousComments');
AnonymousLogs = new Mongo.Collection('anonymousLogs');

Router.configure({
  layoutTemplate: 'appBody'
});

isAdmin = function () {
  var user = Meteor.user();
  var isAdmin = Roles.userIsInRole(user, 'admin');
  return isAdmin;
};

Meteor.methods({
  logSubmit: function (val) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    return Logs.insert({
      text: val,
      userId: Meteor.userId(),
      createdAt: new Date()
    });
  },
  anonymousLogSubmit: function (val) {
    return AnonymousLogs.insert({
      text: val,
      createdAt: new Date()
    });
  },
  postSubmit: function (val) {
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
  },
  logRemove: function (id) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    Logs.remove(id);
  },
  anonymousLogRemove: function (id) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    AnonymousLogs.remove(id);
  },
  postEdit: function (id, val) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    if (!val.title || !val.text || !val.topic) {
      throw new Meteor.Error(411, "Length required.")
    }
    Posts.update(id, {$set: val});
  },
  postRemove: function (id) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    Posts.remove(id);
    AnonymousComments.remove({postId: id});
  },
  anonymousCommentRemove: function (id) {
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    AnonymousComments.remove(id);
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

  Router.onBeforeAction(function () {
    if (isAdmin()) {
      this.next();
    } else {
      this.render('login');
    }
  }, {
    only: ['dashboard']
  });

  Router.route('/', function () {
    this.wait([subs.subscribe('allPosts'), subs.subscribe('todayLogs')]);
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
    this.render('cardForSinglePost', {
      data: function () {
        return Posts.findOne(this.params._id);
      }
    });
    scroll(0,0);
  }, {
    name: 'singlePost'
  });

  Router.route('/p/:_id/edit', function () {
    this.wait(subs.subscribe('singlePost', this.params._id));
    this.render('postEdit', {
      data: function () {
        return Posts.findOne(this.params._id);
      }
    });
  }, {
    name: 'postEdit'
  });

  Router.route('/dashboard', function () {
    this.wait([
      subs.subscribe('todayLogs'),
      subs.subscribe('allAnonymousLogs'),
      subs.subscribe('allAnonymousComments')
    ]);
    this.render('dashboard');
  }, {
    name: 'dashboard'
  });

  Template.registerHelper("dateTime", function (when) {
    if (when) {
      return moment(when).calendar();
    }
  });

  Template.registerHelper("timestamp", function (when) {
    if (when) {
      return moment(when).format('HH:mm');
    }
  });

  Template.cardForSingleLog.rendered = function () {
    masonry();
  };

  Template.cardForPosts.rendered = function () {
    masonry();
  };

  Template.postEdit.rendered = function () {
    $('textarea').autosize();
  }

  Template.cardForLogs.helpers({
    logs: function () {
      return Logs.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.cardForPosts.helpers({
    textTruncated: function () {
      // via http://stackoverflow.com/a/27207320
      return _.str.prune(this.text, 1000);
    },
    isTruncated: function () {
      var size = 1000;
      var text = this.text;
      if (text.length > size) {
        return true;
      } else {
        false;
      }
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

  Template.anonymousLogs.helpers({
    logs: function () {
      return AnonymousLogs.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.anonymousComments.helpers({
    comments: function () {
      return AnonymousComments.find({}, {sort: {createdAt: -1}});
    }
  });

  Template.logSubmitForm.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var text = tmpl.find('[type=text]').value;
      text = $.trim(text);
      if (!text) return;
      Meteor.call('logSubmit', text);
      tmpl.find('form').reset();
      tmpl.find('form').focus();
    }
  });

  Template.cardForSingleLogButtons.events({
    'click .delete': function (e) {
      e.preventDefault();
      var id = this._id;
      swal({
        title: "Are you sure?",
        text: "You will not be able to recover this log!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: true
      }, function () {
        Meteor.call('logRemove', id);
      });
    }
  });

  Template.anonymousLogButtons.events({
    'click .delete': function (e) {
      e.preventDefault();
      var id = this._id;
      swal({
        title: "Are you sure?",
        text: "You will not be able to recover this log!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: true
      }, function () {
        Meteor.call('anonymousLogRemove', id);
      });
    }
  });

  Template.anonymousCommentButtons.events({
    'click .link': function (e) {
      e.preventDefault();
      var id = this.postId;
      Router.go('singlePost', {_id: id});
    },
    'click .delete': function (e) {
      e.preventDefault();
      var id = this._id;
      swal({
        title: "Are you sure?",
        text: "You will not be able to recover this comment!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: true
      }, function () {
        Meteor.call('anonymousCommentRemove', id);
      });
    }
  });

  Template.postForm.events({
    'keyup textarea': function () {
      $('textarea').autosize();
    },
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var title = tmpl.find('#title').value;
      title = $.trim(title);
      var text = tmpl.find('#text').value;
      text = $.trim(text);
      var topic = tmpl.find('#topic').value;
      topic = $.trim(topic);
      var val = {title: title, text: text, topic: topic};
      Meteor.call('postSubmit', val);
      tmpl.find('form').reset();
      tmpl.find('#title').focus();
    }
  });

  Template.anonymousLogForm.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var text = tmpl.find('[type=text]').value;
      text = $.trim(text);
      if (!text) return;
      swal({
        title: "Preview",
        text: text,
        type: "info",
        showCancelButton: true,
        confirmButtonText: "Yes, submit it!",
        cancelButtonText: "No, cancel plx!",
        closeOnConfirm: false,
        }, function (isConfirm) {
          if (isConfirm) {
            Meteor.call('anonymousLogSubmit', text);
            swal("Thank you!", "You learned a lot today!", "success");
            tmpl.find('form').reset();
          } else {
            tmpl.find('form').focus();
          }
      });
    }
  });

  Template.anonymousCommentForm.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var text = tmpl.find('[type=text]').value;
      text = $.trim(text);
      if (!text) return;
      var postId = tmpl.data._id;
      var val = {text: text, postId: postId};
      swal({
        title: "Preview",
        text: text,
        type: "info",
        showCancelButton: true,
        confirmButtonText: "Yes, submit it!",
        cancelButtonText: "No, cancel plx!",
        closeOnConfirm: false,
        }, function (isConfirm) {
          if (isConfirm) {
            Meteor.call('anonymousCommentSubmit', val);
            swal("Good job!", "Your question is submitted!", "success");
            tmpl.find('form').reset();
          } else {
            tmpl.find('form').focus();
          }
      });
    }
  });

  Template.postEdit.events({
    'keyup textarea': function () {
      $('textarea').autosize();
    },
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var title = tmpl.find('#title').value;
      title = $.trim(title);
      var text = tmpl.find('#text').value;
      text = $.trim(text);
      var topic = tmpl.find('#topic').value;
      topic = $.trim(topic);
      var id = this._id;
      var val = {title: title, text: text, topic: topic};
      Meteor.call('postEdit', id, val);
      Router.go('singlePost', {_id: id});;
    },
    'click .delete': function(e) {
      e.preventDefault();
      var id = this._id;
      swal({
        title: "Are you sure?",
        text: "You will not be able to recover this post!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: true
      }, function () {
        Meteor.call('postRemove', id);
        Router.go('allPosts');
      });
    }
  });

  Tracker.autorun(function () {
    var query = Logs.find();
    var handle = query.observeChanges({
      removed: function () {
        masonry();
      }
    });
  });

  Tracker.autorun(function () {
    var query = Posts.find();
    var handle = query.observeChanges({
      removed: function () {
        masonry();
      }
    });
  });

  Tracker.autorun(function () {
    var query = AnonymousLogs.find();
    var handle = query.observeChanges({
      added: function () {
        masonry();
      },
      removed: function () {
        masonry();
      }
    });
  });

  Tracker.autorun(function () {
    var query = AnonymousComments.find();
    var handle = query.observeChanges({
      added: function () {
        masonry();
      },
      removed: function () {
        masonry();
      }
    });
  });
}

if (Meteor.isServer) {
  FastRender.route('/', function () {
    this.subscribe('allPosts');
    this.subscribe('todayLogs');
  });
  FastRender.route('/t/:topic', function (params) {
    this.subscribe('topicPosts', params.topic);
  });
  FastRender.route('/p/:_id', function (params) {
    this.subscribe('singlePost', params._id);
  });

  Meteor.publish('todayLogs', function () {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    return Logs.find({createdAt: {$gte: date}}, {sort: {createdAt: -1}});
  });
  Meteor.publish('allAnonymousLogs', function () {
    return AnonymousLogs.find({}, {sort: {createdAt: -1}});
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

  // via https://dweldon.silvrback.com/common-mistakes
  Meteor.users.deny({
    update: function() {
      return true;
    }
  });
}
