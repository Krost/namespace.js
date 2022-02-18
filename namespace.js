/**
 * ns-js | namespace | unamespace
 *
 * Namespace with autoloading
 *
 * @author  Andrew Urusov <krost.mail@gmail.com>
 * @link    https://github.com/krost/namespace.js
 * @package	unamespace
 * @licence MIT
 * @version 1.3.0
 */
(function($launchMode, global) {
    "use strict";

    // Version
    let version      = '1.3.0';

    // Dom start event and ready state
    let $startEvent  = 'DOMContentLoaded';
    let $domReady    = false;

    // Initialization priority
    let P_NAMESPACE  = 0;
    let P_USE        = 100000;

    // Namespace object storage
    let $appName     = null;
    let $$           = {};

    // Autoloads paths
    let $autoloads   = {};

    // Already loaded files
    let $loaded      = {};

    // Callstack for not ready dom
    let $callstack   = [];

    // Files modules
    let $modules     = {};


    // General debug object
    let debug = {
        prefix: '[namespace.js]',
        status: false,
        disable() { this.status = false; },
        enable()  { this.status = true;  },
        log() {
            if (!this.status) return;
            [].unshift.call(arguments, this.prefix);
            console.debug.apply(null, arguments);
        }
    };

    /**
     * Object.assign method add
     */
    Object.assign = Object.assign !== undefined ? Object.assign : function() {
        let target = arguments[0] || null;
        if (!target) { throw 'Invalid assign target'; }
        for (let i = 1; i < arguments.length; i++) {
            for (let key in arguments[i]) {
                target[key] = arguments[i][key];
            }
        }
        return target;
    };


    /**
     * Extend object
     */
    const $extend = function(out) {
        out = out || {};
        for (let i = 1; i < arguments.length; i++) {
            let obj = arguments[i];
            if (!obj) continue;
            for (let key in obj) {
                if (!obj.hasOwnProperty(key))
                    continue;
                if ($is._object(obj[key])) {
                    out[key] = $extend(out[key], obj[key]);
                    continue;
                }
                out[key] = obj[key];
            }
        }
        return out;
    }

    /**
     * Type check methods collection
     */
    let $is = {
        _function(value) {
            return typeof value === 'function';
        },
        _async(value) {
            return $is._function(value) && value instanceof (async () => {}).constructor;
        },
        _string(value) {
            return typeof value === 'string' || value instanceof String;
        },
        /*_number(value) {
            return typeof value === 'number' && isFinite(value);
        },*/
        _array(value) {
            return value && typeof value === 'object' && value.constructor === Array;
        },
        _object(value) {
            return value && typeof value === 'object';
        },
        _null(value) {
            return value === null;
        },
        _undefined(value) {
            return typeof value === 'undefined';
        },
        /*_bool(value) {
            return typeof value === 'boolean';
        },*/
        set(value) {
            return !$is._undefined(value) && !$is._null(value);
        },
        http() {
            return $launchMode === 'http';
        },
    }

    /**
     * Main start event listener
     */
    const $onDomReady = () => {
        if ($is.http()) { document.removeEventListener($startEvent, $onDomReady, false); }
        $domReady = true;

        debug.log($startEvent);

        // Sort by priority (namespace is first method to call)
        // namespace(0), namespace(0)+uses.length, use(1000)
        $callstack.sort((a, b) => {
            if (a[0] === b[0]) return 0;
            return a[0] > b[0] ? 1 : -1;
        })

        let func;
        while(func = $callstack.shift()) {
            func[1].call($$);
        }
    };

    /**
     * NodeJS helpers
     */
    const $getCallerFile = () => {
        let originalFunc = Error.prepareStackTrace;
        let callerfile;
        try {
            let err = new Error();
            let currentfile;
            Error.prepareStackTrace = (err, stack) => { return stack; };
            currentfile = err.stack.shift().getFileName();
            while (err.stack.length) {
                callerfile = err.stack.shift().getFileName();
                if(currentfile !== callerfile) break;
            }
        } catch (e) {}
        Error.prepareStackTrace = originalFunc;
        return callerfile;
    };

    const $setModule = (name, file) => {
        if ($is.http()) { return; }
        $modules[name] = require.cache[file];
    };

    const $moduleExport = (name, object, do_export) => {
        if ($is.http() || !do_export) { return; }
        $modules[name].exports = object;
    };


    /**
     * scripts autoloader
     */
    const $autoload = (name) => {
        if ($loaded[name]) return;
        $loaded[name] = true;

        let aname = name.split('.');
        let file  = [ aname.pop() + '.js' ];
        let path, _name, left;

        debug.log('autoload start `' + name + '`');

        // build file path
        do {
            left = aname.join('.');
            if (_name) file.unshift(_name);
            if (!$is.set($autoloads[left])) continue;
            path = $autoloads[left] + '/' + file.join('/');
            break;
        } while(_name = aname.pop());
        if (!path && $is.http()) {
            return debug.log('autoload failed `' + name + '` - empty path');
        }

        // load by http
        if ($is.http()) {
            let script  = document.createElement('script');
            script.type = 'text/javascript';
            script.src  = path + '?' + Math.random();
            script.addEventListener('load', () => {
                debug.log('autoload complete `' + name + '` from `' + path + '`');
            });
            script.addEventListener('error', () => {
                debug.log('autoload failed `' + name + '` from `' + path + '`');
            });
            document.getElementsByTagName('head')[0].appendChild(script);
        } else {
            if (path) { require(path); } else {
                let oname  = name.split('.');
                let module = require(oname[0]);
                let object = oname.length > 1 ? module[oname[1]] : module;
                $storage.put(name, object, false);
            }
        }
    };


    /**
     *
     */
    const $definition = function(namespace) {
        let self = this;
        let args = [ namespace ];
        Object.assign(self, {
            use() {
                [].map.call(arguments, (item) => { args.push('use:' + item); });
                return self;
            },

            is() {
                [].map.call(arguments, (item) => { args.push('is:' + item); });
                return self;
            },

            define(factory) {
                if (!$is._object(factory) && !$is._function(factory))
                    throw 'Invalid factory type (function|object expected) got ' + (typeof factory);
                args.push(factory);
                $namespace.apply($$, args);
            }
        });
    };


    // General storage controller
    let $storage = {
        defined:    {},
        ready:      {},
        readyStack: [],

        define(name) {
            $storage.defined[name] = true;
        },

        // check item is defined
        isdefined(name) {
            return $storage.defined[name] === true;
        },

        isready(name) {
            return $storage.ready[name] === true;
        },

        // ready callbacks
        bindReady(callback) {
            $storage.readyStack.push(callback);
            debug.log('bind ready:', $storage.readyStack.length);
        },

        unbindReady(callback) {
            $storage.readyStack = $storage.readyStack.filter((cb) => {
                return cb !== callback;
            });
            debug.log('unbind ready:', $storage.readyStack.length);
        },

        readyCall(name) {
            debug.log('ready call `' + name + '`');
            $storage.readyStack.map(callback => {
                if (callback(name)) {
                    debug.log('ready `' + name + '`');
                    $storage.unbindReady(callback);
                }
            });
        },

        // storage manage methods
        async put(name, factory, do_export) {
            if (!$is._function(factory) && !$is._object(factory))
                throw 'Invalid factory for: ' + name;

                name       = name.split(':');
            let gname      = name[1] || null;
            let aname      = name[0].split('.');
            let objectName = aname.pop();
            let _name, _$$ = $$;
                name       = name[0];

            while(_name = aname.shift()) {
                if (!$is.set(_$$[_name]))
                    _$$[_name] = {};
                _$$ = _$$[_name];
            }

            if ($is.set(_$$[objectName]))
                throw 'Item `' + name + '` already defined!';
            if (gname && $is.set(global[gname]))
                throw 'Global item `' + gname + '` already exists!';

            factory = $is._async(factory) ? await factory() : factory;

            _$$[objectName] = factory;
            if (gname && gname.length !== 0)
                global[gname] = _$$[objectName];
            $moduleExport(name, _$$[objectName] = factory, do_export !== undefined ? do_export : true);

            debug.log('put in storage `' + name + '`');
            $storage.ready[name] = true;
            $storage.readyCall(name);
        },

        get(name, collection) {
            name           = name.split('.');
            let objectName = name.pop();
            let _name, _$$ = collection || $$;
            while(_name = name.shift()) {
                if (!$is.set(_$$[_name]))
                    return null;
                _$$ = _$$[_name];
            }
            if (!$is.set(_$$[objectName]))
                throw 'Item `' + name + '` not found!';
            return _$$[objectName];
        },

        load(name) {
            if ($storage.isready(name))   return $storage.readyCall(name);
            if ($storage.isdefined(name)) return;
            $autoload(name);
        }
    };


    // General namespace define method
    const $namespace = function() {
        if (arguments.length < 1)
            throw 'To few arguments in `namespace` method';

        // Get current namespace
        let name = arguments[0];
        if (!$is._string(name))
            throw 'Invalid argument type for `name` (string expected)';

        // set namespace nodejs module
        $setModule(name.split(':')[0], $getCallerFile());

        if (arguments.length === 1)
            return new $definition(name);

        // Get factory
        let factory = arguments[arguments.length - 1];
        if (!$is._function(factory) && !$is._object(factory))
            throw 'Invalid factory type (function|object expected) got ' + (typeof factory);

        // Create uses list
        let uses = [];
        for (let i = 1; i < arguments.length - 1; i++) {
            if ($is._string(arguments[i])) {
                if (arguments[i] === name)
                    throw 'Object cannot use itself';
                uses.push(arguments[i]);
            } else if ($is._array(arguments[i])) {
                uses = uses.concat(arguments[i]);
            } else {
                throw 'Invalid usage type (string or array expected)';
            }
        }

        // define in storage to avoid `load` for not ready but defined items
        $storage.define(name.split(':')[0]);
        debug.log('define new item `' + name + '` with uses:', uses);

        // Add self builded use factory
        uses.unshift(true); // this is internal call
        uses.push(((name, factory) => {
            return function() { // need self context
                debug.log('run factory `' + name.split(':')[0] + '`');

                let loaded = { is: [], use: [] };
                for (let i = 0; i < arguments.length; i++) {
                    loaded[arguments[i][0]].push(arguments[i][1]);
                }

                // Get object
                let object = null;
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
                        object.prototype = $extend.apply($$, loaded.is);
                    } else {
                        loaded.is.unshift({});
                        loaded.is.push(object);
                        object = $extend.apply($$, loaded.is);
                    }
                }
                $storage.put(name, object);
            }
        })(name, factory));
        $use.apply($$, uses);
    };

    // general use method
    const $use = function(internal) {
        if (arguments.length < 1)
            throw 'To few arguments in `use` method';

        // Get factory and uses list
        let factory = arguments[arguments.length - 1];
        let uses    = [];
        if ($is._function(factory)) {
            for (let i = 1; i < arguments.length - 1; i++) {
                if (!$is._string(arguments[i]))
                    throw 'Invalid argument type in use method (string expected)';
                let prefix = arguments[i].indexOf(':') !== -1 ? '' : 'use:';
                uses.push(prefix + arguments[i]);
            }
        } else {
            for (let i = 1; i < arguments.length; i++) {
                if (!$is._string(arguments[i]))
                    throw 'Invalid argument type in use method (string expected)';
                uses.push('use:' + arguments[i]);
            }
            return uses;
        }

        // when all uses ready - build factory
        $storage.bindReady($ready(uses, $build(uses, factory, internal)));

        let start = ((uses, factory) => {
            return () => {
                if (uses.length === 0)
                    return factory.call($$); // namespace definition without usages

                debug.log('start factory for', uses);
                // autoload items
                uses.map(item => {
                    item = item.split(':')[1];
                    item = item.split('#')[0];
                    $storage.load(item);
                });
            };
        })(uses, factory);

        // Push to callstack if dom is not ready
        if (!$domReady) {
            let priority = internal ? P_NAMESPACE + uses.length : P_USE + uses.length;
            $callstack.push([ priority, start ]);
            return;
        }

        // If dom already ready - start factory immideatly
        start();
    }

    // extends objects method
    const $extends = function() {
        if (arguments.length < 1)
            throw 'To few arguments in extends method';
        let is = [];
        for (let i = 0; i < arguments.length; i++) {
            if (!$is._string(arguments[i]))
                throw 'Invalid argument type in extends method';
            is.push('is:' + arguments[i]);
        }
        return is;
    }


    // Call each defined namespace item - check uses list ready
    const $ready = (uses, start) => {
        return (name) => {
            if (uses.length === 0) return true;
            uses = uses.filter(item => {
                return name !== item.split(':')[1].split('#')[0];
            });
            if (uses.length === 0) {
                start.call($$);
                return true;
            }
            return false;
        };
    };

    // Call when all items in uses list is ready - get each object from storage and put as argument
    const $build = (uses, factory, internal) => {
        return () => {
            let loaded = [];
            uses.map(item => {
                let type   = item.split(':')[0];
                let name   = item.split(':')[1];
                let prop   = name.split('#')[1] || null;
                    name   = name.split('#')[0];
                let object = $storage.get(name);

                if (!object)
                    throw 'Object `' + name + '` not found. Namespace missing or invalid?';
                if (prop && $is._function(object)) {
                    throw 'Unable to use property for function factory';
                } else if (prop) {
                    object = $storage.get(prop, object);
                    if (!object)
                        throw 'Property `' + prop + '` not found in `' + name + '`';
                }

                loaded.push(internal ? [ type, object ] : object);
            });
            factory.apply($$, loaded);
        }
    }


    // Add basic global methods to namespace object
    Object.assign($namespace, {
        /**
         * Returns and log in console current library version
         */
        version() {
            console.log('namespace.js version is `' + version + '`');
            return version;
        },

        /**
         * Change library debug status
         * @param {Boolean} status debug status
         * @param {String|null} prefix console log prefix
         * @returns namespace
         */
        debug(status, prefix = null) {
            status       = status || false;
            debug.prefix = prefix || debug.prefix;
            if (status) debug.enable(); else debug.disable();
            debug.log('debug:', status);
            return $namespace;
        },

        /**
         * Change document initialization event (default is - DOMContentLoaded)
         * @param {String} eventName name of new global event
         * @returns namespace
         */
        listen(eventName) {
            if (!$is._string(eventName) || eventName.length < 1)
                throw 'Invalid global event name';
            document.removeEventListener($startEvent, $onDomReady, false);
            $startEvent = eventName;
            document.addEventListener($startEvent, $onDomReady, false);
            debug.log('change start event to `' + eventName + '`');
            return $namespace;
        },

        /**
         * Define or return autoloader path
         * @returns namespace
         */
        autoload() {
            if (arguments.length < 1)
                return $autoloads;
            if ($is._string(arguments[0]))
                return $autoloads[arguments[0]] || null;
            if (!$is._object(arguments[0]))
                throw 'Invalid `autoload` argument type (expected object), got ' + (typeof arguments[0]);
            Object.assign($autoloads, arguments[0]);
            debug.log('register new autoload:', arguments[0]);
            return $namespace;
        },

        /**
         * Set global application name
         * @param {String} name application name
         * @returns namespace
         */
        app(name) {
            if (arguments.length < 1)
                return $appName;
            if (!$is._string(name))
                throw 'Invalid `name` argument type (string expected), got ' + (typeof name);
            if (name.length < 1)
                throw 'Invalid `name` length';
            if ($appName)
                delete global[$appName];
            global[$appName = name] = $$;
            debug.log('define global application name `' + name + '`');
            return $namespace;
        }
    });

    // extend global object
    Object.assign(global, {
        namespace: $namespace,
        is:        $extends,
        use()      {
            [].unshift.call(arguments, false);
            return $use.apply($$, arguments);
        },

        /**
         * Define or return autoloader path
         * @deprecated
         * @returns namespace
         */
        autoload:  $namespace.autoload,

        /**
         * Change global initialization event (default is - DOMContentLoaded)
         * @param eventName name of new global event
         * @deprecated
         * @returns namespace
         */
        listen:    $namespace.listen,
    });

    // Listen dom ready (or another start event)
    if (!$is.http()) { $onDomReady(); } else { document.addEventListener($startEvent, $onDomReady, false); }
})(typeof window !== 'undefined' ? 'http' : 'node', typeof window !== 'undefined' ? window : global);