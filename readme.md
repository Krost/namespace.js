Namespace with autoloading files.

# Concept

One object = one file.

# Usage

Script is define global functions and object.

## namespace

Object provides base methods to change behavior.

### namespace.debug(bool status,  string prefix = null)

Change script debug status. If debug enabled script will log in console each operation with `debug` level.

```js
namespace.debug(true); // prefix defaults is '[namespace.js]'
```

### namespace.listen(string eventName)

Change default document event which indicates that script it's ready to run. Default event is `DOMContentLoaded`.

```js
namespace.listen('app.ready'); // Now will listen `app.ready` event and not run on `DOMContentLoaded`
```

Previous global alias for this method is `listen`, but it's deprecated and will remove in future releases.

### namespace.autoload(object paths |  string name | null)

Register new autoloader paths, return path for specified name or return all paths.

```js
namespace.autoload({ 'app': '/app' });           // This is register new autoloader path for `app.*` objects
namespace.autoload({ 'app': '/app' }, 'module'); // Will attach all scripts with type = 'module' (default is 'text/javascript')
console.log(namespace.autoload('app'));          // Will return path for `app` - '/app'
console.log(namespace.autoload());               // Will return all registered paths - { 'app': '/app' }
```

Previous global alias for this method is `autoload`, but it's deprecated and will remove in future releases.

### namespace.resolve(name)

Return filename by passed name. If filename is not resolved return null.

```js
namespace.autoload({ 'app': '/app' });
console.log(namespace.resolve('app.App')); // Output - /app/App.js
```

### namespace.resolveForRequire()

Modify global `require` function and allow it resolve filename by registered namespace. Available only for NodeJS.

```js
namespace.autoload({ 'app': __dirname + '/app' }).resolveForRequire();
let app = require('app.App'); // Will require file by path __dirname + '/app/App.js'
let [ user, config ] = require([ 'app.model.User', 'app.Config' ]); // Will return array and unpack it to variables
```

### namespace.app(name)

Register global alias for internal object storage.

```js
namespace.app('example'); // This will register global.example with all defined objects
// after this you can get all defined objects using global link
console.log(window.example); // Outputs internal storage
```

### namespace('name', [ 'use1', [ 'use2' ... ] ], factory)

Define new namespace object.

```js
namespace(
    'app.components.Base',
    [is('name.extend.object1', ['name.extend.object2'])],
    [use('name.of.use.object1', ['name.of.use.object2'])],
    ['name.of.use.object3', ['name.of.use.object4']],
    class | function() | { }
);
```

Function must contains two required arguments:

* name of the object (_first argument_ -- arguments[0])
* object, function or class - factory of defined name (_last argument_ -- arguments[arguments.length - 1])

```js
namespace('app.components.Base', {
    prop: "value"
});
```

```js
namespace('app.components.Base', function() {
    // This is constructor
});
```

```js
namespace('app.model.Base', class {
    db = 'main';
});
```

```js
namespace('app.model.User', 'app.model.Base', (Base) => {
    return class extends Base {
        table = 'user';
    }
});
```

Arguments between first and last will be used as extend or use definitions. If you call `namespace` with use definitions, then last argument must be a function that takes arguments likes your set uses.

```js
namespace(
    'app.components.Component',
    is('app.components.Base'),
    function() {
        // Prototype of this function will be extended by Base object
        // NOT working with classes because class.prototype is read-only in strict mode
        console.log(this.prop);
    }
);
```

```js
namespace(
    'app.components.Component',
    use('app.components.Base'),
    (Base) => { // This is required function because use definition not empty
        // In this function you can get defined object earlier just call this.{namespace}
        // Now, Base == this.app.components.Base
        return { // Here you must return object or function
            prop: Base.prop
        }
    }
);
```

```js
namespace(
    'app.components.Component',
    'app.components.Base', // This is simple usage definition
    (Base) => {
        return () => {
            console.log(Base.prop);
        }
    }
);
```

Also you can use definition object. When you pass just a single argument in namespace method - it returns definition object that has 3 methods: `use`, `is`, `define`. `define` method works like factory (you need to pass object or function as this method argument).

```js
namespace('app.Config').define({
    name: 'Application'
});
```

```js
namespace('app.Router')
    .use('app.Config', 'app.Path')
    .define((Config, Path) => {
        // You need to return object here because usage list not empty
        return {};
    }
);
```

```js
namespace('app.model.User')
    .is('app.model.Base')
    .use('app.components.Api')
    .define((Api) => {
        return {};
    }
);
```

If you define `async` method as factory `namespace` will run and await this factory before save in storage.

