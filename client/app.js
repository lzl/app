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
    this.render('loginPanel');
  }
}, {
  only: ['dashboard', 'postEditForm']
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
  this.render('postWidePanel', {
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
  this.render('postEditForm', {
    data: function () {
      return Posts.findOne(this.params._id);
    }
  });
}, {
  name: 'postEditForm',
  onAfterAction: function () {
    var post = Posts.findOne({
      _id: this.params._id
    });
    document.title = post.title + ' - LZL';
  }
});

Router.route('/c/:_id', function () {
  this.wait([
    subs.subscribe('anonymousCommentAndPost', this.params._id),
    subs.subscribe('anonymousCommentChildren', this.params._id)
  ]);
  if (this.ready()) {
    var comment = AnonymousComments.findOne(this.params._id);
    this.render('anonymousCommentsWidePanel', {
      data: function () {
        return {
          comment: comment,
          post: Posts.findOne(comment.postId)
        };
      }
    });
    scroll(0,0);
  }
}, {
  name: 'anonymousComments',
  onAfterAction: function () {
    document.title = 'Discussion - LZL';
  }
});

Router.route('/dashboard', function () {
  this.wait([
    subs.subscribe('limitedLogs', 7),
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

Template.logItem.rendered = function () {
  masonry();
};

Template.logItem.destroyed = function () {
  masonry();
};

Template.postPanel.rendered = function () {
  masonry();
};

Template.postPanel.destroyed = function () {
  masonry();
};

Template.anonymousCommentItem.rendered = function () {
  masonry();
};

Template.anonymousCommentItem.destroyed = function () {
  masonry();
};

Template.postEditForm.rendered = function () {
  $('textarea').autosize();
}

Template.navbar.helpers({
  offline: function () {
    return Meteor.status().connected;
  }
});

Template.logsPanel.helpers({
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

Template.postPanel.helpers({
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

Template.anonymousCommentsPanel.helpers({
  comments: function () {
    return AnonymousComments.find({userId: "anonymousUserId"}, {sort: {createdAt: -1}});
  }
});

Template.anonymousCommentsWidePanel.helpers({
  comments: function () {
    return AnonymousComments.find({parentId: this.comment._id}, {sort: {createdAt: 1}});
  }
});

Template.anonymousCommentWideItem.helpers({
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

Template.logInsertForm.events({
  'keyup textarea': function () {
    $('textarea').autosize();
  },
  'submit form': function (e, tmpl) {
    e.preventDefault();
    var text = tmpl.find('#logText').value;
    text = $.trim(text);
    if (!text) return;
    Meteor.call('logSubmit', text);
    tmpl.find('form').reset();
    tmpl.find('form').focus();
  }
});

Template.logItemButtons.events({
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

Template.anonymousCommentItemButtons.events({
  'click .link': function (e) {
    e.preventDefault();
    if (this.postId) {
      var id = this._id;
      Router.go('anonymousComments', {_id: id});
    } else if (this.parentId) {
      var id = this.parentId;
      Router.go('anonymousComments', {_id: id});
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

Template.postInsertForm.events({
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

Template.anonymousCommentInsertForm.events({
  'submit form': function (e, tmpl) {
    e.preventDefault();
    var text = tmpl.find('[type=text]').value;
    text = $.trim(text);
    if (!text) return;
    var postId = tmpl.data._id;
    var val = {text: text, postId: postId, parentId: null, userId: "anonymousUserId"};
    var id = Meteor.call('anonymousCommentSubmit', val, function (error, result) {
      Router.go('anonymousComments', {_id: result});
    });
  }
});

Template.anonymousCommentInsertWideForm.events({
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

Template.postEditForm.events({
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
