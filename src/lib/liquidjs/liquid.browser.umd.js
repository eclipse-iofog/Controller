/*
 * liquidjs@9.17.0, https://github.com/harttle/liquidjs
 * (c) 2016-2020 harttle
 * Released under the MIT License.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.liquidjs = {}));
}(this, function (exports) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __awaiter(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __values(o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    var Drop = /** @class */ (function () {
        function Drop() {
        }
        Drop.prototype.valueOf = function () {
            return undefined;
        };
        Drop.prototype.liquidMethodMissing = function (key) {
            return undefined;
        };
        return Drop;
    }());

    var toStr = Object.prototype.toString;
    var toLowerCase = String.prototype.toLowerCase;
    /*
     * Checks if value is classified as a String primitive or object.
     * @param {any} value The value to check.
     * @return {Boolean} Returns true if value is a string, else false.
     */
    function isString(value) {
        return toStr.call(value) === '[object String]';
    }
    function isFunction(value) {
        return typeof value === 'function';
    }
    function stringify(value) {
        value = toValue(value);
        return isNil(value) ? '' : String(value);
    }
    function toValue(value) {
        return value instanceof Drop ? value.valueOf() : value;
    }
    function isNumber(value) {
        return typeof value === 'number';
    }
    function toLiquid(value) {
        if (value && isFunction(value.toLiquid))
            return toLiquid(value.toLiquid());
        return value;
    }
    function isNil(value) {
        return value === null || value === undefined;
    }
    function isArray(value) {
        // be compatible with IE 8
        return toStr.call(value) === '[object Array]';
    }
    /*
     * Iterates over own enumerable string keyed properties of an object and invokes iteratee for each property.
     * The iteratee is invoked with three arguments: (value, key, object).
     * Iteratee functions may exit iteration early by explicitly returning false.
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @return {Object} Returns object.
     */
    function forOwn(object, iteratee) {
        object = object || {};
        for (var k in object) {
            if (object.hasOwnProperty(k)) {
                if (iteratee(object[k], k, object) === false)
                    break;
            }
        }
        return object;
    }
    function last(arr) {
        return arr[arr.length - 1];
    }
    /*
     * Checks if value is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, new Number(0), and new String(''))
     * @param {any} value The value to check.
     * @return {Boolean} Returns true if value is an object, else false.
     */
    function isObject(value) {
        var type = typeof value;
        return value !== null && (type === 'object' || type === 'function');
    }
    function range(start, stop, step) {
        if (step === void 0) { step = 1; }
        var arr = [];
        for (var i = start; i < stop; i += step) {
            arr.push(i);
        }
        return arr;
    }
    function padStart(str, length, ch) {
        if (ch === void 0) { ch = ' '; }
        return pad(str, length, ch, function (str, ch) { return ch + str; });
    }
    function padEnd(str, length, ch) {
        if (ch === void 0) { ch = ' '; }
        return pad(str, length, ch, function (str, ch) { return str + ch; });
    }
    function pad(str, length, ch, add) {
        str = String(str);
        var n = length - str.length;
        while (n-- > 0)
            str = add(str, ch);
        return str;
    }
    function identify(val) {
        return val;
    }
    function snakeCase(str) {
        return str.replace(/(\w?)([A-Z])/g, function (_, a, b) { return (a ? a + '_' : '') + b.toLowerCase(); });
    }
    function changeCase(str) {
        var hasLowerCase = __spread(str).some(function (ch) { return ch >= 'a' && ch <= 'z'; });
        return hasLowerCase ? str.toUpperCase() : str.toLowerCase();
    }
    function ellipsis(str, N) {
        return str.length > N ? str.substr(0, N - 3) + '...' : str;
    }
    // compare string in case-insensitive way, undefined values to the tail
    function caseInsensitiveCompare(a, b) {
        if (a == null && b == null)
            return 0;
        if (a == null)
            return 1;
        if (b == null)
            return -1;
        a = toLowerCase.call(a);
        b = toLowerCase.call(b);
        if (a < b)
            return -1;
        if (a > b)
            return 1;
        return 0;
    }

    var Node = /** @class */ (function () {
        function Node(key, value, next, prev) {
            this.key = key;
            this.value = value;
            this.next = next;
            this.prev = prev;
        }
        return Node;
    }());
    var LRU = /** @class */ (function () {
        function LRU(limit, size) {
            if (size === void 0) { size = 0; }
            this.limit = limit;
            this.size = size;
            this.cache = {};
            this.head = new Node('HEAD', null, null, null);
            this.tail = new Node('TAIL', null, null, null);
            this.head.next = this.tail;
            this.tail.prev = this.head;
        }
        LRU.prototype.write = function (key, value) {
            if (this.cache[key]) {
                this.cache[key].value = value;
            }
            else {
                var node = new Node(key, value, this.head.next, this.head);
                this.head.next.prev = node;
                this.head.next = node;
                this.cache[key] = node;
                this.size++;
                this.ensureLimit();
            }
        };
        LRU.prototype.read = function (key) {
            if (!this.cache[key])
                return;
            var value = this.cache[key].value;
            this.remove(key);
            this.write(key, value);
            return value;
        };
        LRU.prototype.remove = function (key) {
            var node = this.cache[key];
            node.prev.next = node.next;
            node.next.prev = node.prev;
            delete this.cache[key];
            this.size--;
        };
        LRU.prototype.clear = function () {
            this.head.next = this.tail;
            this.tail.prev = this.head;
            this.size = 0;
            this.cache = {};
        };
        LRU.prototype.ensureLimit = function () {
            if (this.size > this.limit)
                this.remove(this.tail.prev.key);
        };
        return LRU;
    }());

    var defaultOptions = {
        root: ['.'],
        cache: undefined,
        extname: '',
        dynamicPartials: true,
        jsTruthy: false,
        trimTagRight: false,
        trimTagLeft: false,
        trimOutputRight: false,
        trimOutputLeft: false,
        greedy: true,
        tagDelimiterLeft: '{%',
        tagDelimiterRight: '%}',
        outputDelimiterLeft: '{{',
        outputDelimiterRight: '}}',
        strictFilters: false,
        strictVariables: false,
        lenientIf: false,
        globals: {},
        keepOutputType: false
    };
    function normalize(options) {
        options = options || {};
        if (options.hasOwnProperty('root')) {
            options.root = normalizeStringArray(options.root);
        }
        if (options.hasOwnProperty('cache')) {
            var cache = void 0;
            if (typeof options.cache === 'number')
                cache = options.cache > 0 ? new LRU(options.cache) : undefined;
            else if (typeof options.cache === 'object')
                cache = options.cache;
            else
                cache = options.cache ? new LRU(1024) : undefined;
            options.cache = cache;
        }
        return options;
    }
    function applyDefault(options) {
        return __assign({}, defaultOptions, options);
    }
    function normalizeStringArray(value) {
        if (isArray(value))
            return value;
        if (isString(value))
            return [value];
        return [];
    }

    var LiquidError = /** @class */ (function (_super) {
        __extends(LiquidError, _super);
        function LiquidError(err, token) {
            var _this = _super.call(this, err.message) || this;
            _this.originalError = err;
            _this.token = token;
            return _this;
        }
        LiquidError.prototype.update = function () {
            var err = this.originalError;
            var context = mkContext(this.token);
            this.message = mkMessage(err.message, this.token);
            this.stack = this.message + '\n' + context +
                '\n' + this.stack + '\nFrom ' + err.stack;
        };
        return LiquidError;
    }(Error));
    var TokenizationError = /** @class */ (function (_super) {
        __extends(TokenizationError, _super);
        function TokenizationError(message, token) {
            var _this = _super.call(this, new Error(message), token) || this;
            _this.name = 'TokenizationError';
            _super.prototype.update.call(_this);
            return _this;
        }
        return TokenizationError;
    }(LiquidError));
    var ParseError = /** @class */ (function (_super) {
        __extends(ParseError, _super);
        function ParseError(err, token) {
            var _this = _super.call(this, err, token) || this;
            _this.name = 'ParseError';
            _this.message = err.message;
            _super.prototype.update.call(_this);
            return _this;
        }
        return ParseError;
    }(LiquidError));
    var RenderError = /** @class */ (function (_super) {
        __extends(RenderError, _super);
        function RenderError(err, tpl) {
            var _this = _super.call(this, err, tpl.token) || this;
            _this.name = 'RenderError';
            _this.message = err.message;
            _super.prototype.update.call(_this);
            return _this;
        }
        RenderError.is = function (obj) {
            return obj instanceof RenderError;
        };
        return RenderError;
    }(LiquidError));
    var UndefinedVariableError = /** @class */ (function (_super) {
        __extends(UndefinedVariableError, _super);
        function UndefinedVariableError(err, token) {
            var _this = _super.call(this, err, token) || this;
            _this.name = 'UndefinedVariableError';
            _this.message = err.message;
            _super.prototype.update.call(_this);
            return _this;
        }
        return UndefinedVariableError;
    }(LiquidError));
    // only used internally; raised where we don't have token information,
    // so it can't be an UndefinedVariableError.
    var InternalUndefinedVariableError = /** @class */ (function (_super) {
        __extends(InternalUndefinedVariableError, _super);
        function InternalUndefinedVariableError(variableName) {
            var _this = _super.call(this, "undefined variable: " + variableName) || this;
            _this.name = 'InternalUndefinedVariableError';
            _this.variableName = variableName;
            return _this;
        }
        return InternalUndefinedVariableError;
    }(Error));
    var AssertionError = /** @class */ (function (_super) {
        __extends(AssertionError, _super);
        function AssertionError(message) {
            var _this = _super.call(this, message) || this;
            _this.name = 'AssertionError';
            _this.message = message + '';
            return _this;
        }
        return AssertionError;
    }(Error));
    function mkContext(token) {
        var _a = __read(token.getPosition(), 1), line = _a[0];
        var lines = token.input.split('\n');
        var begin = Math.max(line - 2, 1);
        var end = Math.min(line + 3, lines.length);
        var context = range(begin, end + 1)
            .map(function (lineNumber) {
            var indicator = (lineNumber === line) ? '>> ' : '   ';
            var num = padStart(String(lineNumber), String(end).length);
            var text = lines[lineNumber - 1];
            return "" + indicator + num + "| " + text;
        })
            .join('\n');
        return context;
    }
    function mkMessage(msg, token) {
        if (token.file)
            msg += ", file:" + token.file;
        var _a = __read(token.getPosition(), 2), line = _a[0], col = _a[1];
        msg += ", line:" + line + ", col:" + col;
        return msg;
    }

    var Context = /** @class */ (function () {
        function Context(env, opts, sync) {
            if (env === void 0) { env = {}; }
            if (opts === void 0) { opts = defaultOptions; }
            if (sync === void 0) { sync = false; }
            this.scopes = [{}];
            this.registers = {};
            this.sync = sync;
            this.opts = opts;
            this.globals = opts.globals;
            this.environments = env;
        }
        Context.prototype.getRegister = function (key, defaultValue) {
            if (defaultValue === void 0) { defaultValue = {}; }
            return (this.registers[key] = this.registers[key] || defaultValue);
        };
        Context.prototype.setRegister = function (key, value) {
            return (this.registers[key] = value);
        };
        Context.prototype.saveRegister = function () {
            var _this = this;
            var keys = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                keys[_i] = arguments[_i];
            }
            return keys.map(function (key) { return [key, _this.getRegister(key)]; });
        };
        Context.prototype.restoreRegister = function (keyValues) {
            var _this = this;
            return keyValues.forEach(function (_a) {
                var _b = __read(_a, 2), key = _b[0], value = _b[1];
                return _this.setRegister(key, value);
            });
        };
        Context.prototype.getAll = function () {
            return __spread([this.globals, this.environments], this.scopes).reduce(function (ctx, val) { return __assign(ctx, val); }, {});
        };
        Context.prototype.get = function (paths) {
            var scope = this.findScope(paths[0]);
            return this.getFromScope(scope, paths);
        };
        Context.prototype.getFromScope = function (scope, paths) {
            var _this = this;
            if (typeof paths === 'string')
                paths = paths.split('.');
            return paths.reduce(function (scope, path) {
                scope = readProperty(scope, path);
                if (isNil(scope) && _this.opts.strictVariables) {
                    throw new InternalUndefinedVariableError(path);
                }
                return scope;
            }, scope);
        };
        Context.prototype.push = function (ctx) {
            return this.scopes.push(ctx);
        };
        Context.prototype.pop = function () {
            return this.scopes.pop();
        };
        Context.prototype.bottom = function () {
            return this.scopes[0];
        };
        Context.prototype.findScope = function (key) {
            for (var i = this.scopes.length - 1; i >= 0; i--) {
                var candidate = this.scopes[i];
                if (key in candidate)
                    return candidate;
            }
            if (key in this.environments)
                return this.environments;
            return this.globals;
        };
        return Context;
    }());
    function readProperty(obj, key) {
        if (isNil(obj))
            return obj;
        obj = toLiquid(obj);
        if (obj instanceof Drop) {
            if (isFunction(obj[key]))
                return obj[key]();
            if (obj.hasOwnProperty(key))
                return obj[key];
            return obj.liquidMethodMissing(key);
        }
        if (key === 'size')
            return readSize(obj);
        if (key === 'first')
            return readFirst(obj);
        if (key === 'last')
            return readLast(obj);
        return obj[key];
    }
    function readFirst(obj) {
        if (isArray(obj))
            return obj[0];
        return obj['first'];
    }
    function readLast(obj) {
        if (isArray(obj))
            return obj[obj.length - 1];
        return obj['last'];
    }
    function readSize(obj) {
        if (isArray(obj) || isString(obj))
            return obj.length;
        return obj['size'];
    }

    function domResolve(root, path) {
        var base = document.createElement('base');
        base.href = root;
        var head = document.getElementsByTagName('head')[0];
        head.insertBefore(base, head.firstChild);
        var a = document.createElement('a');
        a.href = path;
        var resolved = a.href;
        head.removeChild(base);
        return resolved;
    }
    function resolve(root, filepath, ext) {
        if (root.length && last(root) !== '/')
            root += '/';
        var url = domResolve(root, filepath);
        return url.replace(/^(\w+:\/\/[^/]+)(\/[^?]+)/, function (str, origin, path) {
            var last = path.split('/').pop();
            if (/\.\w+$/.test(last))
                return str;
            return origin + path + ext;
        });
    }
    function readFile(url) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var xhr = new XMLHttpRequest();
                        xhr.onload = function () {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                resolve(xhr.responseText);
                            }
                            else {
                                reject(new Error(xhr.statusText));
                            }
                        };
                        xhr.onerror = function () {
                            reject(new Error('An error occurred whilst receiving the response.'));
                        };
                        xhr.open('GET', url);
                        xhr.send();
                    })];
            });
        });
    }
    function readFileSync(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send();
        if (xhr.status < 200 || xhr.status >= 300) {
            throw new Error(xhr.statusText);
        }
        return xhr.responseText;
    }
    function exists(filepath) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, true];
            });
        });
    }
    function existsSync(filepath) {
        return true;
    }

    var fs = /*#__PURE__*/Object.freeze({
        resolve: resolve,
        readFile: readFile,
        readFileSync: readFileSync,
        exists: exists,
        existsSync: existsSync
    });

    var TokenKind;
    (function (TokenKind) {
        TokenKind[TokenKind["Number"] = 1] = "Number";
        TokenKind[TokenKind["Literal"] = 2] = "Literal";
        TokenKind[TokenKind["Tag"] = 4] = "Tag";
        TokenKind[TokenKind["Output"] = 8] = "Output";
        TokenKind[TokenKind["HTML"] = 16] = "HTML";
        TokenKind[TokenKind["Filter"] = 32] = "Filter";
        TokenKind[TokenKind["Hash"] = 64] = "Hash";
        TokenKind[TokenKind["PropertyAccess"] = 128] = "PropertyAccess";
        TokenKind[TokenKind["Word"] = 256] = "Word";
        TokenKind[TokenKind["Range"] = 512] = "Range";
        TokenKind[TokenKind["Quoted"] = 1024] = "Quoted";
        TokenKind[TokenKind["Operator"] = 2048] = "Operator";
        TokenKind[TokenKind["Delimited"] = 12] = "Delimited";
    })(TokenKind || (TokenKind = {}));

    function isDelimitedToken(val) {
        return !!(getKind(val) & TokenKind.Delimited);
    }
    function isOperatorToken(val) {
        return getKind(val) === TokenKind.Operator;
    }
    function isHTMLToken(val) {
        return getKind(val) === TokenKind.HTML;
    }
    function isOutputToken(val) {
        return getKind(val) === TokenKind.Output;
    }
    function isTagToken(val) {
        return getKind(val) === TokenKind.Tag;
    }
    function isQuotedToken(val) {
        return getKind(val) === TokenKind.Quoted;
    }
    function isLiteralToken(val) {
        return getKind(val) === TokenKind.Literal;
    }
    function isNumberToken(val) {
        return getKind(val) === TokenKind.Number;
    }
    function isPropertyAccessToken(val) {
        return getKind(val) === TokenKind.PropertyAccess;
    }
    function isWordToken(val) {
        return getKind(val) === TokenKind.Word;
    }
    function isRangeToken(val) {
        return getKind(val) === TokenKind.Range;
    }
    function getKind(val) {
        return val ? val.kind : -1;
    }

    var typeGuards = /*#__PURE__*/Object.freeze({
        isDelimitedToken: isDelimitedToken,
        isOperatorToken: isOperatorToken,
        isHTMLToken: isHTMLToken,
        isOutputToken: isOutputToken,
        isTagToken: isTagToken,
        isQuotedToken: isQuotedToken,
        isLiteralToken: isLiteralToken,
        isNumberToken: isNumberToken,
        isPropertyAccessToken: isPropertyAccessToken,
        isWordToken: isWordToken,
        isRangeToken: isRangeToken
    });

    // **DO NOT CHANGE THIS FILE**
    //
    // This file is generated by bin/character-gen.js
    // bitmask character types to boost performance
    var TYPES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 4, 4, 4, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 2, 8, 0, 0, 0, 0, 8, 0, 0, 0, 64, 0, 65, 0, 0, 33, 33, 33, 33, 33, 33, 33, 33, 33, 33, 0, 0, 2, 2, 2, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
    var IDENTIFIER = 1;
    var BLANK = 4;
    var QUOTE = 8;
    var INLINE_BLANK = 16;
    var NUMBER = 32;
    var SIGN = 64;
    TYPES[160] = TYPES[5760] = TYPES[6158] = TYPES[8192] = TYPES[8193] = TYPES[8194] = TYPES[8195] = TYPES[8196] = TYPES[8197] = TYPES[8198] = TYPES[8199] = TYPES[8200] = TYPES[8201] = TYPES[8202] = TYPES[8232] = TYPES[8233] = TYPES[8239] = TYPES[8287] = TYPES[12288] = BLANK;

    function whiteSpaceCtrl(tokens, options) {
        var inRaw = false;
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (!isDelimitedToken(token))
                continue;
            if (!inRaw && token.trimLeft) {
                trimLeft(tokens[i - 1], options.greedy);
            }
            if (isTagToken(token)) {
                if (token.name === 'raw')
                    inRaw = true;
                else if (token.name === 'endraw')
                    inRaw = false;
            }
            if (!inRaw && token.trimRight) {
                trimRight(tokens[i + 1], options.greedy);
            }
        }
    }
    function trimLeft(token, greedy) {
        if (!token || !isHTMLToken(token))
            return;
        var mask = greedy ? BLANK : INLINE_BLANK;
        while (TYPES[token.input.charCodeAt(token.end - 1 - token.trimRight)] & mask)
            token.trimRight++;
    }
    function trimRight(token, greedy) {
        if (!token || !isHTMLToken(token))
            return;
        var mask = greedy ? BLANK : INLINE_BLANK;
        while (TYPES[token.input.charCodeAt(token.begin + token.trimLeft)] & mask)
            token.trimLeft++;
        if (token.input.charAt(token.begin + token.trimLeft) === '\n')
            token.trimLeft++;
    }

    var Token = /** @class */ (function () {
        function Token(kind, input, begin, end, file) {
            this.kind = kind;
            this.input = input;
            this.begin = begin;
            this.end = end;
            this.file = file;
        }
        Token.prototype.getText = function () {
            return this.input.slice(this.begin, this.end);
        };
        Token.prototype.getPosition = function () {
            var _a = __read([1, 1], 2), row = _a[0], col = _a[1];
            for (var i = 0; i < this.begin; i++) {
                if (this.input[i] === '\n') {
                    row++;
                    col = 1;
                }
                else
                    col++;
            }
            return [row, col];
        };
        Token.prototype.size = function () {
            return this.end - this.begin;
        };
        return Token;
    }());

    var NumberToken = /** @class */ (function (_super) {
        __extends(NumberToken, _super);
        function NumberToken(whole, decimal) {
            var _this = _super.call(this, TokenKind.Number, whole.input, whole.begin, decimal ? decimal.end : whole.end, whole.file) || this;
            _this.whole = whole;
            _this.decimal = decimal;
            return _this;
        }
        return NumberToken;
    }(Token));

    var IdentifierToken = /** @class */ (function (_super) {
        __extends(IdentifierToken, _super);
        function IdentifierToken(input, begin, end, file) {
            var _this = _super.call(this, TokenKind.Word, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.file = file;
            _this.content = _this.getText();
            return _this;
        }
        IdentifierToken.prototype.isNumber = function (allowSign) {
            if (allowSign === void 0) { allowSign = false; }
            var begin = allowSign && TYPES[this.input.charCodeAt(this.begin)] & SIGN
                ? this.begin + 1
                : this.begin;
            for (var i = begin; i < this.end; i++) {
                if (!(TYPES[this.input.charCodeAt(i)] & NUMBER))
                    return false;
            }
            return true;
        };
        return IdentifierToken;
    }(Token));

    var EmptyDrop = /** @class */ (function (_super) {
        __extends(EmptyDrop, _super);
        function EmptyDrop() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        EmptyDrop.prototype.equals = function (value) {
            if (isString(value) || isArray(value))
                return value.length === 0;
            if (isObject(value))
                return Object.keys(value).length === 0;
            return false;
        };
        EmptyDrop.prototype.gt = function () {
            return false;
        };
        EmptyDrop.prototype.geq = function () {
            return false;
        };
        EmptyDrop.prototype.lt = function () {
            return false;
        };
        EmptyDrop.prototype.leq = function () {
            return false;
        };
        EmptyDrop.prototype.valueOf = function () {
            return '';
        };
        return EmptyDrop;
    }(Drop));

    var BlankDrop = /** @class */ (function (_super) {
        __extends(BlankDrop, _super);
        function BlankDrop() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BlankDrop.prototype.equals = function (value) {
            if (value === false)
                return true;
            if (isNil(toValue(value)))
                return true;
            if (isString(value))
                return /^\s*$/.test(value);
            return _super.prototype.equals.call(this, value);
        };
        return BlankDrop;
    }(EmptyDrop));

    var NullDrop = /** @class */ (function (_super) {
        __extends(NullDrop, _super);
        function NullDrop() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        NullDrop.prototype.equals = function (value) {
            return isNil(toValue(value)) || value instanceof BlankDrop;
        };
        NullDrop.prototype.gt = function () {
            return false;
        };
        NullDrop.prototype.geq = function () {
            return false;
        };
        NullDrop.prototype.lt = function () {
            return false;
        };
        NullDrop.prototype.leq = function () {
            return false;
        };
        NullDrop.prototype.valueOf = function () {
            return null;
        };
        return NullDrop;
    }(Drop));

    var literalValues = {
        'true': true,
        'false': false,
        'nil': new NullDrop(),
        'null': new NullDrop(),
        'empty': new EmptyDrop(),
        'blank': new BlankDrop()
    };

    var LiteralToken = /** @class */ (function (_super) {
        __extends(LiteralToken, _super);
        function LiteralToken(input, begin, end, file) {
            var _this = _super.call(this, TokenKind.Literal, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.file = file;
            _this.literal = _this.getText();
            return _this;
        }
        return LiteralToken;
    }(Token));

    var precedence = {
        '==': 1,
        '!=': 1,
        '>': 1,
        '<': 1,
        '>=': 1,
        '<=': 1,
        'contains': 1,
        'and': 0,
        'or': 0
    };
    var OperatorToken = /** @class */ (function (_super) {
        __extends(OperatorToken, _super);
        function OperatorToken(input, begin, end, file) {
            var _this = _super.call(this, TokenKind.Operator, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.file = file;
            _this.operator = _this.getText();
            return _this;
        }
        OperatorToken.prototype.getPrecedence = function () {
            return precedence[this.getText()];
        };
        return OperatorToken;
    }(Token));

    var rHex = /[\da-fA-F]/;
    var rOct = /[0-7]/;
    var escapeChar = {
        b: '\b',
        f: '\f',
        n: '\n',
        r: '\r',
        t: '\t',
        v: '\x0B'
    };
    function hexVal(c) {
        var code = c.charCodeAt(0);
        if (code >= 97)
            return code - 87;
        if (code >= 65)
            return code - 55;
        return code - 48;
    }
    function parseStringLiteral(str) {
        var ret = '';
        for (var i = 1; i < str.length - 1; i++) {
            if (str[i] !== '\\') {
                ret += str[i];
                continue;
            }
            if (escapeChar[str[i + 1]] !== undefined) {
                ret += escapeChar[str[++i]];
            }
            else if (str[i + 1] === 'u') {
                var val = 0;
                var j = i + 2;
                while (j <= i + 5 && rHex.test(str[j])) {
                    val = val * 16 + hexVal(str[j++]);
                }
                i = j - 1;
                ret += String.fromCharCode(val);
            }
            else if (!rOct.test(str[i + 1])) {
                ret += str[++i];
            }
            else {
                var j = i + 1;
                var val = 0;
                while (j <= i + 3 && rOct.test(str[j])) {
                    val = val * 8 + hexVal(str[j++]);
                }
                i = j - 1;
                ret += String.fromCharCode(val);
            }
        }
        return ret;
    }

    var PropertyAccessToken = /** @class */ (function (_super) {
        __extends(PropertyAccessToken, _super);
        function PropertyAccessToken(variable, props, end) {
            var _this = _super.call(this, TokenKind.PropertyAccess, variable.input, variable.begin, end, variable.file) || this;
            _this.variable = variable;
            _this.props = props;
            return _this;
        }
        PropertyAccessToken.prototype.getVariableAsText = function () {
            if (this.variable instanceof IdentifierToken) {
                return this.variable.getText();
            }
            else {
                return parseStringLiteral(this.variable.getText());
            }
        };
        return PropertyAccessToken;
    }(Token));

    function assert(predicate, message) {
        if (!predicate) {
            var msg = message ? message() : "expect " + predicate + " to be true";
            throw new AssertionError(msg);
        }
    }

    var FilterToken = /** @class */ (function (_super) {
        __extends(FilterToken, _super);
        function FilterToken(name, args, input, begin, end, file) {
            var _this = _super.call(this, TokenKind.Filter, input, begin, end, file) || this;
            _this.name = name;
            _this.args = args;
            return _this;
        }
        return FilterToken;
    }(Token));

    var HashToken = /** @class */ (function (_super) {
        __extends(HashToken, _super);
        function HashToken(input, begin, end, name, value, file) {
            var _this = _super.call(this, TokenKind.Hash, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.name = name;
            _this.value = value;
            _this.file = file;
            return _this;
        }
        return HashToken;
    }(Token));

    var QuotedToken = /** @class */ (function (_super) {
        __extends(QuotedToken, _super);
        function QuotedToken(input, begin, end, file) {
            var _this = _super.call(this, TokenKind.Quoted, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.file = file;
            return _this;
        }
        return QuotedToken;
    }(Token));

    var HTMLToken = /** @class */ (function (_super) {
        __extends(HTMLToken, _super);
        function HTMLToken(input, begin, end, file) {
            var _this = _super.call(this, TokenKind.HTML, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.file = file;
            _this.trimLeft = 0;
            _this.trimRight = 0;
            return _this;
        }
        HTMLToken.prototype.getContent = function () {
            return this.input.slice(this.begin + this.trimLeft, this.end - this.trimRight);
        };
        return HTMLToken;
    }(Token));

    var DelimitedToken = /** @class */ (function (_super) {
        __extends(DelimitedToken, _super);
        function DelimitedToken(kind, content, input, begin, end, trimLeft, trimRight, file) {
            var _this = _super.call(this, kind, input, begin, end, file) || this;
            _this.trimLeft = false;
            _this.trimRight = false;
            _this.content = _this.getText();
            var tl = content[0] === '-';
            var tr = last(content) === '-';
            _this.content = content
                .slice(tl ? 1 : 0, tr ? -1 : content.length)
                .trim();
            _this.trimLeft = tl || trimLeft;
            _this.trimRight = tr || trimRight;
            return _this;
        }
        return DelimitedToken;
    }(Token));

    var TagToken = /** @class */ (function (_super) {
        __extends(TagToken, _super);
        function TagToken(input, begin, end, options, file) {
            var _this = this;
            var trimTagLeft = options.trimTagLeft, trimTagRight = options.trimTagRight, tagDelimiterLeft = options.tagDelimiterLeft, tagDelimiterRight = options.tagDelimiterRight;
            var value = input.slice(begin + tagDelimiterLeft.length, end - tagDelimiterRight.length);
            _this = _super.call(this, TokenKind.Tag, value, input, begin, end, trimTagLeft, trimTagRight, file) || this;
            var tokenizer = new Tokenizer(_this.content);
            _this.name = tokenizer.readIdentifier().getText();
            if (!_this.name)
                throw new TokenizationError("illegal tag syntax", _this);
            tokenizer.skipBlank();
            _this.args = tokenizer.remaining();
            return _this;
        }
        return TagToken;
    }(DelimitedToken));

    var RangeToken = /** @class */ (function (_super) {
        __extends(RangeToken, _super);
        function RangeToken(input, begin, end, lhs, rhs, file) {
            var _this = _super.call(this, TokenKind.Range, input, begin, end, file) || this;
            _this.input = input;
            _this.begin = begin;
            _this.end = end;
            _this.lhs = lhs;
            _this.rhs = rhs;
            _this.file = file;
            return _this;
        }
        return RangeToken;
    }(Token));

    var OutputToken = /** @class */ (function (_super) {
        __extends(OutputToken, _super);
        function OutputToken(input, begin, end, options, file) {
            var _this = this;
            var trimOutputLeft = options.trimOutputLeft, trimOutputRight = options.trimOutputRight, outputDelimiterLeft = options.outputDelimiterLeft, outputDelimiterRight = options.outputDelimiterRight;
            var value = input.slice(begin + outputDelimiterLeft.length, end - outputDelimiterRight.length);
            _this = _super.call(this, TokenKind.Output, value, input, begin, end, trimOutputLeft, trimOutputRight, file) || this;
            return _this;
        }
        return OutputToken;
    }(DelimitedToken));

    var trie = {
        a: { n: { d: { end: true, needBoundary: true } } },
        o: { r: { end: true, needBoundary: true } },
        c: { o: { n: { t: { a: { i: { n: { s: { end: true, needBoundary: true } } } } } } } },
        '=': { '=': { end: true } },
        '!': { '=': { end: true } },
        '>': { end: true, '=': { end: true } },
        '<': { end: true, '=': { end: true } }
    };
    function matchOperator(str, begin, end) {
        if (end === void 0) { end = str.length; }
        var node = trie;
        var i = begin;
        var info;
        while (node[str[i]] && i < end) {
            node = node[str[i++]];
            if (node['end'])
                info = node;
        }
        if (!info)
            return -1;
        if (info['needBoundary'] && str.charCodeAt(i) & IDENTIFIER)
            return -1;
        return i;
    }

    var Tokenizer = /** @class */ (function () {
        function Tokenizer(input, file) {
            if (file === void 0) { file = ''; }
            this.input = input;
            this.file = file;
            this.p = 0;
            this.rawBeginAt = -1;
            this.N = input.length;
        }
        Tokenizer.prototype.readExpression = function () {
            var operand, operator, operand_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        operand = this.readValue();
                        if (!operand)
                            return [2 /*return*/];
                        return [4 /*yield*/, operand];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!(this.p < this.N)) return [3 /*break*/, 5];
                        operator = this.readOperator();
                        if (!operator)
                            return [2 /*return*/];
                        operand_1 = this.readValue();
                        if (!operand_1)
                            return [2 /*return*/];
                        return [4 /*yield*/, operator];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, operand_1];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        };
        Tokenizer.prototype.readOperator = function () {
            this.skipBlank();
            var end = matchOperator(this.input, this.p, this.p + 8);
            if (end === -1)
                return;
            return new OperatorToken(this.input, this.p, (this.p = end), this.file);
        };
        Tokenizer.prototype.readFilters = function () {
            var filters = [];
            while (true) {
                var filter = this.readFilter();
                if (!filter)
                    return filters;
                filters.push(filter);
            }
        };
        Tokenizer.prototype.readFilter = function () {
            var _this = this;
            this.skipBlank();
            if (this.end())
                return null;
            assert(this.peek() === '|', function () { return "unexpected token at " + _this.snapshot(); });
            this.p++;
            var begin = this.p;
            var name = this.readIdentifier();
            if (!name.size())
                return null;
            var args = [];
            this.skipBlank();
            if (this.peek() === ':') {
                do {
                    ++this.p;
                    var arg = this.readFilterArg();
                    arg && args.push(arg);
                    while (this.p < this.N && this.peek() !== ',' && this.peek() !== '|')
                        ++this.p;
                } while (this.peek() === ',');
            }
            return new FilterToken(name.getText(), args, this.input, begin, this.p, this.file);
        };
        Tokenizer.prototype.readFilterArg = function () {
            var key = this.readValue();
            if (!key)
                return;
            this.skipBlank();
            if (this.peek() !== ':')
                return key;
            ++this.p;
            var value = this.readValue();
            return [key.getText(), value];
        };
        Tokenizer.prototype.readTopLevelTokens = function (options) {
            if (options === void 0) { options = defaultOptions; }
            var tokens = [];
            while (this.p < this.N) {
                var token = this.readTopLevelToken(options);
                tokens.push(token);
            }
            whiteSpaceCtrl(tokens, options);
            return tokens;
        };
        Tokenizer.prototype.readTopLevelToken = function (options) {
            var tagDelimiterLeft = options.tagDelimiterLeft, outputDelimiterLeft = options.outputDelimiterLeft;
            if (this.rawBeginAt > -1)
                return this.readEndrawOrRawContent(options);
            if (this.match(tagDelimiterLeft))
                return this.readTagToken(options);
            if (this.match(outputDelimiterLeft))
                return this.readOutputToken(options);
            return this.readHTMLToken(options);
        };
        Tokenizer.prototype.readHTMLToken = function (options) {
            var begin = this.p;
            while (this.p < this.N) {
                var tagDelimiterLeft = options.tagDelimiterLeft, outputDelimiterLeft = options.outputDelimiterLeft;
                if (this.match(tagDelimiterLeft))
                    break;
                if (this.match(outputDelimiterLeft))
                    break;
                ++this.p;
            }
            return new HTMLToken(this.input, begin, this.p, this.file);
        };
        Tokenizer.prototype.readTagToken = function (options) {
            var _a = this, file = _a.file, input = _a.input;
            var tagDelimiterRight = options.tagDelimiterRight;
            var begin = this.p;
            if (this.readTo(tagDelimiterRight) === -1) {
                throw this.mkError("tag " + this.snapshot(begin) + " not closed", begin);
            }
            var token = new TagToken(input, begin, this.p, options, file);
            if (token.name === 'raw')
                this.rawBeginAt = begin;
            return token;
        };
        Tokenizer.prototype.readOutputToken = function (options) {
            var _a = this, file = _a.file, input = _a.input;
            var outputDelimiterRight = options.outputDelimiterRight;
            var begin = this.p;
            if (this.readTo(outputDelimiterRight) === -1) {
                throw this.mkError("output " + this.snapshot(begin) + " not closed", begin);
            }
            return new OutputToken(input, begin, this.p, options, file);
        };
        Tokenizer.prototype.readEndrawOrRawContent = function (options) {
            var tagDelimiterLeft = options.tagDelimiterLeft, tagDelimiterRight = options.tagDelimiterRight;
            var begin = this.p;
            var leftPos = this.readTo(tagDelimiterLeft) - tagDelimiterLeft.length;
            while (this.p < this.N) {
                if (this.readIdentifier().getText() !== 'endraw') {
                    leftPos = this.readTo(tagDelimiterLeft) - tagDelimiterLeft.length;
                    continue;
                }
                while (this.p <= this.N) {
                    if (this.rmatch(tagDelimiterRight)) {
                        var end = this.p;
                        if (begin === leftPos) {
                            this.rawBeginAt = -1;
                            return new TagToken(this.input, begin, end, options, this.file);
                        }
                        else {
                            this.p = leftPos;
                            return new HTMLToken(this.input, begin, leftPos, this.file);
                        }
                    }
                    if (this.rmatch(tagDelimiterLeft))
                        break;
                    this.p++;
                }
            }
            throw this.mkError("raw " + this.snapshot(this.rawBeginAt) + " not closed", begin);
        };
        Tokenizer.prototype.mkError = function (msg, begin) {
            return new TokenizationError(msg, new IdentifierToken(this.input, begin, this.N, this.file));
        };
        Tokenizer.prototype.snapshot = function (begin) {
            if (begin === void 0) { begin = this.p; }
            return JSON.stringify(ellipsis(this.input.slice(begin), 16));
        };
        /**
         * @deprecated
         */
        Tokenizer.prototype.readWord = function () {
            console.warn('Tokenizer#readWord() will be removed, use #readIdentifier instead');
            return this.readIdentifier();
        };
        Tokenizer.prototype.readIdentifier = function () {
            this.skipBlank();
            var begin = this.p;
            while (this.peekType() & IDENTIFIER)
                ++this.p;
            return new IdentifierToken(this.input, begin, this.p, this.file);
        };
        Tokenizer.prototype.readHashes = function () {
            var hashes = [];
            while (true) {
                var hash = this.readHash();
                if (!hash)
                    return hashes;
                hashes.push(hash);
            }
        };
        Tokenizer.prototype.readHash = function () {
            this.skipBlank();
            if (this.peek() === ',')
                ++this.p;
            var begin = this.p;
            var name = this.readIdentifier();
            if (!name.size())
                return;
            var value;
            this.skipBlank();
            if (this.peek() === ':') {
                ++this.p;
                value = this.readValue();
            }
            return new HashToken(this.input, begin, this.p, name, value, this.file);
        };
        Tokenizer.prototype.remaining = function () {
            return this.input.slice(this.p);
        };
        Tokenizer.prototype.advance = function (i) {
            if (i === void 0) { i = 1; }
            this.p += i;
        };
        Tokenizer.prototype.end = function () {
            return this.p >= this.N;
        };
        Tokenizer.prototype.readTo = function (end) {
            while (this.p < this.N) {
                ++this.p;
                if (this.rmatch(end))
                    return this.p;
            }
            return -1;
        };
        Tokenizer.prototype.readValue = function () {
            var value = this.readQuoted() || this.readRange();
            if (value)
                return value;
            if (this.peek() === '[') {
                this.p++;
                var prop = this.readQuoted();
                if (!prop)
                    return;
                if (this.peek() !== ']')
                    return;
                this.p++;
                return new PropertyAccessToken(prop, [], this.p);
            }
            var variable = this.readIdentifier();
            if (!variable.size())
                return;
            var isNumber = variable.isNumber(true);
            var props = [];
            while (true) {
                if (this.peek() === '[') {
                    isNumber = false;
                    this.p++;
                    var prop = this.readValue() || new IdentifierToken(this.input, this.p, this.p, this.file);
                    this.readTo(']');
                    props.push(prop);
                }
                else if (this.peek() === '.' && this.peek(1) !== '.') { // skip range syntax
                    this.p++;
                    var prop = this.readIdentifier();
                    if (!prop.size())
                        break;
                    if (!prop.isNumber())
                        isNumber = false;
                    props.push(prop);
                }
                else
                    break;
            }
            if (!props.length && literalValues.hasOwnProperty(variable.content)) {
                return new LiteralToken(this.input, variable.begin, variable.end, this.file);
            }
            if (isNumber)
                return new NumberToken(variable, props[0]);
            return new PropertyAccessToken(variable, props, this.p);
        };
        Tokenizer.prototype.readRange = function () {
            this.skipBlank();
            var begin = this.p;
            if (this.peek() !== '(')
                return;
            ++this.p;
            var lhs = this.readValueOrThrow();
            this.p += 2;
            var rhs = this.readValueOrThrow();
            ++this.p;
            return new RangeToken(this.input, begin, this.p, lhs, rhs, this.file);
        };
        Tokenizer.prototype.readValueOrThrow = function () {
            var _this = this;
            var value = this.readValue();
            assert(value, function () { return "unexpected token " + _this.snapshot() + ", value expected"; });
            return value;
        };
        Tokenizer.prototype.readQuoted = function () {
            this.skipBlank();
            var begin = this.p;
            if (!(this.peekType() & QUOTE))
                return;
            ++this.p;
            var escaped = false;
            while (this.p < this.N) {
                ++this.p;
                if (this.input[this.p - 1] === this.input[begin] && !escaped)
                    break;
                if (escaped)
                    escaped = false;
                else if (this.input[this.p - 1] === '\\')
                    escaped = true;
            }
            return new QuotedToken(this.input, begin, this.p, this.file);
        };
        Tokenizer.prototype.readFileName = function () {
            var begin = this.p;
            while (!(this.peekType() & BLANK) && this.peek() !== ',' && this.p < this.N)
                this.p++;
            return new IdentifierToken(this.input, begin, this.p, this.file);
        };
        Tokenizer.prototype.match = function (word) {
            for (var i = 0; i < word.length; i++) {
                if (word[i] !== this.input[this.p + i])
                    return false;
            }
            return true;
        };
        Tokenizer.prototype.rmatch = function (pattern) {
            for (var i = 0; i < pattern.length; i++) {
                if (pattern[pattern.length - 1 - i] !== this.input[this.p - 1 - i])
                    return false;
            }
            return true;
        };
        Tokenizer.prototype.peekType = function (n) {
            if (n === void 0) { n = 0; }
            return TYPES[this.input.charCodeAt(this.p + n)];
        };
        Tokenizer.prototype.peek = function (n) {
            if (n === void 0) { n = 0; }
            return this.input[this.p + n];
        };
        Tokenizer.prototype.skipBlank = function () {
            while (this.peekType() & BLANK)
                ++this.p;
        };
        return Tokenizer;
    }());

    var Render = /** @class */ (function () {
        function Render() {
        }
        Render.prototype.renderTemplates = function (templates, ctx, emitter) {
            var templates_1, templates_1_1, tpl, html, e_1, err, e_2_1;
            var e_2, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, 8, 9]);
                        templates_1 = __values(templates), templates_1_1 = templates_1.next();
                        _b.label = 1;
                    case 1:
                        if (!!templates_1_1.done) return [3 /*break*/, 6];
                        tpl = templates_1_1.value;
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, tpl.render(ctx, emitter)];
                    case 3:
                        html = _b.sent();
                        html && emitter.write(html);
                        if (emitter.break || emitter.continue)
                            return [3 /*break*/, 6];
                        return [3 /*break*/, 5];
                    case 4:
                        e_1 = _b.sent();
                        err = RenderError.is(e_1) ? e_1 : new RenderError(e_1, tpl);
                        throw err;
                    case 5:
                        templates_1_1 = templates_1.next();
                        return [3 /*break*/, 1];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_2_1 = _b.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (templates_1_1 && !templates_1_1.done && (_a = templates_1.return)) _a.call(templates_1);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/, emitter.html];
                }
            });
        };
        return Render;
    }());

    var ParseStream = /** @class */ (function () {
        function ParseStream(tokens, parseToken) {
            this.handlers = {};
            this.stopRequested = false;
            this.tokens = tokens;
            this.parseToken = parseToken;
        }
        ParseStream.prototype.on = function (name, cb) {
            this.handlers[name] = cb;
            return this;
        };
        ParseStream.prototype.trigger = function (event, arg) {
            var h = this.handlers[event];
            return h ? (h(arg), true) : false;
        };
        ParseStream.prototype.start = function () {
            this.trigger('start');
            var token;
            while (!this.stopRequested && (token = this.tokens.shift())) {
                if (this.trigger('token', token))
                    continue;
                if (isTagToken(token) && this.trigger("tag:" + token.name, token)) {
                    continue;
                }
                var template = this.parseToken(token, this.tokens);
                this.trigger('template', template);
            }
            if (!this.stopRequested)
                this.trigger('end');
            return this;
        };
        ParseStream.prototype.stop = function () {
            this.stopRequested = true;
            return this;
        };
        return ParseStream;
    }());

    var TemplateImpl = /** @class */ (function () {
        function TemplateImpl(token) {
            this.token = token;
        }
        return TemplateImpl;
    }());

    var Emitter = /** @class */ (function () {
        function Emitter(keepOutputType) {
            this.html = '';
            this.break = false;
            this.continue = false;
            this.keepOutputType = false;
            this.keepOutputType = keepOutputType;
        }
        Emitter.prototype.write = function (html) {
            // This will only preserve the type if the value is isolated.
            // I.E:
            // {{ my-port }} -> 42
            // {{ my-host }}:{{ my-port }} -> 'host:42'
            if (this.keepOutputType === true && typeof html !== 'string' && this.html === '') {
                this.html = html;
            }
            else {
                this.html += html;
            }
        };
        return Emitter;
    }());

    function isComparable(arg) {
        return arg && isFunction(arg.equals);
    }

    function isTruthy(val, ctx) {
        return !isFalsy(val, ctx);
    }
    function isFalsy(val, ctx) {
        if (ctx.opts.jsTruthy) {
            return !val;
        }
        else {
            return val === false || undefined === val || val === null;
        }
    }

    var operatorImpls = {
        '==': function (l, r) {
            if (isComparable(l))
                return l.equals(r);
            if (isComparable(r))
                return r.equals(l);
            return l === r;
        },
        '!=': function (l, r) {
            if (isComparable(l))
                return !l.equals(r);
            if (isComparable(r))
                return !r.equals(l);
            return l !== r;
        },
        '>': function (l, r) {
            if (isComparable(l))
                return l.gt(r);
            if (isComparable(r))
                return r.lt(l);
            return l > r;
        },
        '<': function (l, r) {
            if (isComparable(l))
                return l.lt(r);
            if (isComparable(r))
                return r.gt(l);
            return l < r;
        },
        '>=': function (l, r) {
            if (isComparable(l))
                return l.geq(r);
            if (isComparable(r))
                return r.leq(l);
            return l >= r;
        },
        '<=': function (l, r) {
            if (isComparable(l))
                return l.leq(r);
            if (isComparable(r))
                return r.geq(l);
            return l <= r;
        },
        'contains': function (l, r) {
            return l && isFunction(l.indexOf) ? l.indexOf(r) > -1 : false;
        },
        'and': function (l, r, ctx) { return isTruthy(l, ctx) && isTruthy(r, ctx); },
        'or': function (l, r, ctx) { return isTruthy(l, ctx) || isTruthy(r, ctx); }
    };

    var Expression = /** @class */ (function () {
        function Expression(str, lenient) {
            if (lenient === void 0) { lenient = false; }
            this.operands = [];
            var tokenizer = new Tokenizer(str);
            this.postfix = __spread(toPostfix(tokenizer.readExpression()));
            this.lenient = lenient;
        }
        Expression.prototype.evaluate = function (ctx) {
            var e_1, _a;
            try {
                for (var _b = __values(this.postfix), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var token = _c.value;
                    if (isOperatorToken(token)) {
                        var r = this.operands.pop();
                        var l = this.operands.pop();
                        var result = evalOperatorToken(token, l, r, ctx);
                        this.operands.push(result);
                    }
                    else {
                        this.operands.push(evalToken(token, ctx, this.lenient && this.postfix.length === 1));
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.operands[0];
        };
        Expression.prototype.value = function (ctx) {
            return __generator(this, function (_a) {
                return [2 /*return*/, toValue(this.evaluate(ctx))];
            });
        };
        return Expression;
    }());
    function evalToken(token, ctx, lenient) {
        if (lenient === void 0) { lenient = false; }
        assert(ctx, function () { return 'unable to evaluate: context not defined'; });
        if (isPropertyAccessToken(token)) {
            var variable = token.getVariableAsText();
            var props = token.props.map(function (prop) { return evalToken(prop, ctx); });
            try {
                return ctx.get(__spread([variable], props));
            }
            catch (e) {
                if (lenient && e instanceof InternalUndefinedVariableError) {
                    return null;
                }
                else {
                    throw (new UndefinedVariableError(e, token));
                }
            }
        }
        if (isRangeToken(token))
            return evalRangeToken(token, ctx);
        if (isLiteralToken(token))
            return evalLiteralToken(token);
        if (isNumberToken(token))
            return evalNumberToken(token);
        if (isWordToken(token))
            return token.getText();
        if (isQuotedToken(token))
            return evalQuotedToken(token);
    }
    function evalNumberToken(token) {
        var str = token.whole.content + '.' + (token.decimal ? token.decimal.content : '');
        return Number(str);
    }
    function evalQuotedToken(token) {
        return parseStringLiteral(token.getText());
    }
    function evalOperatorToken(token, lhs, rhs, ctx) {
        var impl = operatorImpls[token.operator];
        return impl(lhs, rhs, ctx);
    }
    function evalLiteralToken(token) {
        return literalValues[token.literal];
    }
    function evalRangeToken(token, ctx) {
        var low = evalToken(token.lhs, ctx);
        var high = evalToken(token.rhs, ctx);
        return range(+low, +high + 1);
    }
    function toPostfix(tokens) {
        var ops, tokens_1, tokens_1_1, token, e_2_1;
        var e_2, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ops = [];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 10, 11, 12]);
                    tokens_1 = __values(tokens), tokens_1_1 = tokens_1.next();
                    _b.label = 2;
                case 2:
                    if (!!tokens_1_1.done) return [3 /*break*/, 9];
                    token = tokens_1_1.value;
                    if (!isOperatorToken(token)) return [3 /*break*/, 6];
                    _b.label = 3;
                case 3:
                    if (!(ops.length && ops[ops.length - 1].getPrecedence() > token.getPrecedence())) return [3 /*break*/, 5];
                    return [4 /*yield*/, ops.pop()];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 3];
                case 5:
                    ops.push(token);
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, token];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8:
                    tokens_1_1 = tokens_1.next();
                    return [3 /*break*/, 2];
                case 9: return [3 /*break*/, 12];
                case 10:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 12];
                case 11:
                    try {
                        if (tokens_1_1 && !tokens_1_1.done && (_a = tokens_1.return)) _a.call(tokens_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 12:
                    if (!ops.length) return [3 /*break*/, 14];
                    return [4 /*yield*/, ops.pop()];
                case 13:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 14: return [2 /*return*/];
            }
        });
    }

    /**
     * Key-Value Pairs Representing Tag Arguments
     * Example:
     *    For the markup `, foo:'bar', coo:2 reversed %}`,
     *    hash['foo'] === 'bar'
     *    hash['coo'] === 2
     *    hash['reversed'] === undefined
     */
    var Hash = /** @class */ (function () {
        function Hash(markup) {
            var e_1, _a;
            this.hash = {};
            var tokenizer = new Tokenizer(markup);
            try {
                for (var _b = __values(tokenizer.readHashes()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var hash = _c.value;
                    this.hash[hash.name.content] = hash.value;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        Hash.prototype.render = function (ctx) {
            var hash, _a, _b, key, _c, _d, e_2_1;
            var e_2, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        hash = {};
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 6, 7, 8]);
                        _a = __values(Object.keys(this.hash)), _b = _a.next();
                        _f.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 5];
                        key = _b.value;
                        _c = hash;
                        _d = key;
                        return [4 /*yield*/, evalToken(this.hash[key], ctx)];
                    case 3:
                        _c[_d] = _f.sent();
                        _f.label = 4;
                    case 4:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_2_1 = _f.sent();
                        e_2 = { error: e_2_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                        }
                        finally { if (e_2) throw e_2.error; }
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/, hash];
                }
            });
        };
        return Hash;
    }());

    function createResolvedThenable(value) {
        var ret = {
            then: function (resolve) { return resolve(value); },
            catch: function () { return ret; }
        };
        return ret;
    }
    function createRejectedThenable(err) {
        var ret = {
            then: function (resolve, reject) {
                if (reject)
                    return reject(err);
                return ret;
            },
            catch: function (reject) { return reject(err); }
        };
        return ret;
    }
    function isThenable(val) {
        return val && isFunction(val.then);
    }
    function isAsyncIterator(val) {
        return val && isFunction(val.next) && isFunction(val.throw) && isFunction(val.return);
    }
    // convert an async iterator to a thenable (Promise compatible)
    function toThenable(val) {
        if (isThenable(val))
            return val;
        if (isAsyncIterator(val))
            return reduce();
        return createResolvedThenable(val);
        function reduce(prev) {
            var state;
            try {
                state = val.next(prev);
            }
            catch (err) {
                return createRejectedThenable(err);
            }
            if (state.done)
                return createResolvedThenable(state.value);
            return toThenable(state.value).then(reduce, function (err) {
                var state;
                try {
                    state = val.throw(err);
                }
                catch (e) {
                    return createRejectedThenable(e);
                }
                if (state.done)
                    return createResolvedThenable(state.value);
                return reduce(state.value);
            });
        }
    }
    function toPromise(val) {
        return Promise.resolve(toThenable(val));
    }
    // get the value of async iterator in synchronous manner
    function toValue$1(val) {
        var ret;
        toThenable(val)
            .then(function (x) {
            ret = x;
            return createResolvedThenable(ret);
        })
            .catch(function (err) {
            throw err;
        });
        return ret;
    }

    var Tag = /** @class */ (function (_super) {
        __extends(Tag, _super);
        function Tag(token, tokens, liquid) {
            var _this = _super.call(this, token) || this;
            _this.name = token.name;
            var impl = liquid.tags.get(token.name);
            _this.impl = Object.create(impl);
            _this.impl.liquid = liquid;
            if (_this.impl.parse) {
                _this.impl.parse(token, tokens);
            }
            return _this;
        }
        Tag.prototype.render = function (ctx, emitter) {
            var hash, impl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Hash(this.token.args).render(ctx)];
                    case 1:
                        hash = _a.sent();
                        impl = this.impl;
                        if (!isFunction(impl.render)) return [3 /*break*/, 3];
                        return [4 /*yield*/, impl.render(ctx, emitter, hash)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/];
                }
            });
        };
        return Tag;
    }(TemplateImpl));

    function isKeyValuePair(arr) {
        return isArray(arr);
    }

    var Filter = /** @class */ (function () {
        function Filter(name, impl, args, liquid) {
            this.name = name;
            this.impl = impl || identify;
            this.args = args;
            this.liquid = liquid;
        }
        Filter.prototype.render = function (value, context) {
            var argv, _a, _b, arg, _c, _d, _e, _f, _g, e_1_1;
            var e_1, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        argv = [];
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 8, 9, 10]);
                        _a = __values(this.args), _b = _a.next();
                        _j.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 7];
                        arg = _b.value;
                        if (!isKeyValuePair(arg)) return [3 /*break*/, 4];
                        _d = (_c = argv).push;
                        _e = [arg[0]];
                        return [4 /*yield*/, evalToken(arg[1], context)];
                    case 3:
                        _d.apply(_c, [_e.concat([_j.sent()])]);
                        return [3 /*break*/, 6];
                    case 4:
                        _g = (_f = argv).push;
                        return [4 /*yield*/, evalToken(arg, context)];
                    case 5:
                        _g.apply(_f, [_j.sent()]);
                        _j.label = 6;
                    case 6:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 7: return [3 /*break*/, 10];
                    case 8:
                        e_1_1 = _j.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 10];
                    case 9:
                        try {
                            if (_b && !_b.done && (_h = _a.return)) _h.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 10: return [4 /*yield*/, this.impl.apply({ context: context, liquid: this.liquid }, __spread([value], argv))];
                    case 11: return [2 /*return*/, _j.sent()];
                }
            });
        };
        return Filter;
    }());

    var Value = /** @class */ (function () {
        /**
         * @param str the value to be valuated, eg.: "foobar" | truncate: 3
         */
        function Value(str, filterMap, liquid) {
            var _this = this;
            this.filterMap = filterMap;
            this.filters = [];
            var tokenizer = new Tokenizer(str);
            this.initial = tokenizer.readValue();
            this.filters = tokenizer.readFilters().map(function (_a) {
                var name = _a.name, args = _a.args;
                return new Filter(name, _this.filterMap.get(name), args, liquid);
            });
        }
        Value.prototype.value = function (ctx) {
            var lenient, val, _a, _b, filter, e_1_1;
            var e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        lenient = ctx.opts.lenientIf && this.filters.length > 0 && this.filters[0].name === 'default';
                        return [4 /*yield*/, evalToken(this.initial, ctx, lenient)];
                    case 1:
                        val = _d.sent();
                        _d.label = 2;
                    case 2:
                        _d.trys.push([2, 7, 8, 9]);
                        _a = __values(this.filters), _b = _a.next();
                        _d.label = 3;
                    case 3:
                        if (!!_b.done) return [3 /*break*/, 6];
                        filter = _b.value;
                        return [4 /*yield*/, filter.render(val, ctx)];
                    case 4:
                        val = _d.sent();
                        _d.label = 5;
                    case 5:
                        _b = _a.next();
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/, val];
                }
            });
        };
        return Value;
    }());

    var Output = /** @class */ (function (_super) {
        __extends(Output, _super);
        function Output(token, filters, liquid) {
            var _this = _super.call(this, token) || this;
            _this.value = new Value(token.content, filters, liquid);
            return _this;
        }
        Output.prototype.render = function (ctx, emitter) {
            var val;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.value.value(ctx)];
                    case 1:
                        val = _a.sent();
                        if (ctx.opts.keepOutputType) {
                            emitter.write(toValue(val));
                        }
                        else {
                            emitter.write(stringify(toValue(val)));
                        }
                        return [2 /*return*/];
                }
            });
        };
        return Output;
    }(TemplateImpl));

    var HTML = /** @class */ (function (_super) {
        __extends(HTML, _super);
        function HTML(token) {
            var _this = _super.call(this, token) || this;
            _this.str = token.getContent();
            return _this;
        }
        HTML.prototype.render = function (ctx, emitter) {
            return __generator(this, function (_a) {
                emitter.write(this.str);
                return [2 /*return*/];
            });
        };
        return HTML;
    }(TemplateImpl));

    var Parser = /** @class */ (function () {
        function Parser(liquid) {
            this.liquid = liquid;
        }
        Parser.prototype.parse = function (tokens) {
            var token;
            var templates = [];
            while ((token = tokens.shift())) {
                templates.push(this.parseToken(token, tokens));
            }
            return templates;
        };
        Parser.prototype.parseToken = function (token, remainTokens) {
            try {
                if (isTagToken(token)) {
                    return new Tag(token, remainTokens, this.liquid);
                }
                if (isOutputToken(token)) {
                    return new Output(token, this.liquid.filters, this.liquid);
                }
                return new HTML(token);
            }
            catch (e) {
                throw new ParseError(e, token);
            }
        };
        Parser.prototype.parseStream = function (tokens) {
            var _this = this;
            return new ParseStream(tokens, function (token, tokens) { return _this.parseToken(token, tokens); });
        };
        return Parser;
    }());

    var assign = {
        parse: function (token) {
            var tokenizer = new Tokenizer(token.args);
            this.key = tokenizer.readIdentifier().content;
            tokenizer.skipBlank();
            assert(tokenizer.peek() === '=', function () { return "illegal token " + token.getText(); });
            tokenizer.advance();
            this.value = tokenizer.remaining();
        },
        render: function (ctx) {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = ctx.bottom();
                        _b = this.key;
                        return [4 /*yield*/, this.liquid._evalValue(this.value, ctx)];
                    case 1:
                        _a[_b] = _c.sent();
                        return [2 /*return*/];
                }
            });
        }
    };

    function toEnumerable(val) {
        if (isArray(val))
            return val;
        if (isString(val) && val.length > 0)
            return [val];
        if (isObject(val))
            return Object.keys(val).map(function (key) { return [key, val[key]]; });
        return [];
    }
    function toArray(val) {
        if (isArray(val))
            return val;
        return [val];
    }

    var ForloopDrop = /** @class */ (function (_super) {
        __extends(ForloopDrop, _super);
        function ForloopDrop(length) {
            var _this = _super.call(this) || this;
            _this.i = 0;
            _this.length = length;
            return _this;
        }
        ForloopDrop.prototype.next = function () {
            this.i++;
        };
        ForloopDrop.prototype.index0 = function () {
            return this.i;
        };
        ForloopDrop.prototype.index = function () {
            return this.i + 1;
        };
        ForloopDrop.prototype.first = function () {
            return this.i === 0;
        };
        ForloopDrop.prototype.last = function () {
            return this.i === this.length - 1;
        };
        ForloopDrop.prototype.rindex = function () {
            return this.length - this.i;
        };
        ForloopDrop.prototype.rindex0 = function () {
            return this.length - this.i - 1;
        };
        ForloopDrop.prototype.valueOf = function () {
            return JSON.stringify(this);
        };
        return ForloopDrop;
    }(Drop));

    var For = {
        type: 'block',
        parse: function (token, remainTokens) {
            var _this = this;
            var toknenizer = new Tokenizer(token.args);
            var variable = toknenizer.readIdentifier();
            var inStr = toknenizer.readIdentifier();
            var collection = toknenizer.readValue();
            assert(variable.size() && inStr.content === 'in' && collection, function () { return "illegal tag: " + token.getText(); });
            this.variable = variable.content;
            this.collection = collection;
            this.hash = new Hash(toknenizer.remaining());
            this.templates = [];
            this.elseTemplates = [];
            var p;
            var stream = this.liquid.parser.parseStream(remainTokens)
                .on('start', function () { return (p = _this.templates); })
                .on('tag:else', function () { return (p = _this.elseTemplates); })
                .on('tag:endfor', function () { return stream.stop(); })
                .on('template', function (tpl) { return p.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + token.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx, emitter) {
            var r, collection, _a, hash, offset, limit, scope, collection_1, collection_1_1, item, e_1_1;
            var e_1, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        r = this.liquid.renderer;
                        _a = toEnumerable;
                        return [4 /*yield*/, evalToken(this.collection, ctx)];
                    case 1:
                        collection = _a.apply(void 0, [_c.sent()]);
                        if (!!collection.length) return [3 /*break*/, 3];
                        return [4 /*yield*/, r.renderTemplates(this.elseTemplates, ctx, emitter)];
                    case 2:
                        _c.sent();
                        return [2 /*return*/];
                    case 3: return [4 /*yield*/, this.hash.render(ctx)];
                    case 4:
                        hash = _c.sent();
                        offset = hash.offset || 0;
                        limit = (hash.limit === undefined) ? collection.length : hash.limit;
                        collection = collection.slice(offset, offset + limit);
                        if ('reversed' in hash)
                            collection.reverse();
                        scope = { forloop: new ForloopDrop(collection.length) };
                        ctx.push(scope);
                        _c.label = 5;
                    case 5:
                        _c.trys.push([5, 10, 11, 12]);
                        collection_1 = __values(collection), collection_1_1 = collection_1.next();
                        _c.label = 6;
                    case 6:
                        if (!!collection_1_1.done) return [3 /*break*/, 9];
                        item = collection_1_1.value;
                        scope[this.variable] = item;
                        return [4 /*yield*/, r.renderTemplates(this.templates, ctx, emitter)];
                    case 7:
                        _c.sent();
                        if (emitter.break) {
                            emitter.break = false;
                            return [3 /*break*/, 9];
                        }
                        emitter.continue = false;
                        scope.forloop.next();
                        _c.label = 8;
                    case 8:
                        collection_1_1 = collection_1.next();
                        return [3 /*break*/, 6];
                    case 9: return [3 /*break*/, 12];
                    case 10:
                        e_1_1 = _c.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 11:
                        try {
                            if (collection_1_1 && !collection_1_1.done && (_b = collection_1.return)) _b.call(collection_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 12:
                        ctx.pop();
                        return [2 /*return*/];
                }
            });
        }
    };

    var capture = {
        parse: function (tagToken, remainTokens) {
            var _this = this;
            var tokenizer = new Tokenizer(tagToken.args);
            this.variable = readVariableName(tokenizer);
            assert(this.variable, function () { return tagToken.args + " not valid identifier"; });
            this.templates = [];
            var stream = this.liquid.parser.parseStream(remainTokens);
            stream.on('tag:endcapture', function () { return stream.stop(); })
                .on('template', function (tpl) { return _this.templates.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx) {
            var r, html;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        r = this.liquid.renderer;
                        return [4 /*yield*/, r.renderTemplates(this.templates, ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 1:
                        html = _a.sent();
                        ctx.bottom()[this.variable] = html;
                        return [2 /*return*/];
                }
            });
        }
    };
    function readVariableName(tokenizer) {
        var word = tokenizer.readIdentifier().content;
        if (word)
            return word;
        var quoted = tokenizer.readQuoted();
        if (quoted)
            return evalQuotedToken(quoted);
    }

    var Case = {
        parse: function (tagToken, remainTokens) {
            var _this = this;
            this.cond = tagToken.args;
            this.cases = [];
            this.elseTemplates = [];
            var p = [];
            var stream = this.liquid.parser.parseStream(remainTokens)
                .on('tag:when', function (token) {
                _this.cases.push({
                    val: token.args,
                    templates: p = []
                });
            })
                .on('tag:else', function () { return (p = _this.elseTemplates); })
                .on('tag:endcase', function () { return stream.stop(); })
                .on('template', function (tpl) { return p.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx, emitter) {
            var r, cond, i, branch, val;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        r = this.liquid.renderer;
                        return [4 /*yield*/, new Expression(this.cond).value(ctx)];
                    case 1:
                        cond = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < this.cases.length)) return [3 /*break*/, 6];
                        branch = this.cases[i];
                        return [4 /*yield*/, new Expression(branch.val).value(ctx)];
                    case 3:
                        val = _a.sent();
                        if (!(val === cond)) return [3 /*break*/, 5];
                        return [4 /*yield*/, r.renderTemplates(branch.templates, ctx, emitter)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                    case 5:
                        i++;
                        return [3 /*break*/, 2];
                    case 6: return [4 /*yield*/, r.renderTemplates(this.elseTemplates, ctx, emitter)];
                    case 7:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }
    };

    var comment = {
        parse: function (tagToken, remainTokens) {
            var stream = this.liquid.parser.parseStream(remainTokens);
            stream
                .on('token', function (token) {
                if (token.name === 'endcomment')
                    stream.stop();
            })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        }
    };

    var BlockMode;
    (function (BlockMode) {
        /* store rendered html into blocks */
        BlockMode[BlockMode["OUTPUT"] = 0] = "OUTPUT";
        /* output rendered html directly */
        BlockMode[BlockMode["STORE"] = 1] = "STORE";
    })(BlockMode || (BlockMode = {}));
    var BlockMode$1 = BlockMode;

    var include = {
        parse: function (token) {
            var args = token.args;
            var tokenizer = new Tokenizer(args);
            this.file = this.liquid.options.dynamicPartials
                ? tokenizer.readValue()
                : tokenizer.readFileName();
            assert(this.file, function () { return "illegal argument \"" + token.args + "\""; });
            var begin = tokenizer.p;
            var withStr = tokenizer.readIdentifier();
            if (withStr.content === 'with') {
                tokenizer.skipBlank();
                if (tokenizer.peek() !== ':') {
                    this.withVar = tokenizer.readValue();
                }
                else
                    tokenizer.p = begin;
            }
            else
                tokenizer.p = begin;
            this.hash = new Hash(tokenizer.remaining());
        },
        render: function (ctx, emitter) {
            var _a, liquid, hash, withVar, file, renderer, filepath, _b, _c, saved, scope, templates;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = this, liquid = _a.liquid, hash = _a.hash, withVar = _a.withVar, file = _a.file;
                        renderer = liquid.renderer;
                        if (!ctx.opts.dynamicPartials) return [3 /*break*/, 5];
                        if (!isQuotedToken(file)) return [3 /*break*/, 2];
                        return [4 /*yield*/, renderer.renderTemplates(liquid.parse(evalQuotedToken(file)), ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 1:
                        _c = _d.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, evalToken(file, ctx)];
                    case 3:
                        _c = _d.sent();
                        _d.label = 4;
                    case 4:
                        _b = (_c);
                        return [3 /*break*/, 6];
                    case 5:
                        _b = file.getText();
                        _d.label = 6;
                    case 6:
                        filepath = _b;
                        assert(filepath, function () { return "illegal filename \"" + file.getText() + "\":\"" + filepath + "\""; });
                        saved = ctx.saveRegister('blocks', 'blockMode');
                        ctx.setRegister('blocks', {});
                        ctx.setRegister('blockMode', BlockMode$1.OUTPUT);
                        return [4 /*yield*/, hash.render(ctx)];
                    case 7:
                        scope = _d.sent();
                        if (withVar)
                            scope[filepath] = evalToken(withVar, ctx);
                        return [4 /*yield*/, liquid._parseFile(filepath, ctx.opts, ctx.sync)];
                    case 8:
                        templates = _d.sent();
                        ctx.push(scope);
                        return [4 /*yield*/, renderer.renderTemplates(templates, ctx, emitter)];
                    case 9:
                        _d.sent();
                        ctx.pop();
                        ctx.restoreRegister(saved);
                        return [2 /*return*/];
                }
            });
        }
    };

    var render = {
        parse: function (token) {
            var args = token.args;
            var tokenizer = new Tokenizer(args);
            this.file = this.liquid.options.dynamicPartials
                ? tokenizer.readValue()
                : tokenizer.readFileName();
            assert(this.file, function () { return "illegal argument \"" + token.args + "\""; });
            while (!tokenizer.end()) {
                tokenizer.skipBlank();
                var begin = tokenizer.p;
                var keyword = tokenizer.readIdentifier();
                if (keyword.content === 'with' || keyword.content === 'for') {
                    tokenizer.skipBlank();
                    if (tokenizer.peek() !== ':') {
                        var value = tokenizer.readValue();
                        if (value) {
                            var beforeAs = tokenizer.p;
                            var asStr = tokenizer.readIdentifier();
                            var alias = void 0;
                            if (asStr.content === 'as')
                                alias = tokenizer.readIdentifier();
                            else
                                tokenizer.p = beforeAs;
                            this[keyword.content] = { value: value, alias: alias && alias.content };
                            tokenizer.skipBlank();
                            if (tokenizer.peek() === ',')
                                tokenizer.advance();
                            continue;
                        }
                    }
                }
                tokenizer.p = begin;
                break;
            }
            this.hash = new Hash(tokenizer.remaining());
        },
        render: function (ctx, emitter) {
            var _a, liquid, file, hash, renderer, filepath, _b, _c, childCtx, scope, _d, value, alias, _e, value, alias, collection, collection_1, collection_1_1, item, templates, e_1_1, templates;
            var e_1, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _a = this, liquid = _a.liquid, file = _a.file, hash = _a.hash;
                        renderer = liquid.renderer;
                        if (!ctx.opts.dynamicPartials) return [3 /*break*/, 4];
                        if (!isQuotedToken(file)) return [3 /*break*/, 2];
                        return [4 /*yield*/, renderer.renderTemplates(liquid.parse(evalQuotedToken(file)), ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 1:
                        _c = _g.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _c = evalToken(file, ctx);
                        _g.label = 3;
                    case 3:
                        _b = (_c);
                        return [3 /*break*/, 5];
                    case 4:
                        _b = file.getText();
                        _g.label = 5;
                    case 5:
                        filepath = _b;
                        assert(filepath, function () { return "illegal filename \"" + file.getText() + "\":\"" + filepath + "\""; });
                        childCtx = new Context({}, ctx.opts, ctx.sync);
                        return [4 /*yield*/, hash.render(ctx)];
                    case 6:
                        scope = _g.sent();
                        if (this['with']) {
                            _d = this['with'], value = _d.value, alias = _d.alias;
                            scope[alias || filepath] = evalToken(value, ctx);
                        }
                        childCtx.push(scope);
                        if (!this['for']) return [3 /*break*/, 16];
                        _e = this['for'], value = _e.value, alias = _e.alias;
                        collection = evalToken(value, ctx);
                        collection = toEnumerable(collection);
                        scope['forloop'] = new ForloopDrop(collection.length);
                        _g.label = 7;
                    case 7:
                        _g.trys.push([7, 13, 14, 15]);
                        collection_1 = __values(collection), collection_1_1 = collection_1.next();
                        _g.label = 8;
                    case 8:
                        if (!!collection_1_1.done) return [3 /*break*/, 12];
                        item = collection_1_1.value;
                        scope[alias] = item;
                        return [4 /*yield*/, liquid._parseFile(filepath, childCtx.opts, childCtx.sync)];
                    case 9:
                        templates = _g.sent();
                        return [4 /*yield*/, renderer.renderTemplates(templates, childCtx, emitter)];
                    case 10:
                        _g.sent();
                        scope.forloop.next();
                        _g.label = 11;
                    case 11:
                        collection_1_1 = collection_1.next();
                        return [3 /*break*/, 8];
                    case 12: return [3 /*break*/, 15];
                    case 13:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 15];
                    case 14:
                        try {
                            if (collection_1_1 && !collection_1_1.done && (_f = collection_1.return)) _f.call(collection_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 15: return [3 /*break*/, 19];
                    case 16: return [4 /*yield*/, liquid._parseFile(filepath, childCtx.opts, childCtx.sync)];
                    case 17:
                        templates = _g.sent();
                        return [4 /*yield*/, renderer.renderTemplates(templates, childCtx, emitter)];
                    case 18:
                        _g.sent();
                        _g.label = 19;
                    case 19: return [2 /*return*/];
                }
            });
        }
    };

    var decrement = {
        parse: function (token) {
            var tokenizer = new Tokenizer(token.args);
            this.variable = tokenizer.readIdentifier().content;
        },
        render: function (context, emitter) {
            var scope = context.environments;
            if (!isNumber(scope[this.variable])) {
                scope[this.variable] = 0;
            }
            emitter.write(stringify(--scope[this.variable]));
        }
    };

    var cycle = {
        parse: function (tagToken) {
            var tokenizer = new Tokenizer(tagToken.args);
            var group = tokenizer.readValue();
            tokenizer.skipBlank();
            this.candidates = [];
            if (group) {
                if (tokenizer.peek() === ':') {
                    this.group = group;
                    tokenizer.advance();
                }
                else
                    this.candidates.push(group);
            }
            while (!tokenizer.end()) {
                var value = tokenizer.readValue();
                if (value)
                    this.candidates.push(value);
                tokenizer.readTo(',');
            }
            assert(this.candidates.length, function () { return "empty candidates: " + tagToken.getText(); });
        },
        render: function (ctx, emitter) {
            var group = evalToken(this.group, ctx);
            var fingerprint = "cycle:" + group + ":" + this.candidates.join(',');
            var groups = ctx.getRegister('cycle');
            var idx = groups[fingerprint];
            if (idx === undefined) {
                idx = groups[fingerprint] = 0;
            }
            var candidate = this.candidates[idx];
            idx = (idx + 1) % this.candidates.length;
            groups[fingerprint] = idx;
            var html = evalToken(candidate, ctx);
            emitter.write(html);
        }
    };

    var If = {
        parse: function (tagToken, remainTokens) {
            var _this = this;
            this.branches = [];
            this.elseTemplates = [];
            var p;
            var stream = this.liquid.parser.parseStream(remainTokens)
                .on('start', function () { return _this.branches.push({
                cond: tagToken.args,
                templates: (p = [])
            }); })
                .on('tag:elsif', function (token) {
                _this.branches.push({
                    cond: token.args,
                    templates: p = []
                });
            })
                .on('tag:else', function () { return (p = _this.elseTemplates); })
                .on('tag:endif', function () { return stream.stop(); })
                .on('template', function (tpl) { return p.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx, emitter) {
            var r, _a, _b, branch, cond, e_1_1;
            var e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        r = this.liquid.renderer;
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 7, 8, 9]);
                        _a = __values(this.branches), _b = _a.next();
                        _d.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 6];
                        branch = _b.value;
                        return [4 /*yield*/, new Expression(branch.cond, ctx.opts.lenientIf).value(ctx)];
                    case 3:
                        cond = _d.sent();
                        if (!isTruthy(cond, ctx)) return [3 /*break*/, 5];
                        return [4 /*yield*/, r.renderTemplates(branch.templates, ctx, emitter)];
                    case 4:
                        _d.sent();
                        return [2 /*return*/];
                    case 5:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 9];
                    case 8:
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 9: return [4 /*yield*/, r.renderTemplates(this.elseTemplates, ctx, emitter)];
                    case 10:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }
    };

    var increment = {
        parse: function (token) {
            var tokenizer = new Tokenizer(token.args);
            this.variable = tokenizer.readIdentifier().content;
        },
        render: function (context, emitter) {
            var scope = context.environments;
            if (!isNumber(scope[this.variable])) {
                scope[this.variable] = 0;
            }
            var val = scope[this.variable];
            scope[this.variable]++;
            emitter.write(stringify(val));
        }
    };

    var layout = {
        parse: function (token, remainTokens) {
            var tokenizer = new Tokenizer(token.args);
            var file = this.liquid.options.dynamicPartials ? tokenizer.readValue() : tokenizer.readFileName();
            assert(file, function () { return "illegal argument \"" + token.args + "\""; });
            this.file = file;
            this.hash = new Hash(tokenizer.remaining());
            this.tpls = this.liquid.parser.parse(remainTokens);
        },
        render: function (ctx, emitter) {
            var _a, liquid, hash, file, renderer, filepath, _b, _c, blocks, html, templates, _d, _e, partial;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _a = this, liquid = _a.liquid, hash = _a.hash, file = _a.file;
                        renderer = liquid.renderer;
                        if (!ctx.opts.dynamicPartials) return [3 /*break*/, 4];
                        if (!isQuotedToken(file)) return [3 /*break*/, 2];
                        return [4 /*yield*/, renderer.renderTemplates(liquid.parse(evalQuotedToken(file)), ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 1:
                        _c = _f.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _c = evalToken(this.file, ctx);
                        _f.label = 3;
                    case 3:
                        _b = (_c);
                        return [3 /*break*/, 5];
                    case 4:
                        _b = file.getText();
                        _f.label = 5;
                    case 5:
                        filepath = _b;
                        assert(filepath, function () { return "illegal filename \"" + file.getText() + "\":\"" + filepath + "\""; });
                        // render the remaining tokens immediately
                        ctx.setRegister('blockMode', BlockMode$1.STORE);
                        blocks = ctx.getRegister('blocks');
                        return [4 /*yield*/, renderer.renderTemplates(this.tpls, ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 6:
                        html = _f.sent();
                        if (blocks[''] === undefined)
                            blocks[''] = html;
                        return [4 /*yield*/, liquid._parseFile(filepath, ctx.opts, ctx.sync)];
                    case 7:
                        templates = _f.sent();
                        _e = (_d = ctx).push;
                        return [4 /*yield*/, hash.render(ctx)];
                    case 8:
                        _e.apply(_d, [_f.sent()]);
                        ctx.setRegister('blockMode', BlockMode$1.OUTPUT);
                        return [4 /*yield*/, renderer.renderTemplates(templates, ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 9:
                        partial = _f.sent();
                        ctx.pop();
                        emitter.write(partial);
                        return [2 /*return*/];
                }
            });
        }
    };

    var block = {
        parse: function (token, remainTokens) {
            var _this = this;
            var match = /\w+/.exec(token.args);
            this.block = match ? match[0] : '';
            this.tpls = [];
            var stream = this.liquid.parser.parseStream(remainTokens)
                .on('tag:endblock', function () { return stream.stop(); })
                .on('template', function (tpl) { return _this.tpls.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + token.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx, emitter) {
            var blocks, childDefined, r, html, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        blocks = ctx.getRegister('blocks');
                        childDefined = blocks[this.block];
                        r = this.liquid.renderer;
                        if (!(childDefined !== undefined)) return [3 /*break*/, 1];
                        _a = childDefined;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, r.renderTemplates(this.tpls, ctx, new Emitter(ctx.opts.keepOutputType))];
                    case 2:
                        _a = _b.sent();
                        _b.label = 3;
                    case 3:
                        html = _a;
                        if (ctx.getRegister('blockMode', BlockMode$1.OUTPUT) === BlockMode$1.STORE) {
                            blocks[this.block] = html;
                            return [2 /*return*/];
                        }
                        emitter.write(html);
                        return [2 /*return*/];
                }
            });
        }
    };

    var raw = {
        parse: function (tagToken, remainTokens) {
            var _this = this;
            this.tokens = [];
            var stream = this.liquid.parser.parseStream(remainTokens);
            stream
                .on('token', function (token) {
                if (token.name === 'endraw')
                    stream.stop();
                else
                    _this.tokens.push(token);
            })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        },
        render: function () {
            return this.tokens.map(function (token) { return token.getText(); }).join('');
        }
    };

    var TablerowloopDrop = /** @class */ (function (_super) {
        __extends(TablerowloopDrop, _super);
        function TablerowloopDrop(length, cols) {
            var _this = _super.call(this, length) || this;
            _this.length = length;
            _this.cols = cols;
            return _this;
        }
        TablerowloopDrop.prototype.row = function () {
            return Math.floor(this.i / this.cols) + 1;
        };
        TablerowloopDrop.prototype.col0 = function () {
            return (this.i % this.cols);
        };
        TablerowloopDrop.prototype.col = function () {
            return this.col0() + 1;
        };
        TablerowloopDrop.prototype.col_first = function () {
            return this.col0() === 0;
        };
        TablerowloopDrop.prototype.col_last = function () {
            return this.col() === this.cols;
        };
        return TablerowloopDrop;
    }(ForloopDrop));

    var tablerow = {
        parse: function (tagToken, remainTokens) {
            var _this = this;
            var tokenizer = new Tokenizer(tagToken.args);
            this.variable = tokenizer.readIdentifier();
            tokenizer.skipBlank();
            var tmp = tokenizer.readIdentifier();
            assert(tmp && tmp.content === 'in', function () { return "illegal tag: " + tagToken.getText(); });
            this.collection = tokenizer.readValue();
            this.hash = new Hash(tokenizer.remaining());
            this.templates = [];
            var p;
            var stream = this.liquid.parser.parseStream(remainTokens)
                .on('start', function () { return (p = _this.templates); })
                .on('tag:endtablerow', function () { return stream.stop(); })
                .on('template', function (tpl) { return p.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx, emitter) {
            var collection, _a, hash, offset, limit, cols, r, tablerowloop, scope, idx;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = toEnumerable;
                        return [4 /*yield*/, evalToken(this.collection, ctx)];
                    case 1:
                        collection = _a.apply(void 0, [_b.sent()]);
                        return [4 /*yield*/, this.hash.render(ctx)];
                    case 2:
                        hash = _b.sent();
                        offset = hash.offset || 0;
                        limit = (hash.limit === undefined) ? collection.length : hash.limit;
                        collection = collection.slice(offset, offset + limit);
                        cols = hash.cols || collection.length;
                        r = this.liquid.renderer;
                        tablerowloop = new TablerowloopDrop(collection.length, cols);
                        scope = { tablerowloop: tablerowloop };
                        ctx.push(scope);
                        idx = 0;
                        _b.label = 3;
                    case 3:
                        if (!(idx < collection.length)) return [3 /*break*/, 6];
                        scope[this.variable.content] = collection[idx];
                        if (tablerowloop.col0() === 0) {
                            if (tablerowloop.row() !== 1)
                                emitter.write('</tr>');
                            emitter.write("<tr class=\"row" + tablerowloop.row() + "\">");
                        }
                        emitter.write("<td class=\"col" + tablerowloop.col() + "\">");
                        return [4 /*yield*/, r.renderTemplates(this.templates, ctx, emitter)];
                    case 4:
                        _b.sent();
                        emitter.write('</td>');
                        _b.label = 5;
                    case 5:
                        idx++, tablerowloop.next();
                        return [3 /*break*/, 3];
                    case 6:
                        if (collection.length)
                            emitter.write('</tr>');
                        ctx.pop();
                        return [2 /*return*/];
                }
            });
        }
    };

    var unless = {
        parse: function (tagToken, remainTokens) {
            var _this = this;
            this.templates = [];
            this.branches = [];
            this.elseTemplates = [];
            var p;
            var stream = this.liquid.parser.parseStream(remainTokens)
                .on('start', function () {
                p = _this.templates;
                _this.cond = tagToken.args;
            })
                .on('tag:elsif', function (token) {
                _this.branches.push({
                    cond: token.args,
                    templates: p = []
                });
            })
                .on('tag:else', function () { return (p = _this.elseTemplates); })
                .on('tag:endunless', function () { return stream.stop(); })
                .on('template', function (tpl) { return p.push(tpl); })
                .on('end', function () {
                throw new Error("tag " + tagToken.getText() + " not closed");
            });
            stream.start();
        },
        render: function (ctx, emitter) {
            var r, cond, _a, _b, branch, cond_1, e_1_1;
            var e_1, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        r = this.liquid.renderer;
                        return [4 /*yield*/, new Expression(this.cond, ctx.opts.lenientIf).value(ctx)];
                    case 1:
                        cond = _d.sent();
                        if (!isFalsy(cond, ctx)) return [3 /*break*/, 3];
                        return [4 /*yield*/, r.renderTemplates(this.templates, ctx, emitter)];
                    case 2:
                        _d.sent();
                        return [2 /*return*/];
                    case 3:
                        _d.trys.push([3, 9, 10, 11]);
                        _a = __values(this.branches), _b = _a.next();
                        _d.label = 4;
                    case 4:
                        if (!!_b.done) return [3 /*break*/, 8];
                        branch = _b.value;
                        return [4 /*yield*/, new Expression(branch.cond, ctx.opts.lenientIf).value(ctx)];
                    case 5:
                        cond_1 = _d.sent();
                        if (!isTruthy(cond_1, ctx)) return [3 /*break*/, 7];
                        return [4 /*yield*/, r.renderTemplates(branch.templates, ctx, emitter)];
                    case 6:
                        _d.sent();
                        return [2 /*return*/];
                    case 7:
                        _b = _a.next();
                        return [3 /*break*/, 4];
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 11];
                    case 10:
                        try {
                            if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 11: return [4 /*yield*/, r.renderTemplates(this.elseTemplates, ctx, emitter)];
                    case 12:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        }
    };

    var Break = {
        render: function (ctx, emitter) {
            emitter.break = true;
        }
    };

    var Continue = {
        render: function (ctx, emitter) {
            emitter.continue = true;
        }
    };

    var tags = {
        assign: assign, 'for': For, capture: capture, 'case': Case, comment: comment, include: include, render: render, decrement: decrement, increment: increment, cycle: cycle, 'if': If, layout: layout, block: block, raw: raw, tablerow: tablerow, unless: unless, 'break': Break, 'continue': Continue
    };

    var escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&#34;',
        "'": '&#39;'
    };
    var unescapeMap = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&#34;': '"',
        '&#39;': "'"
    };
    function escape(str) {
        return stringify(str).replace(/&|<|>|"|'/g, function (m) { return escapeMap[m]; });
    }
    function unescape(str) {
        return String(str).replace(/&(amp|lt|gt|#34|#39);/g, function (m) { return unescapeMap[m]; });
    }
    function escapeOnce(str) {
        return escape(unescape(str));
    }
    function newlineToBr(v) {
        return v.replace(/\n/g, '<br/>');
    }
    function stripHtml(v) {
        return v.replace(/<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>|<.*?>/g, '');
    }

    var abs = Math.abs;
    var atLeast = Math.max;
    var atMost = Math.min;
    var ceil = Math.ceil;
    var dividedBy = function (v, arg) { return v / arg; };
    var floor = Math.floor;
    var minus = function (v, arg) { return v - arg; };
    var modulo = function (v, arg) { return v % arg; };
    var times = function (v, arg) { return v * arg; };
    function round(v, arg) {
        if (arg === void 0) { arg = 0; }
        var amp = Math.pow(10, arg);
        return Math.round(v * amp) / amp;
    }
    function plus(v, arg) {
        return Number(v) + Number(arg);
    }
    function sortNatural(input, property) {
        if (!input || !input.sort)
            return [];
        if (property !== undefined) {
            return __spread(input).sort(function (lhs, rhs) { return caseInsensitiveCompare(lhs[property], rhs[property]); });
        }
        return __spread(input).sort(caseInsensitiveCompare);
    }

    var urlDecode = function (x) { return x.split('+').map(decodeURIComponent).join(' '); };
    var urlEncode = function (x) { return x.split(' ').map(encodeURIComponent).join('+'); };

    var join = function (v, arg) { return v.join(arg === undefined ? ' ' : arg); };
    var last$1 = function (v) { return isArray(v) ? last(v) : ''; };
    var first = function (v) { return isArray(v) ? v[0] : ''; };
    var reverse = function (v) { return __spread(v).reverse(); };
    function sort(arr, property) {
        var _this = this;
        var getValue = function (obj) { return property ? _this.context.getFromScope(obj, property.split('.')) : obj; };
        return toArray(arr).sort(function (lhs, rhs) {
            lhs = getValue(lhs);
            rhs = getValue(rhs);
            return lhs < rhs ? -1 : (lhs > rhs ? 1 : 0);
        });
    }
    var size = function (v) { return (v && v.length) || 0; };
    function map(arr, property) {
        var _this = this;
        return toArray(arr).map(function (obj) { return _this.context.getFromScope(obj, property.split('.')); });
    }
    function concat(v, arg) {
        return toArray(v).concat(arg);
    }
    function slice(v, begin, length) {
        if (length === void 0) { length = 1; }
        begin = begin < 0 ? v.length + begin : begin;
        return v.slice(begin, begin + length);
    }
    function where(arr, property, expected) {
        var _this = this;
        return toArray(arr).filter(function (obj) {
            var value = _this.context.getFromScope(obj, String(property).split('.'));
            return expected === undefined ? isTruthy(value, _this.context) : value === expected;
        });
    }
    function uniq(arr) {
        var u = {};
        return (arr || []).filter(function (val) {
            if (u.hasOwnProperty(String(val)))
                return false;
            u[String(val)] = true;
            return true;
        });
    }

    var rFormat = /%([-_0^#:]+)?(\d+)?([EO])?(.)/;
    var monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];
    var dayNames = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];
    var monthNamesShort = monthNames.map(abbr);
    var dayNamesShort = dayNames.map(abbr);
    var suffixes = {
        1: 'st',
        2: 'nd',
        3: 'rd',
        'default': 'th'
    };
    function abbr(str) {
        return str.slice(0, 3);
    }
    // prototype extensions
    function daysInMonth(d) {
        var feb = isLeapYear(d) ? 29 : 28;
        return [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    }
    function getDayOfYear(d) {
        var num = 0;
        for (var i = 0; i < d.getMonth(); ++i) {
            num += daysInMonth(d)[i];
        }
        return num + d.getDate();
    }
    function getWeekOfYear(d, startDay) {
        // Skip to startDay of this week
        var now = getDayOfYear(d) + (startDay - d.getDay());
        // Find the first startDay of the year
        var jan1 = new Date(d.getFullYear(), 0, 1);
        var then = (7 - jan1.getDay() + startDay);
        return String(Math.floor((now - then) / 7) + 1);
    }
    function isLeapYear(d) {
        var year = d.getFullYear();
        return !!((year & 3) === 0 && (year % 100 || (year % 400 === 0 && year)));
    }
    function getSuffix(d) {
        var str = d.getDate().toString();
        var index = parseInt(str.slice(-1));
        return suffixes[index] || suffixes['default'];
    }
    function century(d) {
        return parseInt(d.getFullYear().toString().substring(0, 2), 10);
    }
    // default to 0
    var padWidths = {
        d: 2,
        e: 2,
        H: 2,
        I: 2,
        j: 3,
        k: 2,
        l: 2,
        L: 3,
        m: 2,
        M: 2,
        S: 2,
        U: 2,
        W: 2
    };
    // default to '0'
    var padChars = {
        a: ' ',
        A: ' ',
        b: ' ',
        B: ' ',
        c: ' ',
        e: ' ',
        k: ' ',
        l: ' ',
        p: ' ',
        P: ' '
    };
    var formatCodes = {
        a: function (d) { return dayNamesShort[d.getDay()]; },
        A: function (d) { return dayNames[d.getDay()]; },
        b: function (d) { return monthNamesShort[d.getMonth()]; },
        B: function (d) { return monthNames[d.getMonth()]; },
        c: function (d) { return d.toLocaleString(); },
        C: function (d) { return century(d); },
        d: function (d) { return d.getDate(); },
        e: function (d) { return d.getDate(); },
        H: function (d) { return d.getHours(); },
        I: function (d) { return String(d.getHours() % 12 || 12); },
        j: function (d) { return getDayOfYear(d); },
        k: function (d) { return d.getHours(); },
        l: function (d) { return String(d.getHours() % 12 || 12); },
        L: function (d) { return d.getMilliseconds(); },
        m: function (d) { return d.getMonth() + 1; },
        M: function (d) { return d.getMinutes(); },
        N: function (d, opts) {
            var width = Number(opts.width) || 9;
            var str = String(d.getMilliseconds()).substr(0, width);
            return padEnd(str, width, '0');
        },
        p: function (d) { return (d.getHours() < 12 ? 'AM' : 'PM'); },
        P: function (d) { return (d.getHours() < 12 ? 'am' : 'pm'); },
        q: function (d) { return getSuffix(d); },
        s: function (d) { return Math.round(d.valueOf() / 1000); },
        S: function (d) { return d.getSeconds(); },
        u: function (d) { return d.getDay() || 7; },
        U: function (d) { return getWeekOfYear(d, 0); },
        w: function (d) { return d.getDay(); },
        W: function (d) { return getWeekOfYear(d, 1); },
        x: function (d) { return d.toLocaleDateString(); },
        X: function (d) { return d.toLocaleTimeString(); },
        y: function (d) { return d.getFullYear().toString().substring(2, 4); },
        Y: function (d) { return d.getFullYear(); },
        z: function (d, opts) {
            var offset = d.getTimezoneOffset();
            var nOffset = Math.abs(offset);
            var h = Math.floor(nOffset / 60);
            var m = nOffset % 60;
            return (offset > 0 ? '-' : '+') +
                padStart(h, 2, '0') +
                (opts.flags[':'] ? ':' : '') +
                padStart(m, 2, '0');
        },
        't': function () { return '\t'; },
        'n': function () { return '\n'; },
        '%': function () { return '%'; }
    };
    formatCodes.h = formatCodes.b;
    function strftime (d, formatStr) {
        var output = '';
        var remaining = formatStr;
        var match;
        while ((match = rFormat.exec(remaining))) {
            output += remaining.slice(0, match.index);
            remaining = remaining.slice(match.index + match[0].length);
            output += format(d, match);
        }
        return output + remaining;
    }
    function format(d, match) {
        var e_1, _a;
        var _b = __read(match, 5), input = _b[0], _c = _b[1], flagStr = _c === void 0 ? '' : _c, width = _b[2], modifier = _b[3], conversion = _b[4];
        var convert = formatCodes[conversion];
        if (!convert)
            return input;
        var flags = {};
        try {
            for (var flagStr_1 = __values(flagStr), flagStr_1_1 = flagStr_1.next(); !flagStr_1_1.done; flagStr_1_1 = flagStr_1.next()) {
                var flag = flagStr_1_1.value;
                flags[flag] = true;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (flagStr_1_1 && !flagStr_1_1.done && (_a = flagStr_1.return)) _a.call(flagStr_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var ret = String(convert(d, { flags: flags, width: width, modifier: modifier }));
        var padChar = padChars[conversion] || '0';
        var padWidth = width || padWidths[conversion] || 0;
        if (flags['^'])
            ret = ret.toUpperCase();
        else if (flags['#'])
            ret = changeCase(ret);
        if (flags['_'])
            padChar = ' ';
        else if (flags['0'])
            padChar = '0';
        if (flags['-'])
            padWidth = 0;
        return padStart(ret, padWidth, padChar);
    }

    function date(v, arg) {
        var date = v;
        if (v === 'now' || v === 'today') {
            date = new Date();
        }
        else if (isNumber(v)) {
            date = new Date(v * 1000);
        }
        else if (isString(v)) {
            date = /^\d+$/.test(v) ? new Date(+v * 1000) : new Date(v);
        }
        return isValidDate(date) ? strftime(date, arg) : v;
    }
    function isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }

    function Default(v, arg) {
        if (isArray(v) || isString(v))
            return v.length ? v : arg;
        return isFalsy(toValue(v), this.context) ? arg : v;
    }
    function json(v) {
        return JSON.stringify(v);
    }

    /**
     * String related filters
     *
     * * prefer stringify() to String() since `undefined`, `null` should eval ''
     */
    function append(v, arg) {
        assert(arg !== undefined, function () { return 'append expect 2 arguments'; });
        return stringify(v) + stringify(arg);
    }
    function prepend(v, arg) {
        assert(arg !== undefined, function () { return 'prepend expect 2 arguments'; });
        return stringify(arg) + stringify(v);
    }
    function lstrip(v) {
        return stringify(v).replace(/^\s+/, '');
    }
    function downcase(v) {
        return stringify(v).toLowerCase();
    }
    function upcase(str) {
        return stringify(str).toUpperCase();
    }
    function remove(v, arg) {
        return stringify(v).split(String(arg)).join('');
    }
    function removeFirst(v, l) {
        return stringify(v).replace(String(l), '');
    }
    function rstrip(str) {
        return stringify(str).replace(/\s+$/, '');
    }
    function split(v, arg) {
        return stringify(v).split(String(arg));
    }
    function strip(v) {
        return stringify(v).trim();
    }
    function stripNewlines(v) {
        return stringify(v).replace(/\n/g, '');
    }
    function capitalize(str) {
        str = stringify(str);
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    function replace(v, pattern, replacement) {
        return stringify(v).split(String(pattern)).join(replacement);
    }
    function replaceFirst(v, arg1, arg2) {
        return stringify(v).replace(String(arg1), arg2);
    }
    function truncate(v, l, o) {
        if (l === void 0) { l = 50; }
        if (o === void 0) { o = '...'; }
        v = stringify(v);
        if (v.length <= l)
            return v;
        return v.substr(0, l - o.length) + o;
    }
    function truncatewords(v, l, o) {
        if (l === void 0) { l = 15; }
        if (o === void 0) { o = '...'; }
        var arr = v.split(/\s+/);
        var ret = arr.slice(0, l).join(' ');
        if (arr.length >= l)
            ret += o;
        return ret;
    }



    var builtinFilters = /*#__PURE__*/Object.freeze({
        escape: escape,
        escapeOnce: escapeOnce,
        newlineToBr: newlineToBr,
        stripHtml: stripHtml,
        abs: abs,
        atLeast: atLeast,
        atMost: atMost,
        ceil: ceil,
        dividedBy: dividedBy,
        floor: floor,
        minus: minus,
        modulo: modulo,
        times: times,
        round: round,
        plus: plus,
        sortNatural: sortNatural,
        urlDecode: urlDecode,
        urlEncode: urlEncode,
        join: join,
        last: last$1,
        first: first,
        reverse: reverse,
        sort: sort,
        size: size,
        map: map,
        concat: concat,
        slice: slice,
        where: where,
        uniq: uniq,
        date: date,
        Default: Default,
        json: json,
        append: append,
        prepend: prepend,
        lstrip: lstrip,
        downcase: downcase,
        upcase: upcase,
        remove: remove,
        removeFirst: removeFirst,
        rstrip: rstrip,
        split: split,
        strip: strip,
        stripNewlines: stripNewlines,
        capitalize: capitalize,
        replace: replace,
        replaceFirst: replaceFirst,
        truncate: truncate,
        truncatewords: truncatewords
    });

    var TagMap = /** @class */ (function () {
        function TagMap() {
            this.impls = {};
        }
        TagMap.prototype.get = function (name) {
            var impl = this.impls[name];
            assert(impl, function () { return "tag \"" + name + "\" not found"; });
            return impl;
        };
        TagMap.prototype.set = function (name, impl) {
            this.impls[name] = impl;
        };
        return TagMap;
    }());

    var FilterMap = /** @class */ (function () {
        function FilterMap(strictFilters, liquid) {
            this.strictFilters = strictFilters;
            this.liquid = liquid;
            this.impls = {};
        }
        FilterMap.prototype.get = function (name) {
            var impl = this.impls[name];
            assert(impl || !this.strictFilters, function () { return "undefined filter: " + name; });
            return impl;
        };
        FilterMap.prototype.set = function (name, impl) {
            this.impls[name] = impl;
        };
        FilterMap.prototype.create = function (name, args) {
            return new Filter(name, this.get(name), args, this.liquid);
        };
        return FilterMap;
    }());

    var Liquid = /** @class */ (function () {
        function Liquid(opts) {
            var _this = this;
            if (opts === void 0) { opts = {}; }
            this.options = applyDefault(normalize(opts));
            this.parser = new Parser(this);
            this.renderer = new Render();
            this.fs = opts.fs || fs;
            this.filters = new FilterMap(this.options.strictFilters, this);
            this.tags = new TagMap();
            forOwn(tags, function (conf, name) { return _this.registerTag(snakeCase(name), conf); });
            forOwn(builtinFilters, function (handler, name) { return _this.registerFilter(snakeCase(name), handler); });
        }
        Liquid.prototype.parse = function (html, filepath) {
            var tokenizer = new Tokenizer(html, filepath);
            var tokens = tokenizer.readTopLevelTokens(this.options);
            return this.parser.parse(tokens);
        };
        Liquid.prototype._render = function (tpl, scope, opts, sync) {
            var options = __assign({}, this.options, normalize(opts));
            var ctx = new Context(scope, options, sync);
            var emitter = new Emitter(options.keepOutputType);
            return this.renderer.renderTemplates(tpl, ctx, emitter);
        };
        Liquid.prototype.render = function (tpl, scope, opts) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, toPromise(this._render(tpl, scope, opts, false))];
                });
            });
        };
        Liquid.prototype.renderSync = function (tpl, scope, opts) {
            return toValue$1(this._render(tpl, scope, opts, true));
        };
        Liquid.prototype._parseAndRender = function (html, scope, opts, sync) {
            var tpl = this.parse(html);
            return this._render(tpl, scope, opts, sync);
        };
        Liquid.prototype.parseAndRender = function (html, scope, opts) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, toPromise(this._parseAndRender(html, scope, opts, false))];
                });
            });
        };
        Liquid.prototype.parseAndRenderSync = function (html, scope, opts) {
            return toValue$1(this._parseAndRender(html, scope, opts, true));
        };
        Liquid.prototype._parseFile = function (file, opts, sync) {
            var options, paths, filepath, paths_1, paths_1_1, filepath, cache, tpls, _a, tpl, _b, _c, e_1_1;
            var e_1, _d;
            var _this = this;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        options = __assign({}, this.options, normalize(opts));
                        paths = options.root.map(function (root) { return _this.fs.resolve(root, file, options.extname); });
                        if (this.fs.fallback !== undefined) {
                            filepath = this.fs.fallback(file);
                            if (filepath !== undefined)
                                paths.push(filepath);
                        }
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 13, 14, 15]);
                        paths_1 = __values(paths), paths_1_1 = paths_1.next();
                        _e.label = 2;
                    case 2:
                        if (!!paths_1_1.done) return [3 /*break*/, 12];
                        filepath = paths_1_1.value;
                        cache = options.cache;
                        if (!cache) return [3 /*break*/, 4];
                        return [4 /*yield*/, cache.read(filepath)];
                    case 3:
                        tpls = _e.sent();
                        if (tpls)
                            return [2 /*return*/, tpls];
                        _e.label = 4;
                    case 4:
                        if (!sync) return [3 /*break*/, 5];
                        _a = this.fs.existsSync(filepath);
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, this.fs.exists(filepath)];
                    case 6:
                        _a = _e.sent();
                        _e.label = 7;
                    case 7:
                        if (!(_a))
                            return [3 /*break*/, 11];
                        _b = this.parse;
                        if (!sync) return [3 /*break*/, 8];
                        _c = this.fs.readFileSync(filepath);
                        return [3 /*break*/, 10];
                    case 8: return [4 /*yield*/, this.fs.readFile(filepath)];
                    case 9:
                        _c = _e.sent();
                        _e.label = 10;
                    case 10:
                        tpl = _b.apply(this, [_c, filepath]);
                        if (cache)
                            cache.write(filepath, tpl);
                        return [2 /*return*/, tpl];
                    case 11:
                        paths_1_1 = paths_1.next();
                        return [3 /*break*/, 2];
                    case 12: return [3 /*break*/, 15];
                    case 13:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 15];
                    case 14:
                        try {
                            if (paths_1_1 && !paths_1_1.done && (_d = paths_1.return)) _d.call(paths_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 15: throw this.lookupError(file, options.root);
                }
            });
        };
        Liquid.prototype.parseFile = function (file, opts) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, toPromise(this._parseFile(file, opts, false))];
                });
            });
        };
        Liquid.prototype.parseFileSync = function (file, opts) {
            return toValue$1(this._parseFile(file, opts, true));
        };
        Liquid.prototype.renderFile = function (file, ctx, opts) {
            return __awaiter(this, void 0, void 0, function () {
                var templates;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.parseFile(file, opts)];
                        case 1:
                            templates = _a.sent();
                            return [2 /*return*/, this.render(templates, ctx, opts)];
                    }
                });
            });
        };
        Liquid.prototype.renderFileSync = function (file, ctx, opts) {
            var options = normalize(opts);
            var templates = this.parseFileSync(file, options);
            return this.renderSync(templates, ctx, opts);
        };
        Liquid.prototype._evalValue = function (str, ctx) {
            var value = new Value(str, this.filters, this);
            return value.value(ctx);
        };
        Liquid.prototype.evalValue = function (str, ctx) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, toPromise(this._evalValue(str, ctx))];
                });
            });
        };
        Liquid.prototype.evalValueSync = function (str, ctx) {
            return toValue$1(this._evalValue(str, ctx));
        };
        Liquid.prototype.registerFilter = function (name, filter) {
            this.filters.set(name, filter);
        };
        Liquid.prototype.registerTag = function (name, tag) {
            this.tags.set(name, tag);
        };
        Liquid.prototype.plugin = function (plugin) {
            return plugin.call(this, Liquid);
        };
        Liquid.prototype.express = function () {
            var self = this; // eslint-disable-line
            return function (filePath, ctx, callback) {
                var opts = { root: __spread(normalizeStringArray(this.root), self.options.root) };
                self.renderFile(filePath, ctx, opts).then(function (html) { return callback(null, html); }, callback);
            };
        };
        Liquid.prototype.lookupError = function (file, roots) {
            var err = new Error('ENOENT');
            err.message = "ENOENT: Failed to lookup \"" + file + "\" in \"" + roots + "\"";
            err.code = 'ENOENT';
            return err;
        };
        /**
         * @deprecated use parseFile instead
         */
        Liquid.prototype.getTemplate = function (file, opts) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.parseFile(file, opts)];
                });
            });
        };
        /**
         * @deprecated use parseFileSync instead
         */
        Liquid.prototype.getTemplateSync = function (file, opts) {
            return this.parseFileSync(file, opts);
        };
        return Liquid;
    }());

    exports.AssertionError = AssertionError;
    exports.Context = Context;
    exports.Drop = Drop;
    exports.Emitter = Emitter;
    exports.Expression = Expression;
    exports.Hash = Hash;
    exports.Liquid = Liquid;
    exports.ParseError = ParseError;
    exports.ParseStream = ParseStream;
    exports.TagToken = TagToken;
    exports.Token = Token;
    exports.TokenizationError = TokenizationError;
    exports.Tokenizer = Tokenizer;
    exports.TypeGuards = typeGuards;
    exports.assert = assert;
    exports.evalQuotedToken = evalQuotedToken;
    exports.evalToken = evalToken;
    exports.isFalsy = isFalsy;
    exports.isTruthy = isTruthy;
    exports.toPromise = toPromise;
    exports.toThenable = toThenable;
    exports.toValue = toValue$1;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=liquid.browser.umd.js.map
