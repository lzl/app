var masonry = function () {
  var container = document.querySelector('#masonry');
  // initialize Masonry
  var msnry = new Masonry( container );
  // layout Masonry again after all images have loaded
  imagesLoaded( container, function() {
    msnry.layout();
  });
};

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

Template.registerHelper("isRouter", function (name) {
  if (name) {
    return Router.current().route.getName() === name;
  }
});

// This is an ugly hack
Session.setDefault('logText', "");
Template.logInsertForm.rendered = function () {
  this.autorun(function () {
    var logText = Session.get('logText');
    masonry();
    console.log("Masonrified.");
  });
};
// Ugly hack ends

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

// Meteor.status BEGINS
// via https://github.com/nate-strauser/meteor-connection-banner
Session.setDefault('wasConnected', false);
Session.setDefault('isConnected', true);
Session.setDefault('logMore', 10);

Template.navbar.helpers({
  wasConnected: function () {
    return Session.equals('wasConnected', true);
  },
  isDisconnected: function () {
    return Session.equals('isConnected', false);
  }
});

Tracker.autorun(function () {
  var isConnected = Meteor.status().connected;
  if (isConnected) {
    Session.set('wasConnected', true);
  }
  Session.set('isConnected', isConnected);
});
// Meteor.status ENDS

Template.logsPanel.helpers({
  // logs: function () {
  //   if (Router.current().route.getName() === "dashboard") {
  //     return Logs.find({}, {sort: {createdAt: -1}});
  //   } else {
  //     var date = new Date();
  //     date.setDate(date.getDate() - Session.get('logMore'));
  //     return Logs.find({createdAt: {$gte: date}}, {sort: {createdAt: -1}});
  //   }
  // },
  logs: function () {
    return Logs.find({}, {sort: {createdAt: -1}});
  },
  preview: function () {
    return Session.get('logText');
  }
});

Tracker.autorun(function () {
  Meteor.subscribe('limitedLogs', Session.get('logMore'));
});

Template.logInsertForm.helpers({
  logText: function() {
    return Session.get('logText');
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
    return Router.current().params.topic;
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

Template.searchInput.helpers({
  indexes: function () {
    return ['logs', 'posts'];
  }
});

Template.searchResult.helpers({
  indexes: function () {
    return ['logs', 'posts'];
  }
});

Template.navbar.events({
  'click [data-action=reconnect]': function (e) {
    e.preventDefault();
    Meteor.reconnect();
  }
});

Template.logInsertForm.events({
  'keyup textarea': function (e, tmpl) {
    $('textarea').autosize();
    var text = tmpl.find('#logText').value;
    Session.set('logText', text);
  },
  'submit form': function (e, tmpl) {
    e.preventDefault();
    var text = tmpl.find('#logText').value;
    text = $.trim(text);
    if (!text) return;
    Meteor.call('logSubmit', text);
    Session.set('logText', "");
    tmpl.find('form').reset();
    tmpl.find('form').focus();
  }
});

Template.logsPanel.events({
  'click [data-action=more]': function (e) {
    e.preventDefault();
    Session.set('logMore', Session.get('logMore') + 10);
  }
});

Template.logItemButtons.events({
  'click [data-action=remove]': function (e) {
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
  },
  'click [data-action=fork]': function (e) {
    e.preventDefault();
    Session.set('logText', this.text);
  }
});

Template.anonymousCommentItemButtons.events({
  'click [data-action=go]': function (e) {
    e.preventDefault();
    if (this.postId) {
      var id = this._id;
      Router.go('anonymousComments', {_id: id});
    } else if (this.parentId) {
      var id = this.parentId;
      Router.go('anonymousComments', {_id: id});
    }
  },
  'click [data-action=remove]': function (e) {
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
  // [data-action=remove]
  // via http://bit.ly/1Ko0LtP by Nick Wientge
  'click [data-action=remove]': function(e) {
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
