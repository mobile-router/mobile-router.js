;(function(win, factory) {
	if (typeof define === 'function' && (define.amd || define.cmd)) {
		define('m', function(exports) {
			return factory(win, exports);
		});
	} else {
		win.M = factory(win, {});
	}
})(this, function(win, M) {

	// 可中断的遍历循环
	var each = function(ary, func, context) {
		if (!context) context = null;
		for (var i = 0, len = ary.length; i < len; i++) {
			if (false === func.call(context, ary[i], i, ary)) {
				break;
			}
		}
	};

	// 去掉URL中的hash部分
	var trimUrl = function(url) {
		url += '';
		return url.replace(/#.*/, '');
	};

	var location = win.location;
	var document = win.document;
	var body = document.body;

	var a = document.createElement('a');
	// 解析url
	var parseUrl = function(href) {
		a.href = href;
		return parseLocation(a);
	};
	// 得到完整url 不带hash
	var getFullUrl = function(href) {
		a.href = href;
		return trimUrl(a.href);
	};
	var getHash = function(loc) {
		if (!loc) loc = location;
		var hash = loc.hash;
		if (hash.charAt(0) === '#') hash = hash.substr(1);
		return hash;
	};
	// 解析location或者a信息
	var parseLocation = function(loc) {
		if (!loc) loc = location;
		var url = loc.href;
		var hash = getHash(loc);
		var rurl = trimUrl(url);
		if (!hash) url = rurl;
		return {
			url: url, // 完整 href
			rurl: rurl, // 去除hash的 href
			host: loc.host, // host
			hash: hash, // hash 不带#
			protocol: loc.protocol, // 协议
			origin: loc.origin || (loc.protocol + '//' + loc.host), // origin
			pathname: loc.pathname, // path
			search: loc.search, // search
			port: loc.port // 端口
		};
	};

	// 根据target得到有href以及带有href的target
	var getHrefAndTarget = function(target) {
		var href = '';
		do {
			if (target !== body && target.nodeType === 1 && (
				(href = target.getAttribute('data-href')) || (
				 href = target.href)
			)) {
				break;
			}
		} while (target = target.parentElement)
		return {
			href: href || '',
			target: target
		};
	};
	// 将-转驼峰
	var camelize = function(target) {
		//转换为驼峰风格
		if (target.indexOf('-') < 0) {
			return target; //提前判断，提高getStyle等的效率
		}
		return target.replace(/-[^-]/g, function(match) {
			return match.charAt(1).toUpperCase();
		});
	};
	// 得到dataset对象
	var getDatesetObj = function(ele) {
		var ret = {};
		if (ele.dataset) {
			for (var k in ele.dataset) {
				ret[k] = ele.dataset[k];
			}
		} else {
			var attrs = ele.attributes;
			var dataName;
			var rDataName = /^data-(.+)$/i;
			var r;
			for (var i = 0, len = attrs.length; i < len; i++) {
				dataName = attrs[i].name || attrs[i].nodeName;
				if (r = dataName.match(rDataName)) {
					ret[camelize(r[1])] = attrs[i].value || attrs[i].nodeValue;
				}
			}
		}
		return ret;
	};

	// fx https://github.com/RubyLouvre/avalon/blob/master/avalon.js

	var oproto = Object.prototype;
	var ohasOwn = oproto.hasOwnProperty;
	var serialize = oproto.toString;

	var isFunction = function(fn) {
		// 或许也可以通过 Function.prototype.isPrototypeOf(fn) 判断
		return serialize.call(fn) == '[object Function]';
	}

	var isPlainObject = function(obj) {
		return serialize.call(obj) === '[object Object]' && Object.getPrototypeOf(obj) === oproto;
	}

	var extend = M.extend = function() {
		var options, name, src, copy, copyIsArray, clone,
				target = arguments[0] || {},
				i = 1,
				length = arguments.length,
				force = false;

		// 如果第一个参数为布尔,判定是否深拷贝
		if (typeof target === 'boolean') {
			force = target;
			target = arguments[1] || {};
			i++;
		}

		//确保接受方为一个复杂的数据类型
		if (typeof target !== 'object' && !isFunction(target)) {
			target = {};
		}

		//如果只有一个参数，那么新成员添加于 extend 所在的对象上
		if (i === length) {
			target = this;
			i--;
		}

		for (; i < length; i++) {
			//只处理非空参数
			if ((options = arguments[i]) != null) {
				for (name in options) {
					src = target[name];
					copy = options[name];

					// 防止环引用
					if (target === copy) {
						continue;
					}
					if (force && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {

						if (copyIsArray) {
							copyIsArray = false;
							clone = src && Array.isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						target[name] = extend(force, clone, copy);
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}
		return target;
	};
	M.nextTick = new function() {
		var tickImmediate = win.setImmediate;
		var tickObserver = win.MutationObserver;
		if (tickImmediate) { //IE10 \11 edage
			return tickImmediate.bind(win);
		}
		var queue = []
		function callback() {
			var n = queue.length;
			for (var i = 0; i < n; i++) {
				queue[i]();
			}
			queue = queue.slice(n);
		}
		if (tickObserver) { // 支持MutationObserver
			var node = document.createTextNode('M');
			new tickObserver(callback).observe(node, {characterData: true});
			return function(fn) {
				queue.push(fn);
				node.data = Math.random();
			};
		}
		return function(fn) {
			setTimeout(fn);
		};
	};

	// 简单事件
	var Base = {

		_eventData: null,

		on: function(name, func) {
			if (!this._eventData) this._eventData = {};
			if (!this._eventData[name]) this._eventData[name] = [];
			var listened = false;
			each(this._eventData[name], function(fuc) {
				if (fuc === func) {
					listened = true;
					return false;
				}
			});
			if (!listened) {
				this._eventData[name].push(func);
			}
		},

		off: function(name, func) {
			if (!this._eventData) this._eventData = {};
			if (!this._eventData[name] || !this._eventData[name].length) return;
			if (func) {
				each(this._eventData[name], function(fuc, i) {
					if (fuc === func) {
						this._eventData[name].splice(i, 1);
						return false;
					}
				});
			} else {
				this._eventData[name] = [];
			}
		},

		trigger: function(name) {
			if (!this._eventData) this._eventData = {};
			if (!this._eventData[name]) return;
			var args = this._eventData[name].slice.call(arguments, 1);
			each(this._eventData[name], function(fuc) {
				fuc.apply(null, args);
			});
		}

	};

	// 空函数
	var noop = function() {};

	var UIDPREV = 'm-' + new Date().getTime() + '-';
	var startUID = 1;
	var UIDCache = {};
	// 根据key得到唯一id
	var getUIDByKey = function(key) {
		var r = '';
		if (!key || !(r = UIDCache[key])) {
			r = UIDPREV + startUID++;
			if (key) UIDCache[key] = r;
		}
		return r;
	};

	// , 空格替换正则
	var rword = /[^, ]+/g;

	var ClassListMethods = {
		_toString: function() {
			var node = this.node;
			var cls = node.className;
			var str = typeof cls === 'string' ? cls : cls.baseVal;
			return str.split(/\s+/).join(' ');
		},
		_contains: function(cls) {
			return (' ' + this + ' ').indexOf(' ' + cls + ' ') > -1;
		},
		_add: function(cls) {
			if (!this.contains(cls)) {
				this._set(this + ' ' + cls);
			}
		},
		_remove: function(cls) {
			this._set((' ' + this + ' ').replace(' ' + cls + ' ', ' '));
		},
		__set: function(cls) {
			cls = cls.trim()
			var node = this.node
			if (rsvg.test(node)) {
				//SVG元素的className是一个对象 SVGAnimatedString { baseVal="", animVal=""}，只能通过set/getAttribute操作
				node.setAttribute("class", cls)
			} else {
				node.className = cls
			}
		}
	}

	function ClassList(node) {
		if (!('classList' in node)) {
			node.classList = {
				node: node
			};
			for (var k in ClassListMethods) {
				node.classList[k.slice(1)] = ClassListMethods[k];
			}
		}
		return node.classList;
	}

	'add,remove'.replace(rword, function(method) {
		M[method + 'Class'] = function(el, cls) {
			//https://developer.mozilla.org/zh-CN/docs/Mozilla/Firefox/Releases/26
			if (cls && typeof cls === 'string' && el && el.nodeType === 1) {
				cls.replace(/\S+/g, function(c) {
					ClassList(el)[method](c);
				});
			}
			return this;
		}
	});

	// innerHTML部分
	if (typeof $ !== 'undefined' && isFunction($.prototype.html)) {
		M.innerHTML = function(ele, html) {
			$(ele).html(html);
		};
	} else {
		M.innerHTML = function(ele, html) {
			ele.innerHTML = html;
		};
	}

	// 暴露到M上
	M.extend({
		rword: rword,
		noop: noop,
		each: each,
		trimUrl: trimUrl,
		parseUrl: parseUrl,
		getHash: getHash,
		getFullUrl: getFullUrl,
		getHrefAndTarget: getHrefAndTarget,
		camelize: camelize,
		getDatesetObj: getDatesetObj,
		isFunction: isFunction,
		isArray: function(ary) {
			return Array.isArray(ary);
		},
		isString: function(str) {
			return typeof str === 'string';
		},
		isUndefined: function(a) {
			return typeof a === 'undefined';
		},
		isDefined: function(a) {
			return typeof a !== 'undefined';
		},
		isPlainObject: isPlainObject,
		parseLocation: parseLocation,
		getUIDByKey: getUIDByKey,
		hasClass: function(el, cls) {
			return el.nodeType === 1 && ClassList(el).contains(cls);
		},

		location: location,
		document: document,
		body: body,
		html: document.documentElement,

		Base: Base,
		extendByBase: function(obj) {
			return extend(obj, Base);
		},

		Array: {
			/*只有当前数组不存在此元素时才添加它*/
			ensure: function(target, item) {
				if (target.indexOf(item) === -1) {
					return target.push(item);
				}
			},
			/*得到在target数组中具有相同key的值的位置*/
			indexOfByKey: function(target, item, key) {
				var val = item[key];
				for (var i = 0, len = target.length; i < len; i++) {
					if (target[i][key] === val) {
						return i;
					}
				}
				return -1;
			}
		}
	});

	return M;
});
