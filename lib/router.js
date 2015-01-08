isAdmin = function () {
  var user = Meteor.user();
  var isAdmin = Roles.userIsInRole(user, 'admin');
  return isAdmin;
};

var capitaliseFirstLetter = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

var subs = new SubsManager();

Router.configure({
  layoutTemplate: 'appBody',
  loadingTemplate: 'loading'
});

Router.onBeforeAction(function () {
  if (isAdmin()) {
    this.next();
  } else {
    this.render('loginPanel');
  }
}, {
  only: ['dashboard', 'postEditForm']
});

Router.route('/dashboard', {
  name: 'dashboard',
  waitOn: function () {
    return [subs.subscribe('limitedLogs', 7), subs.subscribe('allAnonymousComments')];
  },
  onAfterAction: function () {
    document.title = 'Dashboard - LZL';
  }
});

Router.route('/', {
  name: 'allPosts',
  waitOn: function () {
    return [subs.subscribe('mainPosts'), subs.subscribe('otherPosts'), subs.subscribe('limitedLogs', 1)];
  },
  fastRender: true,
  onAfterAction: function () {
    document.title = 'LZL';
  }
});

Router.route('/t/:topic', {
  name:'topicPosts',
  waitOn: function () {
    var topic = this.params.topic;
    return subs.subscribe('topicPosts', topic);
  },
  fastRender: true,
  onAfterAction: function () {
    var topic = this.params.topic;
    topic = capitaliseFirstLetter(topic);
    document.title = topic + ' - LZL';
    scroll(0,0);
  }
});

Router.route('/p/:_id', {
  name: 'singlePost',
  template: 'postWidePanel',
  data: function () {
    return Posts.findOne(this.params._id);
  },
  waitOn: function () {
    return subs.subscribe('singlePost', this.params._id);
  },
  fastRender: true,
  onAfterAction: function () {
    var post = Posts.findOne({
      _id: this.params._id
    });
    document.title = post.title + ' - LZL';
    scroll(0,0);
  }
});

Router.route('/p/:_id/edit', {
  name: 'postEditForm',
  data: function () {
    return Posts.findOne(this.params._id);
  },
  waitOn: function () {
    return subs.subscribe('singlePost', this.params._id);
  },
  onAfterAction: function () {
    var post = Posts.findOne({
      _id: this.params._id
    });
    document.title = post.title + ' - LZL';
  }
});

Router.route('/c/:_id', function () {
  this.wait([subs.subscribe('anonymousCommentAndPost', this.params._id), subs.subscribe('anonymousCommentChildren', this.params._id)]);
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
  } else {
    this.render('loading');
  }
}, {
  name: 'anonymousComments',
  onAfterAction: function () {
    document.title = 'Discussion - LZL';
  }
});

Router.route('/search', {
  name: 'searchResult',
});