```js
namespace('app.view.Template', async () => { // This method will run immedeatly before storage saving
    let html = await fetch('/assets/view.html').then(response => { return response.text(); });
        html = (new DOMParser()).parseFromString(html, 'text/html');
    return { // This is app.view.Template factory
        $get(query) {
            let template = html.querySelector(query);
            if (template === null) { throw new Error('Template with selector `' + query + '` not found'); }
            return template;
        }
    }
});
use('app.view.Template', (Template) => { // This will wait until template not loaded
    console.log(Template); // Outputs - { $get: () }
})
```

## use

Globally defined function that allow run script and autoload required objects.

```js
use('app.App', (App) => { // Will try to autoload 'app.App' from '/app/App.js' file
    App.start();
});
```

## is

Special globally defined function that returns array of passed arguments with special `extends` prefix.

```js
namespace('app.model.Base', {
    db: 'main'
});
namespace('app.model.User', is('app.model.Base'), {
    table: 'user',
}); // Extend `User` object with `Base` properties
```

# Examples

#### Define new object

```js
namespace('app.components.Base', {
    prop: "value",
    func: function() {
    
    }
});
```

```js
namespace('app.components.Component', function() {
    console.log('This is component constructor');
});
```

```js
namespace('app.components.User', class User {
    
});
```

```js
namespace('app.Config').define({
    name: 'Application'
});
```

```js
namespace('app.Template', async() => {
    // here you can load some templates (as example) or other stuff
    return {}; // must return factory
});
```

#### Define with extends or usage

```js
namespace('app.components.Component', is('app.components.Base'), function() {
    // Prototype of this function will be extended by Base object
});
```
```js
namespace('app.components.Component', is('app.components.Base'), {
    // This object will be extended by Base object
});
```
```js
namespace('app.components.Component', use('app.components.Base'), function(Base) {
    // Here you must return something (object|function) to define new object for `app.components.Component`
    return function() { // Constructor
        console.log(Base.prop);
    }
});
```
```js
namespace('app.components.Component', 'app.components.Base', function(Base) {
    return {
        prop: Base.prop
    }
});
```
```js
namespace('app.model.Base', class {
    db = 'main';
});
namespace('app.model.User', 'app.model.Base', (Base) => {
    return class extends Base {
        table = 'user';
    }
});
```
```js
namespace('app.App')
.use('app.Config', 'app.Router')
.define(function(Config, Router) {
    return {
        start: function() {}
    }
});
```

#### Usage in {main}

```js
use('app.components.Component', function(Component) {
    // This is {main} method in your application
});
```

# Usage with HTTP

For usage namespace with simple http applications you need to attach script file to body

```html
<script type="text/javascript" src="/vendor/namespace.min.js"></script>
```

Then imagine - you have one `main` file which attached to body

```html
<script type="text/javascript" src="/app/main.js"></script>
```

In this file you need to define autoloader paths and just run application with `use` function

```js
namespace.autoload({ 'app': '/app' }); // This define autoload paths
use(
    'app.App',
    function(App) {
        App.start();
    }
);
// This call of use function will automatically attach file 'app/App.js' to body
```

When you pass `use` definitions in namespace, script will automatically attach js file to body and only after it loaded will execute method.
If defined namespace was already loaded - just return it.

```js
namespace(
    'app.App',
    use(
        'app.Config',
        'app.Page',
        'app.Layout',
    ),
    function(config, page, layout) {
        // This method will run only when all files is attached and loaded
        // You need to return some object
        return {
            config: config,
            page:   page,
            layout: layout,
            start:  function() {
                alert('Application start!');
            }
        }
    }
);
```

This usage will attach files like this

```html
<script type="text/javascript" src="/app/Config.js"></script>
<script type="text/javascript" src="/app/Page.js"></script>
<script type="text/javascript" src="/app/Layout.js"></script>
```

#### Packing?

Of course! If you pack files in single - namespace will check all definitions and not attach defined files.

# Usage with Node.js

#### Installation

```js
npm install unamespace
```

#### Usage

Then in `main` file you need to require `unamespace` module, which will define global functions.

```js
require('unamespace');
```

After this you need to define application autoloads paths

```js
namespace.autoload({ 'app': __dirname + '/app' });
// This will allow to load all 'app.*' definitions from specified directory
```

You can use namespace to load installed node modules like this

```js
use(
    'express', // This will auto-require module `express` and pass it to the function
    function(express) {
        
    }
);
```

or this

```js
// ./app/App.js
namespace('app.App', use('express.request'), function(request) {
     // This will load `request` object from `express` module
});
```

Definition of namespace in file will exports node module

```js
// ./app/model/User.js
namespace('app.model.User', function(id) {
    this.id = id;
});
```

```js
var User   = require('./app/model/User.js');
var andrew = new User(1);
console.log(andrew.id);
```

When you modify global `require` function by `resolveForRequire` calling, you can define classes like this

```js
// ./app/model/Base.js
namespace('app.model.Base', class {
    db = 'main';
});
```

```js
// ./app/model/User.js
namespace('app.model.User', class extends require('app.model.Base') {
    table = 'user';
});
```

