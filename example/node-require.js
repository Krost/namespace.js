require('../namespace.js');
autoload({ 'app': __dirname + '/app' });
var app = require('./app/App');
app.start();