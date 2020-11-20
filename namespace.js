/**
 * ns-js | namespace | unamespace
 *
 * Namespace with autoloading
 *
 * @author  Andrew Urusov <krost.mail@gmail.com>
 * @link    http://github.com/krost/namespace-js
 * @package	unamespace
 * @licence MIT
 */
(function(launchMode, global) {
    "use strict";

    var startEvent  = 'DOMContentLoaded';

    /**
     * Priority
     */
    var P_NAMESPACE = 0;
    var P_USE       = 100000;

    /**
     * Namespace root
     * @type object
     */
    var $$ = {};

    /**
     * Registered namespaces
     * @type Object
     */
    var $namespaces  = {};

    /**
     * Already loaded files
     * @type {{}}
     */
    var $loaded      = {};

    /**
     * Files modules
     * @type {{}}
     */
    var $modules     = {};

    /**
     * Call namespace stack when dom not ready
     * @type {Array}
     */
    var $callstack   = [];

    /**
     * Dom ready state
     * @type {number}
     */
    var $domReady    = false;


    /**
     * Type check methods collection
     */
    var $is = {
        _function:  function(value) {
            return typeof value === 'function';
        },
        _string:    function(value) {
            return typeof value === 'string' || value instanceof String;
        },
        _number:    function(value) {
            return typeof value === 'number' && isFinite(value);
        },
        _array:     function(value) {
            return value && typeof value === 'object' && value.constructor === Array;
        },
        _object:    function(value) {
            return value && typeof value === 'object';
        },
        _null:      function(value) {
            return value === null;
        },
        _undefined: function(value) {
            return typeof value === 'undefined';
        },
        _bool:      function(value) {
            return typeof value === 'boolean';
        },
        set:        function(value) {
            return !$is._undefined(value) && !$is._null(value);
        },
        http: function() {
            return launchMode === 'http';
        },
    }

    /**
     * Dom ready listener
     */
    function $onDomReady() {
        if ($is.http()) { document.removeEventListener(startEvent, $onDomReady, false); }
        $domReady = true;

        // Sort by priority (namespace is first method to call)
        // namespace(0), namespace(0)+uses.length, use(1000)
        $callstack.sort(function(a, b) {
            if (a[0] == b[0]) return 0;
            return a[0] > b[0] ? 1 : -1;
        })

        var func;
        while(func = $callstack.shift()) {
            func[1].call($$);
        }
    }
    if (!$is.http()) { $onDomReady(); } else { document.addEventListener(startEvent, $onDomReady, false); }

    /**
     * Get namespace caller file
     * @returns {undefined|*}
     */
    function getCallerFile() {
        var originalFunc = Error.prepareStackTrace;
        var callerfile;
        try {
            var err = new Error();
            var currentfile;
            Error.prepareStackTrace = function (err, stack) { return stack; };
            currentfile = err.stack.shift().getFileName();
            while (err.stack.length) {
                callerfile = err.stack.shift().getFileName();
                if(currentfile !== callerfile) break;
            }
        } catch (e) {}
        Error.prepareStackTrace = originalFunc;
        return callerfile;
    }

    /**
     * Set namespace module
     * @param name
     * @param file
     */
    function setModule(name, file) {
        if ($is.http()) { return; }
        $modules[name] = require.cache[file];
    }

    /**
     * Export module data
     * @param object
     */
    function moduleExport(name, object, do_export) {
        if ($is.http() || !(do_export || false)) { return; }
        $modules[name].exports = object;
    }


    /**
     * Object.assign method add
     */
    Object.assign = Object.assign !== undefined ? Object.assign : function() {
        var target = arguments[0] || null;
        if (!target) { throw 'Invalid target'; }
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                target[key] = arguments[i][key];
            }
        }
        return target;
    };


    /**
     * Files autoloader
     * @param name
     * @param onLoad
     * @param onError
     * @returns {*}
     */
    function $autoload(name, onLoad, onError) {
        if ($loaded[name]) return onLoad();
        $loaded[name] = true;

        var aname = name.split('.');
        var file  = [aname.pop() + '.js'];
        var path, _name, left;

        do {
            left = aname.join('.');
            if (_name) file.unshift(_name);
            if (!$is.set($namespaces[left])) continue;
            var path = $namespaces[left] + '/' + file.join('/');
            break;
        } while(_name = aname.pop());
        if (!path && $is.http()) return onError();

        if (!$is.http()) {
            if (path) { require(path); } else {
                var oname  = name.split('.');
                var module = require(oname[0]);
                var object = oname.length > 1 ? module[oname[1]] : module;
                $object.put(name, null, object, false);
            }
            onLoad();
        } else {
            var script  = document.createElement('script');
            script.type = 'text/javascript';
            script.src  = path + '?' + Math.random();
            script.addEventListener('load',  onLoad);
            script.addEventListener('error', onError);
            document.getElementsByTagName('head')[0].appendChild(script);
        }
    }


    /**
     * Define helper
     * @param $factory
     * @param namespace
     */
    var $definition = function($factory, namespace) {
        var self    = this;
        var args    = [ namespace ];
        Object.assign(self, {
            use: function(name) {
                args.push('use:' + name);
                return self;
            },

            is: function(name) {
                args.push('is:' + name);
                return self;
            },

            define: function(object) {
                if (!$is._object(object) && !$is._function(object)) {
                    throw 'Invalid definition type';
                }
                args.push(object);
                $factory.apply($$, args);
            }
        });
    }


    /**
     * Object access general collection
     */
    var $object = {
        onReadyStack: [],

        bindReady: function(callback) {
            $object.onReadyStack.push(callback);
        },

        unbindReady: function(callback) {
            $object.onReadyStack = $object.onReadyStack.filter(function(cb) {
                return cb !== callback;
            });
        },

        onReadyCall: function(name) {
            $object.onReadyStack.map(function(callback) {
                if (callback(name)) {
                    $object.unbindReady(callback);
                }
            });
        },

        onReadyCheck: function(name) {
            if (!$object.exists(name)) return;
            $object.onReadyCall(name);
        },

        put: function(name, gname, object, do_export) {
            if (!$is._function(object) && !$is._object(object))
                throw 'Invalid namespace object: ' + name;

            var aname      = name.split('.');
            var objectName = aname.pop();
            var _name, _$$ = $$;

            while(_name = aname.shift()) {
                if (!$is.set(_$$[_name]))
                    _$$[_name] = {};
                _$$ = _$$[_name];
            }

            if ($is.set(_$$[objectName]))
                throw 'Item already exists in namespace: ' + objectName;
            if (gname && $is.set(global[gname]))
                throw 'Item already exists in global namespace: ' + gname;
            moduleExport(name, _$$[objectName] = object, do_export !== undefined ? do_export : true);
            if (gname && gname.length != 0)
                global[gname] = _$$[objectName];
            $object.onReadyCall(name);
        },

        get: function(name, collection) {
            name           = name.split('.');
            var objectName = name.pop();
            var _$$        = collection || $$;
            var _name;
            while(_name = name.shift()) {
                if (!$is.set(_$$[_name]))
                    return null;
                _$$ = _$$[_name];
            }
            return _$$[objectName] || null;
        },

        exists: function(name) {
            return !!$object.get(name);
        },

        load: function(name, onLoad) {
            if ($object.exists(name))
                return onLoad.call($$);
            $autoload(name, function() {
                return onLoad.call($$);
            }, function() {
                throw 'Invalid path for autoloading object: ' + name;
            });
        }
    };


    /**
     * General factory object
     * @type {{namespace: namespace, use: use, load: (function(*, *): Function)}}
     */
    var $factory = {
        // Public methods
        listen: function(eventName) {
            document.removeEventListener(startEvent, $onDomReady, false);
            startEvent = eventName;
            document.addEventListener(startEvent, $onDomReady, false);
        },

        autoload: function() {
            return $factory._autoload.apply($$, arguments);
        },

        namespace: function() {
            return $factory._namespace.apply($$, arguments);
        },

        use: function() {
            var args = [false];
            for (var i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            return $factory._use.apply($$, args);
        },

        is: function() {
            return $factory._is.apply($$, arguments);
        },

        _autoload: function() {
            if (arguments.length < 1)
                throw 'To few arguments in autoload method';
            if ($is._string(arguments[0]))
                return $namespaces[arguments[0]] || null;
            if (!$is._object(arguments[0]))
                throw 'Invalid argument type';
            return Object.assign($namespaces, arguments[0]);
        },

        // Private methods
        _namespace: function() {
            if (arguments.length < 1)
                throw 'To few arguments in namespace method';

            // Get current namespace and object factory
            var name  = arguments[0].split(':');
            var gname = name.length > 1 ? name[1] : false;
                 name = name[0];
            if (!$is._string(name))
                throw 'Invalid name type (string expected)';

            // set namespace module
            setModule(name, getCallerFile());

            // Check arguments count
            if (arguments.length === 1) {
                return new $definition($factory._namespace, name);
            }

            // Get factory
            var factory = arguments[arguments.length - 1];
            var uses    = [true];
            if (!$is._function(factory) && !$is._object(factory))
                throw 'Invalid factory type (function|object expected)';

            // Create uses list
            for (var i = 1; i < arguments.length - 1; i++) {
                if ($is._string(arguments[i])) {
                    if (arguments[i] == name) continue;
                    uses.push(arguments[i]);
                } else if ($is._array(arguments[i])) {
                    uses = uses.concat(arguments[i]);
                } else {
                    throw 'Invalid argument type (string or array expected)';
                }
            }

            // Push callstack method and load dependencies
            uses.push(function() {
                var loaded = { is: [], use: [] };
                for (var i = 0; i < arguments.length; i++) {
                    loaded[arguments[i][0]].push(arguments[i][1]);
                }

                // Get object
                var object = null;
                if (loaded.use.length) {
                    if (!$is._function(factory))
                        throw 'Invalid factory type (loaded not allowed for object factory)';
                    object = factory.apply($$, loaded.use);
                } else {
                    object = factory;
                }

                // Extend object or function
                if (loaded.is.length) {
                    if ($is._function(object)) {
                        loaded.is.unshift(object.prototype);
                        object.prototype = $factory.extend.apply($$, loaded.is);
                    } else {
                        loaded.is.unshift({});
                        loaded.is.push(object);
                        object = $factory.extend.apply($$, loaded.is);
                    }
                };

                // Push builded object
                $object.put(name, gname, object);
            });
            $factory._use.apply($$, uses);
        },

        _use: function(internal) {
            if (arguments.length < 2)
                throw 'To few arguments in use method';

            // Get factory
            var factory = arguments[arguments.length - 1];
            var uses    = [];
            if ($is._function(factory)) {
                for (var i = 1; i < arguments.length - 1; i++) {
                    if (!$is._string(arguments[i]))
                        throw 'Invalid argument type in use method (string expected)';
                    var prefix = arguments[i].indexOf(':') !== -1 ? '' : 'use:';
                    uses.push(prefix + arguments[i]);
                }
            } else {
                for (var i = 1; i < arguments.length; i++) {
                    if (!$is._string(arguments[i]))
                        throw 'Invalid argument type in use method (string expected)';
                    uses.push('use:' + arguments[i]);
                }
                return uses;
            }

            // Check factory
            if (!$is._function(factory))
                throw 'Factory is not a function';

            // Bind on ready before dom ready
            $object.bindReady($factory.ready(uses, $factory.build(uses, factory, internal)));

            // Factory init method
            var factoryStart = function() {
                // If no items - call immediately
                if (uses.length == 0)
                    return factory.call($$);

                // Push object onReady method
                uses.map(function(item) {
                    item = item.split(':')[1];
                    item = item.split('#')[0];
                    $object.load(item, function() {
                        $object.onReadyCheck(item);
                    });
                });
            };

            // Push to namestack if dom not ready
            if (!$domReady) {
                var priority = internal ? P_NAMESPACE + uses.length : P_USE;
                $callstack.push([priority, factoryStart]);
                return;
            }

            // If dom already ready - start factory immideatly
            factoryStart();
        },

        _is: function() {
            if (arguments.length < 1)
                throw 'To few arguments in extends method';
            var is = [];
            for (var i = 0; i < arguments.length; i++) {
                if (!$is._string(arguments[i]))
                    throw 'Invalid argument type in extends method';
                is.push('is:' + arguments[i]);
            }
            return is;
        },

        ready: function(uses, factory) {
            var _uses = uses.slice(0);
            return function(name) {
                if (_uses.length === 0) return true;
                _uses = _uses.filter(function(item) {
                    return name !== item.split(':')[1].split('#')[0];
                });
                if (_uses.length === 0) {
                    factory.call($$);
                    return true;
                }
                return false;
            }
        },

        build: function(uses, factory, internal) {
            return function() {
                var loaded = [];
                var object;
                uses.map(function(item) {
                    var type = item.split(':')[0];
                    var name = item.split(':')[1];
                    var prop = name.split('#')[1] || null;
                        name = name.split('#')[0];
                    object = $object.get(name);

                    // Check object and property
                    if (!object)
                        throw 'Object not found for: ' + name + '. Namespace missing or invalid?';
                    if (prop && $is._function(object)) {
                        throw 'Unable to use property for function factory';
                    } else if (prop) {
                        object = $object.get(prop, object);
                        if (!object)
                            throw 'Proeprty ' + prop + ' not found in ' + name;
                    }

                    loaded.push(internal ? [ type, object ] : object);
                });
                factory.apply($$, loaded);
            };
        },

        extend: function(out) {
            out = out || {};
            for (var i = 1; i < arguments.length; i++) {
                var obj = arguments[i];
                if (!obj) continue;
                for (var key in obj) {
                    if (!obj.hasOwnProperty(key))
                        continue;
                    if ($is._object(obj[key])) {
                        out[key] = $factory.extend(out[key], obj[key]);
                        continue;
                    }
                    out[key] = obj[key];
                }
            }
            return out;
        }
    }

    // Push some methods to $$
    Object.assign($$, {
        $get:    $object.get,
        $exists: $object.exists,
    });

    // Push vars to global context
    Object.assign(global, {
        $$:        $$,
        listen:    $factory.listen,
        autoload:  $factory.autoload,
        namespace: $factory.namespace,
        use:       $factory.use,
        is:        $factory.is,
    });
})(typeof window !== 'undefined' ? 'http' : 'node', typeof window !== 'undefined' ? window : global); // this -> window