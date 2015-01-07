// @ Meteor Shell
// Roles.createRole("admin");
// Roles.addUsersToRoles(id, "admin");

Meteor.publish('limitedLogs', function (limit) {
  check(limit, Number);
  var date = new Date();
  date.setDate(date.getDate() - limit);
  return Logs.find({createdAt: {$gte: date}}, {sort: {createdAt: -1}});
});
// Meteor.publish('allPosts', function () {
//   return Posts.find({}, {sort: {createdAt: -1}});
// });
Meteor.publish('mainPosts', function () {
  return Posts.find({topic: {$in: ['unschooling', 'meteor']}}, {sort: {createdAt: -1}, limit: 20});
});
Meteor.publish('otherPosts', function () {
  var date = new Date();
  date.setDate(date.getDate() - 30);
  return Posts.find({topic: {$nin: ['unschooling', 'meteor']}, createdAt: {$gte: date}}, {sort: {createdAt: -1}});
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
  var date = new Date();
  date.setDate(date.getDate() - 7);
  return AnonymousComments.find({userId: "anonymousUserId", createdAt: {$gte: date}}, {sort: {createdAt: -1}});
});
Meteor.publishComposite('anonymousCommentAndPost', function (id) {
  check(id, String);
  return {
    find: function () {
      return AnonymousComments.find({_id: id});
    },
    children: [{
      find: function (comment) {
        return Posts.find({_id: comment.postId});
      }
    }]
  }
});
Meteor.publish('anonymousCommentChildren', function (id) {
  check(id, String);
  return AnonymousComments.find({parentId: id}, {sort: {createdAt: 1}});
});

// via https://dweldon.silvrback.com/common-mistakes
Meteor.users.deny({
  update: function() {
    return true;
  }
});
