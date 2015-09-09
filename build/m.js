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

;(function(win, factory) {
	if (typeof define === 'function' && (define.amd || define.cmd)) {
		define('m.history', function(require) {
			var M = require('m');
			M.history = factory(win, M);
			return M;
		});
	} else {
		M.history = factory(win, win.M);
	}
})(this, function(win, M) {

	// 状态缓存
	var stateCache = {};
	// url缓存
	var urlCache = [];

	// 得到basepath
	var parseBasePath = function(path) {
		return ('/' + path + '/').replace(/^\/+|\/+$/g, '/');
	};
	// 默认base path
	var defBase = M.document.getElementsByTagName('base');
	if (defBase && defBase.length) {
		defBase = parseBasePath(defBase[0].getAttribute('href'));
	} else {
		defBase = '/';
	}

	var locationOrigin = M.parseLocation().origin;

	var history = win.history;
	var agent = (win.navigator || {}).userAgent;
	if (!agent) agent = '';
	var android = parseInt((/android (\d+)/.exec(agent.toLowerCase()) || [])[1], 10);
	if (isNaN(android)) android = undefined;
	var boxee = /Boxee/i.test(agent);

	var support = !!(history && history.pushState && history.replaceState && !(android < 4) && !boxee);

	var History = {

		/*是否支持*/
		support: support,

		/*是否已启动*/
		_startd: false,

		/*在urlCache中位置*/
		index: -1,

		/*base path*/
		base: defBase,

		/**
		 * 启动
		 * @param  {Object} options 配置参数
		 */
		start: function(options) {
			if (this._startd) return;
			if (!options) options = {};
			var base = options.base;
			if (M.isDefined(base) && M.isString(base)) {
				this.base = parseBasePath(base);
			}
			this._startd = true;

			this.options = M.extend({
				enablePushState: true
			}, options);

			if (support) {
				// 监听改变
				this.options.enablePushState &&
				win.addEventListener('popstate', this.onChange);

				// 阻止 a
				M.document.addEventListener('click', this.onDocClick);
			}

			// 需要初始化一次当前的state
			this.onChange({
				type: 'popstate',
				state: History.getUrlState(M.location.href)
			});
			this.trigger('inited');
		},

		/**
		 * 停止监听
		 */
		stop: function() {
			if (support) {
				this.options.enablePushState &&
				win.removeEventListener('popstate', this.onChange);
				M.document.removeEventListener('click', this.onDocClick);
			}
			this._startd = false;
			this.index = -1;
			stateCache = {};
			urlCache = [];
		},

		/**
		 * 去掉url中base之后的path
		 * @param  {String} url url
		 * @return {String}     去掉base之后的URL
		 */
		getPath: function(url) {
			var urlDetail = M.parseUrl(url);
			var path = decodeURIComponent(urlDetail.pathname + urlDetail.search);
			// 去掉最后/
			var root = this.base.slice(0, -1);
			if (!path.indexOf(root)) path = path.slice(root.length);
			return path.slice(1);
		},

		/**
		 * document点击的事件处理函数
		 * @param  {Event}   e 事件对象
		 * @return {Boolean}   是否被阻止了
		 */
		onDocClick: function(e) {
			if (e.which > 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
				return true;
			}
			
			var targetEle = e.target;
			var hrefTarget = M.getHrefAndTarget(targetEle);
			targetEle = hrefTarget.target;
			var href = hrefTarget.href;
			// 存在 href 且和当前是同源
			// 且不带 target 且不是以 javascript: 开头
			if (History.checkUrl(href) && !targetEle.target) {
				var datasetObj =  M.getDatesetObj(targetEle);
				var state = History.createStateObject(href, datasetObj);
				e.preventDefault();
				History.pushState(state, true);
				return false;
			}
		},

		/**
		 * 检测url是否可以走自定义pushState
		 * @param  {String}  url       url
		 * @param  {String}  urlOrigin 检测url的origin
		 * @return {Boolean}           检测结果
		 */
		checkUrl: function(url, urlOrigin) {
			if (!urlOrigin) {
				urlOrigin = M.parseUrl(url).origin;
			}
			var rjavascript = /^javascript:/;
			return url && locationOrigin === urlOrigin && !rjavascript.test(url);
		},

		/**
		 * 添加新的url
		 * @param  {String}      url  新的url
		 * @param  {Object|Null} data 附加数据
		 */
		push: function(url, data) {
			var state = this.createStateObject(url, data);
			this.pushState(state);
		},

		/**
		 * 添加新的state
		 * @param  {Object}  state   state数据对象
		 * @param  {Boolean} checked 是否已经校验过该state
		 */
		pushState: function(state, checked) {
			if (!checked && !this.checkUrl(state.url, state.origin)) return;
			if (state.url === History.getCurrentState().url) return;
			// 如果是允许pushstate 且其dataset中不包含href的话才会改变history
			// 规则就是：
			// data-href="newUrl"会被认为是在当前页中切换，也就是局部禁用pushstate 
			if (this.options.enablePushState && M.isUndefined(state.data.href) && state.url !== M.location.href) {
				history[state.replace == 'true' ? 'replaceState' : 'pushState'](state, state.title, state.url);
			}
			this.onChange({
				state: state
			});
		},

		/**
		 * history改变回调
		 * @param  {Event|Object|Undefined} e 事件对象或者包含state对象
		 */
		onChange: function(e) {
			var state = e && e.state || History.getUrlState(M.location.href);
			var oldState = History.getCurrentState();

			// 如果新的url和旧的url只是hash不同，那么应该走scrollIntoView
			var scrollToEle;
			if (oldState && state.rurl === oldState.rurl) {
				if (e.type !== 'popstate' && state.hash) {
					scrollToEle = M.document.getElementById(state.hash);
					scrollToEle && scrollToEle.scrollIntoView();
				}
				return;
			}

			var newIndex = History.storeState(state);
			var type = '';
			if (newIndex > History.index) {
				// 可以认为是往前 不管是新的 还是已经存在的
				type = 'forward';
			} else if (newIndex < History.index) {
				// 后退
				type = 'back';
			} else {
				e.preventDefault();
				return false;
			}

			// 对于 有data-rel 是back的 调整其顺序
			// 一般的场景就是 类似 返回按钮
			if (type !== 'back' && state.data.rel === 'back') {
				type = 'back';
			} else if (type === 'back' && state.data.rel !== 'back' && oldState.data.rel === 'back') {
				type = 'forward';
			}
			M.document.title = state.title;
			History.index = newIndex;
			// 触发改变事件
			History.trigger(type, state, oldState);
			History.trigger('change', type, state, oldState);
		},

		/**
		 * 得到url的state 如果不存在则创建新的
		 * @param  {String} url url
		 * @return {Object}     包装的state对象
		 */
		getUrlState: function(url) {
			url = M.getFullUrl(url);
			return stateCache[url] || this.createStateObject(url);
		},

		/**
		 * 得到当前的state
		 * @return {Object|Null} 当前的state
		 */
		getCurrentState: function() {
			var url = urlCache[this.index];
			if (!url) return null;
			return stateCache[url] || null;
		},

		/**
		 * 得到上一个状态
		 * @return {Object|Null} 当前的state
		 */
		getPrevState: function() {
			var url = urlCache[this.index - 1];
			if (!url) return null;
			return stateCache[url] || null;
		},

		/**
		 * 创建包装state对象
		 * @param  {String} url   url
		 * @param  {object} data  附带数据
		 * @param  {String} title title
		 * @return {Object}       包装的state对象
		 */
		createStateObject: function(url, data, title) {
			if (url) {
				if (url.charAt(0) === '/') {
					url = url.slice(1);
					url = this.base + url;
				}
			} else {
				url = M.location.href;
			}
			var parsedUrl = M.parseUrl(url);
			return {
				data: data || (data = {}),
				title: title || data.title || M.document.title,
				rurl: parsedUrl.rurl,
				url: parsedUrl.url,
				origin: parsedUrl.origin,
				hash: parsedUrl.hash
			};
		},

		/**
		 * url是否在缓存中
		 * @param  {String}  url url
		 * @return {Boolean}     是否在缓存中
		 */
		hasUrl: function(url) {
			return !!stateCache[url];
		},

		/**
		 * 存储state
		 * @param  {Object} state 包装state对象
		 * @return {Number}       在urlCache中位置
		 */
		storeState: function(state) {
			var i = -1;
			var url = state.rurl;
			if (this.hasUrl(url)) {
				// 已存在
				i = urlCache.indexOf(url);
			} else {
				i = this.index + 1;
				urlCache.splice(i, 0, url);
			}
			stateCache[url] = M.extend(true, stateCache[url], state);
			this.clearCache(i);
			return i;
		},

		/**
		 * 清除指定位置之后的cache
		 * @param  {Number} index 指定位置
		 */
		clearCache: function(index) {
			if (M.isUndefined(index)) index = -1;
			var num = index + 5;
			var clearUrls = urlCache.slice(num);
			clearUrls.forEach(function(url) {
				delete stateCache[url];
			});
			if (urlCache.length > num) urlCache.length = num;
		},

		/**
		 * 得到缓存信息
		 * @return {Object} 缓存
		 */
		getCache: function() {
			return {
				urlCache: urlCache,
				stateCache: stateCache
			};
		}

	};

	// 增加事件机制
	M.extendByBase(History);

	return History;
});
;(function(win, factory) {
	if (typeof define === 'function' && (define.amd || define.cmd)) {
		define('m.router', function(require) {
			var M = require('m.history');
			M.router = factory(win, M, M.history);
			return M;
		});
	} else {
		M.router = factory(win, M, M.history);
	}
})(this, function(win, M, history) {

	// clone fx https://github.com/RubyLouvre/mmRouter/blob/master/mmRouter.js
	// url模式参数匹配
	var placeholder = /([:*])(\w+)|\{(\w+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g;
	// 是否已初始化
	var inited = false;
	var defViewClass = 'page-view';
	var ENTERCLASS = 'in';
	// 默认配置
	var defOptions = {
		cacheTemplate: true, /*是否缓存模板*/
		viewsSelector: '', /*views容器选择器*/
		viewClass: '', /*view的class 默认都会有 page-view 的 class */
		animation: true, /*是否有动画*/
		aniClass: 'slide', /*类型*/
		maskClass: 'mask', /*蒙层class*/
		showLoading: true, /*显示loading*/
		cacheViewsNum: 3 /*缓存view数*/
	};
	var defOptionsKeys = Object.keys(defOptions);

	// 蒙层元素
	var maskEle = M.document.createElement('div');

	// 动画结束事件名
	var aniEndName = (function() {
		var eleStyle = maskEle.style;
		var verdors = ['a', 'webkitA', 'MozA', 'OA', 'msA'];
		var endEvents = ['animationend', 'webkitAnimationEnd', 'animationend', 'oAnimationEnd', 'MSAnimationEnd'];
		var animation;
		for (var i = 0, len = verdors.length; i < len; i++) {
			animation = verdors[i] + 'nimation';
			if (animation in eleStyle) {
				return endEvents[i];
			}
		}
		return 'animationend';
	}());

	function RouteView(parentRoute, parentRouterView, options) {
		if (parentRoute) {
			parentRoute.setRouteView(this);
			this.$parentRoute = parentRoute;
		} else {
			this.$parentRoute = null;
		}
		if (parentRouterView) this.$parent = parentRouterView;

		this.routes = [];
		this.maskEle = null;
		/*当前pageview状态对象*/
		this.pageViewState = null;
		this.viewsContainer = null;
		this.options = options;
		this.pagesCache = [];
		this.templateCache = {};

		// view的cache数量不能少于1
		if (this.options.cacheViewsNum < 1) {
			this.options.cacheViewsNum = 1;
		}
		if (!parentRoute) {
			this.setViewsContainer(M.document.body);
		}
	}
	M.extend(RouteView.prototype, {

		route: function(path, query, options, realPath, cb) {
			var routes = this.routes;
			if (!options) options = {};
			var ret = false;
			var that = this;
			for (var i = 0, el, _path, routeIns, keys; el = routes[i]; i++) {
				var args = path.match(realPath && el.$regexp || el.regexp);
				if (args) {
					_path = args.shift();
					routeIns = el.ins(_path, query || {}, args, options);
					var p = that, pr, activeIns;
					while (p && (pr = p.$parentRoute)) {
						activeIns = pr.getActive();
						if (!that.viewsContainer || !activeIns || !activeIns.isParentOf(routeIns.path)) {
							// 初始化 但是默认匹配到的是 子路由 需要初始化 父路由
							that.$parent.route(routeIns.path, routeIns.query, M.extend({matchIns: routeIns}, options), path, function() {
								delete that.$parent.pageViewState.options.matchIns;
								if (that.pageViewState && that.pageViewState.path === path) return;
								that._waiting = true;
								that._route(routeIns, cb);
							});
							return true;
						}
						p = p.$parent;
					}
					that._route(routeIns, cb);
					ret = true;
				} else if (!realPath) {
					if (el.routeView) {
						ret = el.routeView.route(path, query, options);
					}
				}
				if (ret) {
					break;
				}
			}
			return ret;
		},

		_redirectTo: function(routeIns, async) {
			var route = routeIns.route;
			var rtUrl;
			if (route.redirectTo && (rtUrl = doCallback(routeIns, 'redirectTo'))) {
				if (!routeIns.equalTo(rtUrl, true)) {
					if (async) M.nextTick(reT);
					else reT();
					return true;
				}
			}
			return false;
			function reT() {
				!routeIns.element && route.destroyIns(routeIns);
				var data = {};
				if (!async) data.redirectToSync = true;
				if (!route.redirectPushState) data.href = rtUrl;
				M.router.navigate(rtUrl, data);
			}
		},

		_getDefaultEle: function(routeIns) {
			var id = M.getUIDByKey(routeIns.path);
			var initView;
			if (routeIns.options.first &&
					(initView = this.viewsContainer.getElementsByClassName(defViewClass)[0]) &&
					(!initView.id || initView.id === id)
				) {
				return initView;
			}
			return null;
		},

		_route: function(routeIns, cb) {
			var route = routeIns.route;
			var that = this;
			// 缓存模板
			var cacheTemplate = this.getOption(route, routeIns.options.state, 'cacheTemplate');
			var id = M.getUIDByKey(routeIns.path);
			var initView = this._getDefaultEle(routeIns);
			if (initView) {
				var pageViews = initView.getElementsByClassName(defViewClass);
				var childViews = [];
				M.each(pageViews, function(pv) {
					if (pv.parentNode == initView) {
						removeEle(pv);
						childViews.push(pv);
					}
				});
				this.templateCache[routeIns.path] = initView.innerHTML;
				cacheTemplate = true;
				M.each(childViews, function(cv) {
					initView.appendChild(cv);
				});
				pageViews = null;
				childViews = null;
			}
			if (M.isString(cacheTemplate)) cacheTemplate = cacheTemplate === 'true';
			// update options.first 
			routeIns.options.first = routeIns.options.first || !this.pageViewState;
			// 这里加上 得到模板
			var args = routeIns.args;
			if (!(cacheTemplate && this.templateCache[routeIns.path]) && route.getTemplate) {
				doCallback(routeIns, 'onActive');
				Router.trigger('routeChangeStart', routeIns, args);
				this.showLoading();
				if (route.getTemplate.length > 0) {
					this._waiting = false;
					// 有参数 则需要回调 主要场景是异步得到模板
					route.getTemplate.call(routeIns, getTemplateCb);
				} else {
					getTemplateCb(route.getTemplate.call(routeIns));
				}
			} else {
				if (!route.getTemplate && !cb && this._redirectTo(routeIns, true)) {
					return;
				}
				doCallback(routeIns, 'onActive');
				Router.trigger('routeChangeStart', routeIns, args);
				getTemplateCb(this.templateCache[routeIns.path]);
			}
			function getTemplateCb(template) {
				that.getTemplateCb(routeIns, template, cb);
			}
		},

		setViewsContainer: function(ele) {
			var viewsContainer;
			var viewsSelector;
			if (ele) {
				viewsSelector = this.options.viewsSelector;
				viewsContainer = viewsSelector && ele.querySelector(viewsSelector);
			}
			this.viewsContainer = viewsContainer || ele || null;
		},

		/**
		 * 显示loading
		 * @param  {Boolean|Undefined} force 是否强制显示loading
		 */
		showLoading: function(force) {
			if (!this.options.showLoading && !force) return;
			if (!this.maskEle) {
				this.initMaskEle();
			}
			this.maskEle.style.visibility = 'visible';
		},

		initMaskEle: function() {
			this.maskEle = maskEle.cloneNode();
			this.maskEle.className = this.options.maskClass;
			this.maskEle.innerHTML = '<i class="' + this.options.maskClass + '-loading"></i>';
			this.viewsContainer.appendChild(this.maskEle);
		},

		/**
		 * 隐藏loading
		 */
		hideLoading: function() {
			if (this.maskEle) {
				this.maskEle.style.visibility = 'hidden';
			}
		},

		/**
		 * 得到option中key的值 优先级：
		 * historyState.data > routeState > routesState
		 * @param  {Object} routeState   路由state对象
		 * @param  {Object} historyState 历史state对象
		 * @param  {String} key          键key
		 * @return {Any}                 对应的键值
		 */
		getOption: function(routeState, historyState, key) {
			if (!routeState && !historyState) return undefined;
			if (!key) return undefined;
			var val;
			if (historyState) {
				val = historyState.data[key];
			}
			if (M.isUndefined(val)) {
				val = routeState[key];
				if (M.isUndefined(val)) {
					val = this.options[key];
				}
			}
			return val;
		},

		/**
		 * 得到模板后callback
		 * @param  {RouteIns} routeIns    RouteIns实例
		 * @param  {String}   template 模板字符串
		 * @param  {Function} cb    完成后回调
		 */
		getTemplateCb: function(routeIns, template, cb) {
			this.hideLoading();
			routeIns._oldTemplate = this.templateCache[routeIns.path];
			this.templateCache[routeIns.path] = template || '';

			var that = this;
			var options = routeIns.options; // 带过来的options
			var nowView;
			var id = M.getUIDByKey(routeIns.path);
			if (options.first) {
				nowView = this._getDefaultEle(routeIns);
				removeEle(this.maskEle);
				if (this.viewsContainer && this.$parentRoute && this.viewsContainer !== this.$parentRoute.ele()) {
					this.defaultTemplate = this.viewsContainer.innerHTML;
					if (!nowView) {
						M.innerHTML(this.viewsContainer, '');
						this.maskEle = null;
					}
				}
				this.maskEle && this.viewsContainer.appendChild(this.maskEle);
			}

			var _pageViewEle = M.document.getElementById(id);
			if (!_pageViewEle) {
				// 创建新的元素
				_pageViewEle = nowView || M.document.createElement('div');
				_pageViewEle.id = id;
				// 是新的
				routeIns.cached = false;
				!nowView && this.viewsContainer.appendChild(_pageViewEle);
			} else {
				routeIns.cached = true;
			}

			var shown = M.hasClass(_pageViewEle, ENTERCLASS);
			var route = routeIns.route;
			var redirected = false;
			if (shown && routeIns.element === _pageViewEle && that._redirectTo(routeIns, true)) {
				redirected = true;
				childDone();
				return;
			}
			// 模板不一样 更新
			if ((!routeIns.cached && !nowView) || template !== routeIns._oldTemplate) {
				if (!shown) {
					M.innerHTML(_pageViewEle, template);
				}
				routeIns.cached = false;
			}
			var routeView = route.routeView;
			if (routeView) {
				var routeViewPS = routeView.pageViewState;
				if (shown) {
					if (routeViewPS && routeViewPS !== routeIns.options.matchIns) {
						routeView._transView(null, routeViewPS, options, childDone);
					} else {
						childDone();
					}
					return;
				} else if (routeViewPS) {
					var matchIns = routeIns.options.matchIns;
					var finded = false, matchRoute;
					if (matchIns) {
						matchRoute = matchIns.route;
						var rv = routeView, childRV;
						while (!finded && rv && rv.pageViewState) {
							childRV = rv.pageViewState.route.routeView;
							if (matchRoute == rv.pageViewState.route) {
								finded = true;
								if (matchIns.path !== rv.pageViewState.path) {
									rv._transView(null, rv.pageViewState, options);
								}
								childRV && childRV.pageViewState && childRV._transView(null, childRV.pageViewState, options);
							} else {
								rv = childRV;
							}
						}
					}
					
					if (!finded) {
						routeView._transView(null, routeViewPS, options);
					}
				}
			}
			this._transView(_pageViewEle, routeIns, options, endCall);
			function endCall(element) {
				routeIns.setEle(element);
				var index = M.Array.indexOfByKey(that.pagesCache, routeIns,  'path');
				if (~index) {
					// 移掉当前的
					that.pagesCache.splice(index, 1);
				}
				that.pagesCache.push(routeIns);
				that.pageViewState = routeIns;
				setHtml();
				_endCall();
			}
			function childDone() {
				setHtml();
				doCallback(routeIns, 'onEnter');
				_endCall();
			}
			function setHtml() {
				if (shown && routeView) {
					if (routeView.defaultTemplate || !routeIns.cached) {
						M.innerHTML(_pageViewEle, template);
						routeIns.cached = false;
					}
				}
			}
			function _endCall() {
				if (routeView) {
					routeView.setViewsContainer(routeIns.element);
				}
				doCallback(routeIns, 'callback');
				Router.trigger('routeChangeEnd', routeIns, routeIns.args);
				cb && cb();
				delete that._waiting;
				!redirected && !cb && that._redirectTo(routeIns);
			}
		},

		_transView: function(_pageViewEle, routeIns, options, endCall) {
			var enterClass = ENTERCLASS;
			var leaveClass = 'out';
			var initPosClass = leaveClass;
			var reverseClass = 'reverse';
			var aniClass = 'ani';
			var allClass = enterClass + ' ' + reverseClass;
			var overhidden = 'overhidden';

			var pageViewState = this.pageViewState;
			var ele = pageViewState && pageViewState.element;
			var that = this;

			if (_pageViewEle) {
				// 重置class
				M.removeClass(_pageViewEle, allClass);
				M.addClass(_pageViewEle, defViewClass + ' ' + this.options.viewClass);
			}
			
			var animation = this._shouldAni(this.options.animation, routeIns, options);
			animation = animation && !!endCall && !routeIns.redirectTo && !routeIns.options.state.data.redirectToSync;
			
			if (animation) {
				var aniEnterClass = aniClass;
				var aniLeaveClass = aniClass;
				aniEnterClass += ' ' + this.getOption(routeIns.route, options.state, 'aniClass');
				if (!options.first) {
					aniLeaveClass += ' ' + this.getOption(pageViewState.route, options.oldState, 'aniClass');
				}

				enterClass = aniEnterClass + ' ' + enterClass;
				leaveClass = aniLeaveClass + ' ' + leaveClass;
				// 给viewsContainer增加class overhidden 为了不影响做动画效果
				M.addClass(this.viewsContainer, overhidden);
			}

			if (options.direction === 'back') {
				enterClass += ' ' + reverseClass;
				leaveClass += ' ' + reverseClass;
			}

			if (ele) {
				M.removeClass(ele, allClass);
				M.addClass(ele, leaveClass);
				// reflow
				ele.offsetWidth = ele.offsetWidth;
				doCallback(pageViewState, 'onLeave');
				if (pageViewState.route.getActive() === pageViewState) {
					pageViewState.route.setActive(-1);
				}
			}
			
			if (_pageViewEle) {
				// 移去 initPosClass
				M.removeClass(_pageViewEle, initPosClass);
				M.addClass(_pageViewEle, enterClass);
				// reflow
				_pageViewEle.offsetWidth = _pageViewEle.offsetWidth;
				doCallback(routeIns, 'onEnter');
			}
			
			if (!routeIns.cached && options.state.hash) {
				// 滚动到指定hash元素位置
				scrollToHash(options.state.hash);
			}

			var entered = false;
			var leaved = false;

			if (!animation) {
				// 没有动画
				entered = true;
				leaved = true;
				endCall && endCall(_pageViewEle);
				endCall = null;
				cb();
				return;
			}
			_pageViewEle && _pageViewEle.addEventListener(aniEndName, function aniEnd() {
				entered = true;
				cancelEvt(_pageViewEle, aniEnd);
				M.removeClass(_pageViewEle, aniEnterClass);
				endCall && endCall(_pageViewEle);
				checkPageViews();
			});
			ele && ele.addEventListener(aniEndName, function aniEnd2() {
				leaved = true;
				cancelEvt(ele, aniEnd2);
				M.removeClass(ele, aniLeaveClass);
				cb();
			});
			function cancelEvt(ele, func) {
				setTimeout(function() {
					func && ele.removeEventListener(aniEndName, func);
				});
			}
			function cb() {
				if (!_pageViewEle) {
					endCall && endCall();
					checkPageViews();
					that.pageViewState = null;
					that.defaultTemplate && M.innerHTML(that.viewsContainer, that.defaultTemplate);
					return;
				}
				checkPageViews();
			}
			function checkPageViews() {
				setTimeout(function() {
					M.removeClass(that.viewsContainer, overhidden);
				}, 100);
				// 还有没完成的
				if (!entered || !leaved) return;
				that.checkPageViews();
			}
		},

		_shouldAni: function(animation, routeIns, options) {
			var curAnimation = this.getOption(routeIns.route, options.state, 'animation');
			var prevAnimation = animation;
			if (!options.first) {
				prevAnimation = this.getOption(this.pageViewState.route, options.oldState, 'animation');
			}

			curAnimation = curAnimation == true || curAnimation == 'true' ? true : false;
			prevAnimation = prevAnimation == true || prevAnimation == 'true' ? true : false;

			animation = curAnimation && prevAnimation && (!this._waiting || !options.first);
			if (options.first) {
				animation = animation && !!this.$parentRoute;
			}
			return animation;
		},

		/**
		 * 检查views 移除不需要缓存在页面上的元素
		 */
		checkPageViews: function() {
			var cacheViewsNum = this.options.cacheViewsNum;
			var pagesCache = this.pagesCache;
			if (pagesCache.length <= cacheViewsNum) return;
			// 当前的index
			var curIndex = M.Array.indexOfByKey(pagesCache, this.pageViewState, 'path');
			var newLeft = 0;
			var newRight = 0;
			newLeft = curIndex - Math.floor((cacheViewsNum - 1) / 2);
			if (newLeft < 0) newLeft = 0;
			newRight = cacheViewsNum - 1 + newLeft;
			if (newRight > pagesCache.length - 1) {
				// 左侧继续向左移动
				newLeft -= newRight - pagesCache.length + 1;
				newRight = pagesCache.length - 1;
			}
			while (newLeft > 0) {
				this.destroyRouteIns(pagesCache.shift());
				newLeft--;
				newRight--;
			}
			while (newRight < pagesCache.length - 1) {
				this.destroyRouteIns(pagesCache.pop());
			}
		},

		/**
		 * 销毁 routeIns
		 * @param  {RouteIns} routeIns RouteIns实例
		 */
		destroyRouteIns: function(routeIns) {
			var route = routeIns.route;
			var routeView = route.routeView;
			var nowRoute = this.pageViewState && this.pageViewState.route;
			if (routeView && (!routeView.pageViewState || route !== nowRoute)) {
				// destroy child
				var ins = routeView.pagesCache.shift();
				while (ins) {
					routeView.destroyRouteIns(ins);
					ins = routeView.pagesCache.shift();
				}
				// routeView.templateCache = {};
				routeView.pageViewState = null;
				if (!nowRoute || route.ele() != this.pageViewState.element) {
					routeView.setViewsContainer(null);
				}
				removeEle(routeView.maskEle);
				routeView.maskEle = null;
			}
			doCallback(routeIns, 'onDestroy');
			route.destroyIns(routeIns);
			routeIns = null;
		},

		/**
		 * 获取模板缓存对象
		 * @return {Object} 模板缓存对象
		 */
		getTemplateCache: function() {
			return this.templateCache;
		}

	});

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
			this.redirectTo = function() {
				return redirectTo;
			};
		}
		if (this.redirectTo && M.isUndefined(this.redirectPushState)) {
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
			var parsed = parseUrl(url);
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
				removeEle(this.element);
			}
			this.element = null;
			this.destroyed = true;
		}

	});

	var Router = {

		/*出错回调*/
		errorback: null,

		/**
		 * 初始化
		 * @param  {Array|Undefined}  routes  路由数组
		 * @param  {Object|Undefined} options 配置参数
		 */
		init: function(routes, options) {
			if (inited || !(routes || options)) return;
			inited = true;
			if (!M.isArray(routes)) {
				options = routes;
				routes = [];
			}
			// 如果有error函数
			if (options && M.isFunction(options.error)) {
				this.error(options.error);
				delete options.error;
			}
			var childOptions = {};
			M.extend(childOptions, defOptions, options || {});
			this.routeView = new RouteView(null, null, childOptions);
			this._add(routes);
		},

		/**
		 * 判定当前URL与已有状态对象的路由规则是否符合
		 * @param  {String} path    路由path
		 * @param  {String} query   路由query
		 * @param  {Object} options 配置对象
		 */
		route: function(path, query, options) {
			path = path.trim();
			var finded = this.routeView.route(path, query, options);
			if (!finded && this.errorback) {
				this.errorback(path, query, options);
			}
		},

		/**
		 * 设置出错回调函数
		 * @param  {Function} cb 出错回调函数
		 */
		error: function(cb) {
			this.errorback = cb;
		},

		_add: function(routes, routeView, basePath, parentRoute) {
			var path;
			if (!basePath) basePath = '';
			M.each(routes, function(route) {
				path = route.path;
				var len = 0;
				if (basePath) {
					if (basePath === '/') basePath = '';
					path = basePath + path;
					if (parentRoute.parentArgsLen) {
						len += parentRoute.parentArgsLen;
					}
					len += parentRoute.keys.length;
					route.parentArgsLen = len;
				}
				this.add(path || '/', route.callback, route, routeView);
			}, this);	
		},

		/**
		 * 添加一个路由规则
		 * @param {String}   method   路由方法
		 * @param {String}   path     路由path 也就是path规则
		 * @param {Function} callback 对应的进入后回调
		 * @param {Object}   opts     配置对象
		 * @param {RouteView}   routeView     RouteView对象
		 */
		add: function(path, callback, opts, routeView) {
			if (typeof callback === 'object') {
				routeView = opts;
				opts = callback;
			}
			if (!routeView) routeView = this.routeView;

			var array = routeView.routes;
			if (path.charAt(0) !== '/') {
				throw 'path必须以/开头';
			}

			var route = new Route(path, callback, opts);
			M.Array.ensure(array, route);

			var children = opts.children;
			if (children) {
				delete opts.children; // 移除掉
				// sub view
				var childOptions = {};
				var _options = routeView.options;
				M.each(defOptionsKeys, function(k) {
					if (k in children) {
						childOptions[k] = children[k];
					} else {
						childOptions[k] = _options[k];
					}
				});

				var subRouteView = new RouteView(route, routeView, childOptions);

				routes = children.routes;
				delete children.routes;
				this._add(routes, subRouteView, path, route);
			}
		},

		/**
		 * 导航到url
		 * @param  {String}           url  导航到的url
		 * @param  {Object|Undefined} data 可选附加数据
		 */
		navigate: function(url, data) {
			if(url.charAt(1) === '/') url = url.slice(1);
			history.push(url, data);
		},

		$types: {
			date: {
				pattern: '[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])',
				decode: function(val) {
					return new Date(val.replace(/\-/g, '/'));
				}
			},
			string: {
				pattern: '[^\\/]*'
			},
			bool: {
				pattern: '0|1',
				decode: function(val) {
					return parseInt(val, 10) === 0 ? false : true;
				}
			},
			int: {
				pattern: '\\d+',
				decode: function(val) {
					return parseInt(val, 10);
				}
			}
		}

	};

	// 增加事件机制
	M.extendByBase(Router);

	// 监听history的change
	history.on('change', function(type, state, oldState) {
		var first = false;
		if (!oldState) first = true;
		var parsed = parseUrl(state.url);
		parsed && Router.route(parsed.path, parsed.query, {
			first: first,
			direction: type,
			state: state,
			oldState: oldState
		});
	});

	function parseUrl(url) {
		var path = history.getPath(url);
		// 如果path为空 但是有base 说明 可以path为/
		if (path || history.base) {
			if (!path || path !== '/') path = '/' + (path || '');
			return parseQuery(path);
		}
		return null;
	}
	function doCallback(routeIns, funcName) {
		var f = routeIns.route[funcName];
		return M.isFunction(f) && f.apply(routeIns, routeIns.args);
	}
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
			var type = Router.$types[regexp];
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
	/**
	 * 根据url得到path和query
	 * @param  {String} url url
	 * @return {Object}     path和query信息
	 */
	function parseQuery(url) {
		var array = url.split('?'),
				query = {},
				path = array[0],
				querystring = array[1];

		if (querystring) {
			var seg = querystring.split('&'),
					len = seg.length, i = 0, s;
			for (; i < len; i++) {
				if (!seg[i]) {
					continue;
				}
				s = seg[i].split('=');
				query[decodeURIComponent(s[0])] = decodeURIComponent(s[1]);
			}
		}
		return {
			path: path,
			query: query
		}
	};
	function scrollToHash(hash) {
		var scrollToEle;
		if (hash) {
			scrollToEle = M.document.getElementById(hash);
			scrollToEle && scrollToEle.scrollIntoView();
		}
	}
	function removeEle(ele) {
		ele && ele.parentNode && ele.parentNode.removeChild(ele);
	}
	return Router;
});