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
    check(val, String);
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
    check(val, String);
    return AnonymousLogs.insert({
      text: val,
      createdAt: new Date()
    });
  },
  postSubmit: function (val) {
    check(val, {
      title: String,
      text: String,
      topic: String
    });
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    if (!val.title || !val.text || !val.topic) {
      throw new Meteor.Error(411, "Length required.")
    }
    var postId = Posts.insert({
      title: val.title,
      text: val.text,
      topic: val.topic,
      userId: Meteor.userId(),
      createdAt: new Date()
    });
    var autoLog = 'New: [' + val.title + '](/p/' + postId + ')';
    return Meteor.call('logSubmit', autoLog);
  },
  anonymousCommentSubmit: function (val) {
    check(val, {
      text: String,
      postId: Match.OneOf(String, null),
      parentId: Match.OneOf(String, null),
      userId: String
    });
    if (!val.text) {
      throw new Meteor.Error(411, "Length required.")
    }
    return AnonymousComments.insert({
      text: val.text,
      postId: val.postId,
      parentId: val.parentId,
      userId: val.userId,
      createdAt: new Date()
    });
  },
  logRemove: function (id) {
    check(id, String);
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    return Logs.remove(id);
  },
  anonymousLogRemove: function (id) {
    check(id, String);
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    return AnonymousLogs.remove(id);
  },
  postEdit: function (id, val) {
    check(id, String);
    check(val, {
      title: String,
      text: String,
      topic: String
    });
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    if (!val.title || !val.text || !val.topic) {
      throw new Meteor.Error(411, "Length required.");
    }
    Posts.update(id, {$set: val});
    var autoLog = 'Updated: [' + val.title + '](/p/' + id + ')';
    return Meteor.call('logSubmit', autoLog);
  },
  postRemove: function (id) {
    check(id, String);
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    Posts.remove(id);
    return AnonymousComments.remove({postId: id});
  },
  anonymousCommentRemove: function (id) {
    check(id, String);
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    return AnonymousComments.remove(id);
  },
  anonymousCommentRemoveChildren: function (id) {
    check(id, String);
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    return AnonymousComments.remove({parentId: id});
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

  var capitaliseFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  var subs = new SubsManager();

  Router.onBeforeAction(function () {
    if (isAdmin()) {
      this.next();
    } else {
      this.render('login');
    }
  }, {
    only: ['dashboard', 'postEdit']
  });

  Router.route('/', function () {
    this.wait([subs.subscribe('allPosts'), subs.subscribe('limitedLogs', 1)]);
    this.render('allPosts');
  }, {
    name: 'allPosts',
    onAfterAction: function () {
      document.title = 'LZL';
    }
  });

  Router.route('/t/:topic', function () {
    var topic = this.params.topic;
    Session.set('topic', topic);
    this.wait(subs.subscribe('topicPosts', topic));
    this.render('topicPosts');
    scroll(0,0);
  }, {
    name:'topicPosts',
    onAfterAction: function () {
      var topic = this.params.topic;
      topic = capitaliseFirstLetter(topic);
      document.title = topic + ' - LZL';
    }
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
    name: 'singlePost',
    onAfterAction: function () {
      var post = Posts.findOne({
        _id: this.params._id
      });
      document.title = post.title + ' - LZL';
    }
  });

  Router.route('/p/:_id/edit', function () {
    this.wait(subs.subscribe('singlePost', this.params._id));
    this.render('postEdit', {
      data: function () {
        return Posts.findOne(this.params._id);
      }
    });
  }, {
    name: 'postEdit',
    onAfterAction: function () {
      var post = Posts.findOne({
        _id: this.params._id
      });
      document.title = post.title + ' - LZL';
    }
  });

  Router.route('/c/:_id', function () {
    this.wait([
      subs.subscribe('singleAnonymousComment', this.params._id),
      subs.subscribe('singleAnonymousCommentChildren', this.params._id)
    ]);
    if (this.ready()) {
      var comment = AnonymousComments.findOne(this.params._id);
      subs.subscribe('singlePost', comment.postId);
      this.render('cardForSingleAnonymousComment', {
        data: function () {
          return {
            comment: AnonymousComments.findOne(this.params._id),
            post: Posts.findOne(comment.postId)
          };
        }
      });
      scroll(0,0);
    }
  }, {
    name: 'singleAnonymousComment',
    onAfterAction: function () {
      document.title = 'Discussion - LZL';
    }
  });

  Router.route('/dashboard', function () {
    this.wait([
      subs.subscribe('limitedLogs', 7),
      subs.subscribe('allAnonymousLogs'),
      subs.subscribe('allAnonymousComments')
    ]);
    this.render('dashboard');
  }, {
    name: 'dashboard',
    onAfterAction: function () {
      document.title = 'Dashboard - LZL';
    }
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

  Template.cardForSingleLog.destroyed = function () {
    masonry();
  };

  Template.cardForPosts.rendered = function () {
    masonry();
  };

  Template.cardForPosts.destroyed = function () {
    masonry();
  };

  Template.anonymousLog.rendered = function () {
    masonry();
  };

  Template.anonymousLog.destroyed = function () {
    masonry();
  };

  Template.anonymousComment.rendered = function () {
    masonry();
  };

  Template.anonymousComment.destroyed = function () {
    masonry();
  };

  Template.postEdit.rendered = function () {
    $('textarea').autosize();
  }

  Template.navbar.helpers({
    offline: function () {
      return Meteor.status().connected;
    }
  });

  Template.cardForLogs.helpers({
    logs: function () {
      if (Router.current().route.getName() === "dashboard") {
        return Logs.find({}, {sort: {createdAt: -1}});
      } else {
        var date = new Date();
        date.setDate(date.getDate() - 1);
        return Logs.find({createdAt: {$gte: date}}, {sort: {createdAt: -1}});
      }
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
      return AnonymousComments.find({userId: "anonymousUserId"}, {sort: {createdAt: -1}});
    }
  });

  Template.cardForSingleAnonymousComment.helpers({
    comments: function () {
      return AnonymousComments.find({parentId: this.comment._id}, {sort: {createdAt: 1}});
    }
  });

  Template.singleAnonymousComment.helpers({
    isAdmin: function () {
      if (this.userId !== "anonymousUserId") {
        return "list-group-item-info";
      } else {
        return;
      }
    }
  });

  Template.navbar.events({
    'click .reconnect': function (e) {
      e.preventDefault();
      Meteor.reconnect();
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
      if (this.postId) {
        var id = this._id;
        Router.go('singleAnonymousComment', {_id: id});
      } else if (this.parentId) {
        var id = this.parentId;
        Router.go('singleAnonymousComment', {_id: id});
      }
    },
    'click .delete': function (e) {
      e.preventDefault();
      var id = this._id;
      if (this.postId) {
        var isParent = true;
      }
      swal({
        title: "Are you sure?",
        text: "You will not be able to recover this comment!",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Yes, delete it!",
        closeOnConfirm: true
      }, function () {
        if (isParent) {
          Meteor.call('anonymousCommentRemoveChildren', id);
        }
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
      var val = {text: text, postId: postId, parentId: null, userId: "anonymousUserId"};
      swal({
        title: "Preview",
        text: text,
        type: "info",
        showCancelButton: true,
        confirmButtonText: "Yes, submit it!",
        cancelButtonText: "No, cancel plx!",
        closeOnConfirm: true,
        }, function (isConfirm) {
          if (isConfirm) {
            var id = Meteor.call('anonymousCommentSubmit', val,
              function (error, result) {
                Router.go('singleAnonymousComment', {_id: result});
            });
          } else {
            tmpl.find('form').focus();
          }
      });
    }
  });

  Template.anonymousCommentFormForSingleAnonymousComment.events({
    'submit form': function (e, tmpl) {
      e.preventDefault();
      var text = tmpl.find('[type=text]').value;
      text = $.trim(text);
      var userId;
      if (!text) return;
      var parentId = tmpl.data.comment._id;
      if (isAdmin()) {
        userId = Meteor.userId();
      } else {
        userId = "anonymousUserId";
      }
      var val = {text: text, postId: null, parentId: parentId, userId: userId};
      Meteor.call('anonymousCommentSubmit', val);
      tmpl.find('form').reset();
      tmpl.find('form').focus();
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
      Router.go('singlePost', {_id: id});
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
}

if (Meteor.isServer) {
  FastRender.route('/', function () {
    this.subscribe('allPosts');
    this.subscribe('limitedLogs', 1);
  });
  FastRender.route('/t/:topic', function (params) {
    this.subscribe('topicPosts', params.topic);
  });
  FastRender.route('/p/:_id', function (params) {
    this.subscribe('singlePost', params._id);
  });

  Meteor.publish('limitedLogs', function (limit) {
    check(limit, Number);
    var date = new Date();
    date.setDate(date.getDate() - limit);
    return Logs.find({createdAt: {$gte: date}}, {sort: {createdAt: -1}});
  });
  Meteor.publish('allAnonymousLogs', function () {
    return AnonymousLogs.find({}, {sort: {createdAt: -1}});
  });
  Meteor.publish('allPosts', function () {
    return Posts.find({}, {sort: {createdAt: -1}});
  });
  Meteor.publish('topicPosts', function (topic) {
    check(topic, String);
    return Posts.find({topic: topic}, {sort: {createdAt: -1}});
  });
  Meteor.publish('singlePost', function (id) {
    check(id, String);
    return Posts.find({_id: id});
  });
  Meteor.publish('allAnonymousComments', function () {
    return AnonymousComments.find({userId: "anonymousUserId"}, {sort: {createdAt: -1}});
  });
  Meteor.publish('singleAnonymousComment', function (id) {
    check(id, String);
    return AnonymousComments.find({_id: id});
  });
  Meteor.publish('singleAnonymousCommentChildren', function (id) {
    check(id, String);
    return AnonymousComments.find({parentId: id}, {sort: {createdAt: 1}});
  });

  // via https://dweldon.silvrback.com/common-mistakes
  Meteor.users.deny({
    update: function() {
      return true;
    }
  });
}
