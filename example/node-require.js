require('../namespace.js');
namespace.autoload({ 'app': __dirname + '/app' }).resolveForRequire();
let app = require('app.App');
app.start();