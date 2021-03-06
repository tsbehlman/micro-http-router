'use strict';

const { send, createError } = require('micro');
const RadixRouter = require('radix-router');
const assert = require('assert');

const routerSymbol = Symbol();

const routeOptionsHelper = function (path, method, fn1, fn2) {
    let options = {
        path: path,
        method: method
    };

    assert(fn1, 'You must provide a valid function as the second parameter.');

    if (fn2) {
        options.before = fn1;
        options.handler = fn2;
    }
    else {
        options.handler = fn1;
    }

    return options;
};

module.exports = exports = class Router {
    constructor(options) {
        // Add new instance of RadixRouter
        this.radixRouter = new RadixRouter({ strict: options && options.strict });

        this.debug = options && options.debug;
    }

    /**
     * Adds a route handler to the router.
     * @param {object} options The route information and handler
     */
    route(options) {
        assert(options, 'You must provide a valid route options object.')
        assert(options.path, 'You must provide a valid path.');
        assert(options.method, 'You must provide a valid route handler function.');
        assert(options.handler, 'You must provide a valid route handler function.');

        let route = this.radixRouter.lookup(options.path);
        if (route === null) {
            route = {
                path: options.path,
                methods: new Map()
            };

            this.radixRouter.insert(route);
        };

        const method = {
            handler: options.handler,
            before: undefined
        }

        route.methods.set(options.method.toUpperCase(), method);

        if (options.before) {
            assert(typeof options.before === 'function');

            method.before = options.before;
        }

        return this;
    }

    /**
     * Chains a HTTP "GET" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    get(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'GET', fn1, fn2));
    }

    /**
     * Chains a HTTP "POST" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    post(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'POST', fn1, fn2));
    }

    /**
     * Chains a HTTP "PUT" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    put(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'PUT', fn1, fn2));
    }

    /**
     * Chains a HTTP "DELETE" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    delete(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'DELETE', fn1, fn2));
    }

    /**
     * Chains a HTTP "OPTIONS" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    options(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'OPTIONS', fn1, fn2));
    }

    /**
     * Chains a HTTP "TRACE" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    trace(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'TRACE', fn1, fn2));
    }

    /**
     * Chains a HTTP "PATCH" route handler to the router object.
     * @param {String} path 
     * @param {Function} fn1
     * @param {Function} fn2
     */
    patch(path, fn1, fn2) {
        return this.route(routeOptionsHelper(path, 'PATCH', fn1, fn2));
    }

    /**
     * Handles HTTP traffic according to the router.
     * @param {object} req http.incomingMessage
     * @param {object} res http.serverResponse
     */
    async handle(req, res) {
        const reqURL = new URL(req.url, 'http://localhost/');
        const route = this.radixRouter.lookup(reqURL.pathname);

        if (route !== null && req.method !== undefined) {
            try {
                const methodObj = route.methods.get(req.method);
                // Set the params if we have any
                if (route.params) req.params = route.params;

                // set query parameters as well
                req.searchParams = reqURL.searchParams;

                // Run the before function if one is configured
                if (methodObj.before) methodObj.before(req, res);

                // Finally, handle the result
                return await methodObj.handler(req, res);
            } catch (e) {
                let data = null;
                if (this.debug)
                    data = `${e.name}: ${e.message}\n${e.stack}`;
                send(res, 500, data);
                return;
            }
        } else {
            throw createError(404, 'Route not found');
        }
    }
};
