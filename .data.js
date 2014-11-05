if (Meteor.isServer) {
  // if the database is empty on server start, create some sample data.
  Meteor.startup(function () {
    if (Posts.find().count() === 0) {
      var data = [
        {title: "Overview", text: "The Meteor Project is a little bit like the Apache Foundation or the Free Software Foundation in that it is an umbrella organization that stewards the development of a set of open source projects. This page has information on each of the subprojects currently being sponsored by the Meteor Project.", topic: "meteor"},
        {title: "Blaze", text: "Meteor Blaze is a powerful library for creating live-updating user interfaces. Blaze fulfills the same purpose as Angular, Backbone, Ember, React, Polymer, or Knockout, but is much easier to use. We built it because we thought that other libraries made user interface programming unnecessarily difficult and confusing.", topic: "meteor"},
        {title: "Tracker", text: "Weighing in at about a kilobyte, Meteor Tracker is an incredibly tiny but incredibly powerful library for transparent reactive programming in JavaScript.", topic: "meteor"},
        {title: "DDP", text: "DDP, the Distributed Data Protocol, is a simple protocol for fetching structured data from a server, and receiving live updates when that data changes.\bDDP is like 'REST for websockets'. Like REST, it is a simple, pragmatic approach to providing an API. But it is websocket-based, unlike REST, allowing it to be used to deliver live updates as data changes. Implementation of DDP is simple (it's just a few JSON messages over a websocket) and the spec fits on a couple of pages.", topic: "meteor"},
        {title: "Livequery", text: "Meteor Livequery is a family of live database connectors. These connectors let you perform 'live queries' against your favorite database: queries that not only return the result of the query at the time it is made, but that then go on to return a stream of create, update, and delete messages that inform you of any changes to the result of the query as time passes.", topic: "meteor"},
        {title: "Full Stack Database Drivers", text: "On the server, queries and updates work directly with the real database, like normal.", topic: "meteor"},
        {title: "Isobuild", text: "Like make, gcc, and ld in the Unix world, or the command-line Visual Studio tools in the Windows world, Meteor Isobuild is a complete toolchain for building an app from its source code into a set of runnable programs.", topic: "meteor"},
        {title: "Meteor Tool", text: "The Meteor Tool is an integrated command-line tool for developing apps on Meteor. It is like a command-line-based IDE for Meteor.", topic: "meteor"},
        {title: "写作", text: "写作，应简洁而有条理，这既可增加读者通读并理解的概率，也可节省他们的时间，从而有效表达，达到写作的目的。如何写出简洁而有条理的文字？多读、多写、反复改，如果能用更清晰的形式来表达，就不要吝惜删除以前的，哪怕它再大段。", topic: "unschooling"},
        {title: "阅读", text: "阅读之所以重要，是因为它具有营造环境的能力。阅读他人的文字，相当于合法窥探作者的大脑，了解他们平时都想些什么、遇到问题怎么处理、把事情想明白后如何清晰地表达出来。这就相当于你的生活环境中复制出了多位虚拟人物，他们会修正你的价值取向，从而影响你的选择，而这正是通过阅读一点点营造出来的环境的效用。", topic: "unschooling"}
      ];

      var timestamp = (new Date()).getTime();
      _.each(data, function(post) {
        Posts.insert({
          title: post.title,
          text: post.text,
          topic: post.topic,
          createdAt: new Date(timestamp)
        });
        timestamp += 1;
      });
    }
  });
}
