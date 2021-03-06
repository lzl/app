Posts = new Mongo.Collection('posts');
Logs = new Mongo.Collection('logs');
AnonymousComments = new Mongo.Collection('anonymousComments');

EasySearch.createSearchIndex('posts', {
  'collection': Posts,
  'field': ['title', 'text', 'topic'],
  'use': 'mongo-db',
  'sort': function() {
    return { 'createdAt': -1 };
  }
});

EasySearch.createSearchIndex('logs', {
  'collection': Logs,
  'field': ['text'],
  'use': 'mongo-db',
  'sort': function() {
    return { 'createdAt': -1 };
  }
});

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
  logRemove: function (id) {
    check(id, String);
    if (! isAdmin()) {
      throw new Meteor.Error(401, "The request requires user authentication.");
    }
    return Logs.remove(id);
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
