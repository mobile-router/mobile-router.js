var M = require('../m');
var types = require('./types');
var RouteIns = require('./RouteIns');

// clone fx https://github.com/RubyLouvre/mmRouter/blob/master/mmRouter.js
// url模式参数匹配
var placeholder = /([:*])(\w+)|\{(\w+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g;

function Route(path, callback, opts) {
	opts = opts || {};
	opts.callback = callback || M.noop;
	if (path.length > 2 && path.charAt(path.length - 1) === '/') {
		path = path.slice(0, -1);
		opts.last = '/';
	}
	opts = _pathToRegExp(path, opts);
	delete opts.path;
	delete opts.last;

	this.routeView = null;
	this.instances = [];
	this.path = path;
	this.activeIndex = -1;

	// parse opts
	M.each([
		'cacheTemplate', 'animation', 'aniClass', 'redirectTo', 'redirectPushState',
		'callback', 'getTemplate', 'onActive', 'onDestroy', 'onEnter', 'onLeave',
		'regexp', '$regexp', 'keys', 'parentArgsLen'
	], function(k) {
		this[k] = opts[k];
		delete opts[k];
	}, this);

	var redirectTo = this.redirectTo;
	if (M.isString(redirectTo)) {
		redirectTo = this.redirectTo = function() {
			return redirectTo;
		};
	}
	if (redirectTo && M.isUndefined(this.redirectPushState)) {
		this.redirectPushState = true;
	}
	if (!this.parentArgsLen) this.parentArgsLen = 0;

	this.options = opts;
}

M.extend(Route.prototype, {

	/**
	 * 创建返回新的实例（如果能找到就不用创建新的）
	 * @param  {String}   path    新的path
	 * @param  {Object}   query   query信息
	 * @param  {Array}    args    args匹配参数
	 * @param  {Object}   options 额外信息
	 * @return {RouteIns}         得到的RouteIns实例
	 */
	ins: function(path, query, args, options) {
		var that = this;
		var ins = null;
		M.each(that.instances, function(_ins, index) {
			if (that.checkEqual(_ins, path, query)) {
				ins = _ins;
				that.setActive(index);
				ins.setOptions(options);
				ins.setArgs(args);
				return false;
			}
		});
		if (ins) return ins;
		ins = new RouteIns(this, path, query, args, options);
		this.instances.push(ins);
		this.setActive(this.instances.length - 1);
		return ins;
	},

	checkEqual: function(ins, path, query) {
		return ins.path === path;
	},

	getIns: function(index) {
		return this.instances[index];
	},

	getActive: function() {
		return this.getIns(this.activeIndex);
	},

	setActive: function(index) {
		this.activeIndex = index;
	},

	setRouteView: function(routeView) {
		this.routeView = routeView;
	},

	ele: function() {
		var ins = this.getActive() || null;
		return ins && ins.element;
	},

	destroyIns: function(ins) {
		if (!ins) return;
		var preIns, nextIns;
		if (this.getActive() === ins) {
			this.instances.splice(this.activeIndex, 1);
			this.setActive(-1);
			ins.destroy();
			return;
		}
		M.each(this.instances, function(_ins, i) {
			if (_ins === ins) {
				this.instances.splice(i ,1);
				if (this.activeIndex > i) {
					this.setActive(this.activeIndex - 1);
				}
				ins.destroy();
				return false;
			}
		}, this);
	}

});

module.exports = Route;

/**
 * 将用户定义的路由规则转成正则表达式
 * 用于做匹配
 * @param  {String} pattern 用户定义的路由规则
 * @param  {Object} opts    opt配置对象
 * @return {Object}         opt配置后（增加了regexp）对象
 */
function _pathToRegExp(pattern, opts) {
	var keys = opts.keys = [],
			sensitive = typeof opts.caseInsensitive === 'boolean' ? opts.caseInsensitive : true,
			compiled = '^', last = 0, m, name, regexp, segment;

	while ((m = placeholder.exec(pattern))) {
		name = m[2] || m[3];
		regexp = m[4] || (m[1] == '*' ? '.*' : 'string');
		segment = pattern.substring(last, m.index);
		// 类型检测
		var type = types[regexp];
		var key = {
			name: name
		};
		if (type) {
			regexp = type.pattern;
			key.decode = type.decode;
		}
		keys.push(key);
		compiled += quoteRegExp(segment, regexp, false);
		last = placeholder.lastIndex;
	}
	segment = pattern.substring(last);
	compiled += quoteRegExp(segment);
	if (opts.children) {
		// 增加不带end $ 的正则
		opts.$regexp = new RegExp(compiled, sensitive ? 'i' : undefined);
	}
	compiled += (opts.strict ? opts.last : '\/?') + '$';
	opts.regexp = new RegExp(compiled, sensitive ? 'i' : undefined);
	return opts;
}

function quoteRegExp(string, pattern, isOptional) {
	var result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, '\\$&');
	if (!pattern) return result;
	var flag = isOptional ? '?' : '';
	return result + flag + '(' + pattern + ')' + flag;
}
