var M = require('../history');

/**
 * Route 的实例构造函数
 */
function RouteIns(route, path, query, args, options) {
	this.route = route;
	this.path = path;
	this.query = query;
	this.options = options;
	this.params = {};
	this.args = null;
	this.element = null;
	this.cached = false;
	this._oldTemplate = '';
	this.destroyed = false;
	this.setArgs(args);
	var id = M.getUIDByKey(this.path);
	if (this.options && this.options.parentUID) {
		id = this.options.parentUID + '-' + M.getShortId(id);
	}
	this.id = id;
}

M.extend(RouteIns.prototype, {

	setArgs: function(args) {
		if (this.route.keys.length) {
			_parseArgs(args, this.route.keys, this);
			matchArgs(this); // 得到正确的参数
		} else {
			this.args = [];
		}
	},

	setOptions: function(options) {
		if (this.destroyed) return;
		this.options = options;
	},

	setEle: function(ele) {
		this.element = ele;
	},

	equalTo: function(url, update) {
		var parsed = M.history.parseUrl(url);
		if (parsed && this.route.checkEqual(this, parsed.path, parsed.query)) {
			update && (this.query = parsed.query);
			return true;
		}
		return false;
	},

	isParentOf: function(path) {
		var reg = this.route.$regexp;
		if (reg) {
			var ret = path.match(reg);
			if (ret && ret[0] === this.path) {
				return true;
			}
		}
		return false;
	},

	destroy: function() {
		if (this.destroyed) return;
		this.route = null;
		this.path = '';
		this.query = null;
		this.options = null;
		this.params = null;
		this.args = null;
		if (this.element) {
			M.removeEle(this.element);
		}
		this.element = null;
		this.destroyed = true;
	}

});

module.exports = RouteIns;

/**
 * 解析match到的参数
 * @param  {Array} match    匹配结果
 * @param  {Object} stateObj route state对象
 */
function _parseArgs(match, keys, routeIns) {
	for (var j = 0, jn = keys.length; j < jn; j++) {
		var key = keys[j];
		var value = match[j] || '';
		if (typeof key.decode === 'function') {
			var val = key.decode(value);
		} else {
			try {
				val = JSON.parse(value);
			} catch (e) {
				val = value;
			}
		}
		match[j] = routeIns.params[key.name] = val;
	}

	routeIns.args = match;
}

function matchArgs(routeIns) {
	var match = routeIns.args;
	if (!match) {
		routeIns.args = [];
		return;
	}
	if (routeIns.route.keys.length) {
		var pl = routeIns.route.parentArgsLen;
		match.splice(0, pl);
	} else {
		match.length = 0;
	}
}
