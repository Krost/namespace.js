require('../namespace.js');
namespace.autoload({ 'app': __dirname + '/app' }).resolveForRequire();
let user   = require('app.model.User');
let andrew = new user();
console.log(andrew);