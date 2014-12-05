Package.describe({
  name: 'lizunlong:sweetalert',
  summary: 'A beautiful replacement for JavaScript\'s "alert" without Google Font API',
  version: '0.3.2',
  git: ' /* Fill me in! */ '
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');
  api.addFiles([
        'sweetalert/sweet-alert.html',
        'sweetalert/sweet-alert.css',
        'sweetalert/sweet-alert.js'
    ], ['client']);
});
