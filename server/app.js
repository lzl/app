// @ Meteor Shell
// Roles.createRole("admin");
// Roles.addUsersToRoles(id, "admin");

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
FastRender.route('/c/:_id', function (params) {
  this.subscribe('anonymousCommentWideItem', params._id);
  this.subscribe('anonymousCommentWideItemChildren', params._id);
});

Meteor.publish('limitedLogs', function (limit) {
  check(limit, Number);
  var date = new Date();
  date.setDate(date.getDate() - limit);
  return Logs.find({createdAt: {$gte: date}}, {sort: {createdAt: -1}});
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
Meteor.publish('anonymousCommentWideItem', function (id) {
  check(id, String);
  return AnonymousComments.find({_id: id});
});
Meteor.publish('anonymousCommentWideItemChildren', function (id) {
  check(id, String);
  return AnonymousComments.find({parentId: id}, {sort: {createdAt: 1}});
});

// via https://dweldon.silvrback.com/common-mistakes
Meteor.users.deny({
  update: function() {
    return true;
  }
});
