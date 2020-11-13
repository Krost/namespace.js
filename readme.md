Namespace with autoloading files.

# Concept

One object = one file.

# Usage
```js
// First you need to define autoloader paths
autoload({ 'app': '/www/root/js/app' [, 'module': '/www/root/js/module'] });

// If you want to get path for namespace just pass string as argument in method
var path = autoload('app'); // Will return '/www/root/js/app'
```
Script has four methods:
`autoload` - define new autoloader paths
`namespace` - define new object in namespace
`is`        - special method for build extend array
`use`       - special method for usage definitions

```js
namespace(
    'app.components.Base',
    [is('name.extend.object1', ['name.extend.object2'])],
    [use('name.of.use.object1', ['name.of.use.object2'])],
    ['name.of.use.object3', ['name.of.use.object4']],
    function() | { }
);
```
```js
use(
    'app.components.Component',
    function(Component) {
    
    }
);
```
`namespace` method must contains two required arguments:
* name of the object (_first argument_ -- arguments[0])
* object or function - factory of defined name (_last argument_ -- arguments[arguments.length - 1])

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

Arguments between first and last will be used as extend or use definitions. If you call `namespace` with use definitions, then last argument must be a function that takes arguments likes your set uses.
```js
namespace(
    'app.components.Component',
    is('app.components.Base'),
    function() {
        // Prototype of this function will be extended by Base object
        console.log(this.prop);
    }
);
```


```js
namespace(
    'app.components.Component',
    use('app.components.Base'),
    function(Base) { // This is required function because use definition not empty
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
    function(Base) {
        return function() {
            console.log(Base.prop);
        }
    }
);
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
autoload({ 'app': '/app' }); // This define autoload paths
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
npm install @urusov/ns-js
```

#### Usage

Then in `main` file you need to require `namespace-js` module, which will define global functions.

```js
require('@urusov/ns-js');
```

After this you need to define application autoloads paths

```js
autoload({ 'app': __dirname + '/app' });
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

