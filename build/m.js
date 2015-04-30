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
		return {
			url: loc.href, // 完整 href
			rurl: trimUrl(loc.href), // 去除hash的 href
			host: loc.host, // host
			hash: getHash(loc), // hash 不带#
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
		M.innerHTML = function() {
			var tagHooks = new function() {
				M.extend(this, {
					option: document.createElement('select'),
					thead: document.createElement('table'),
					td: document.createElement('tr'),
					area: document.createElement('map'),
					tr: document.createElement('tbody'),
					col: document.createElement('colgroup'),
					legend: document.createElement('fieldset'),
					_default: document.createElement('div'),
					'g': document.createElementNS('http://www.w3.org/2000/svg', 'svg')
				});
				this.optgroup = this.option;
				this.tbody = this.tfoot = this.colgroup = this.caption = this.thead;
				this.th = this.td;
			};
			'circle,defs,ellipse,image,line,path,polygon,polyline,rect,symbol,text,use'.replace(rword, function(tag) {
				tagHooks[tag] = tagHooks.g; //处理SVG
			});

			var rtagName = /<([\w:]+)/;
			var rxhtml = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig;
			var scriptTypes = {
				'': 1,
				'text/javascript': 1,
				'text/ecmascript': 1,
				'application/ecmascript': 1,
				'application/javascript': 1
			};
			var script = document.createElement('script');
			var hyperspace = document.createDocumentFragment();
			
			function parseHTML(html) {
				if (typeof html !== 'string') html = html + '';
				html = html.replace(rxhtml, '<$1></$2>').trim();
				var tag = (rtagName.exec(html) || ['', ''])[1].toLowerCase(),
						wrapper = tagHooks[tag] || tagHooks._default,
						fragment = hyperspace.cloneNode(false),
						firstChild;

				wrapper.innerHTML = html;
				var els = wrapper.getElementsByTagName('script');
				var forEach = [].forEach;
				if (els.length) {
					//使用innerHTML生成的script节点不会发出请求与执行text属性
					for (var i = 0, el, neo; el = els[i++]; ) {
						if (scriptTypes[el.type]) {
							neo = script.cloneNode(false);
							each(el.attributes, function(attr) {
								neo.setAttribute(attr.name, attr.value);
							});
							neo.text = el.text;
							el.parentNode.replaceChild(neo, el);
						}
					}
				}

				while (firstChild = wrapper.firstChild) {
					// 将wrapper上的节点转移到文档碎片上！
					fragment.appendChild(firstChild);
				}
				return fragment;
			}

			return function(ele, html) {
				var f = parseHTML(html);
				// 先清空 ele 内容
				ele.innerHTML = '';
				ele.appendChild(f);
				f = null;
			};
			
		}();
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
			/*移除数组中指定位置的元素，返回布尔表示成功与否*/
			removeAt: function(target, index) {
				return !!target.splice(index, 1).length;
			},
			/*移除数组中第一个匹配传参的那个元素，返回布尔表示成功与否*/
			remove: function(target, item) {
				var index = target.indexOf(item);
				if (~index)
					return M.Array.removeAt(target, index);
				return false;
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
		},

		Object: {
			create: Object.create || function(proto) {
				return {
					__proto__: proto
				};
			},
			setPrototypeOf: Object.setPrototypeOf || function(object, proto) {
				object.__proto__ = proto;
				return object;
			},
			getPrototypeOf: Object.getPrototypeOf || function(object) {
				return object.__proto__;
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
				urlCache.push(url);
				i = urlCache.length - 1;
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
			var clearUrls = urlCache.slice(index + 1);
			clearUrls.forEach(function(url) {
				delete stateCache[url];
			});
			urlCache.length = index + 1;
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
	/**
	 * 根据url得到path和query
	 * @param  {String} url url
	 * @return {Object}     path和query信息
	 */
	var parseQuery = function(url) {
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

	// url模式参数匹配
	var placeholder = /([:*])(\w+)|\{(\w+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g;

	// 类型route缓存 其实只有一种 get
	var routerCache = {};
	// page的route state缓存
	var pagesCache = [];
	// 模板缓存
	var templateCache = {};

	// 是否已初始化
	var inited = false;
	
	var defViewClass = 'page-view';

	// 默认配置
	var defOptions = {

		/*是否缓存模板*/
		cacheTemplate: true,

		/*views容器选择器*/
		viewsSelector: '',

		/*view的class 默认都会有 page-view 的 class */
		viewClass: '',

		/*是否有动画*/
		animation: true,
		/*类型*/
		aniClass: 'slide',

		/*蒙层class*/
		maskClass: 'mask',
		/*显示loading*/
		showLoading: true,

		/*缓存view数*/
		cacheViewsNum: 3

	};

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
	

	var Router = {

		options: defOptions,

		/*添加到body中的蒙层元素*/
		maskEle: null,

		/*views容器*/
		viewsContainer: null,

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
			routes.forEach(function(route) {
				var path = route.path;
				// 避免和之后的path冲突 这里换成pattern
				route.pattern = path;
				delete route.path;
				this.add(route.method || 'get', path || '/', route.callback, route);
			}, this);
			// 如果有error函数
			if (options && M.isFunction(options.error)) {
				this.error(options.error);
				delete options.error;
			}
			M.extend(this.options, options || {});
			// view的cache数量不能少于1
			if (this.options.cacheViewsNum < 1) {
				this.options.cacheViewsNum = 1;
			}
			maskEle.className = this.options.maskClass;
			maskEle.innerHTML = '<i class="' + this.options.maskClass + '-loading"></i>';

			// 根据viewsSelector得到views容器元素
			var viewsSelector = this.options.viewsSelector;
			var viewsContainer = viewsSelector && M.document.querySelector(viewsSelector);
			if (!viewsContainer) {
				viewsContainer = M.document.body;
			}
			this.viewsContainer = viewsContainer;
		},

		/**
		 * 设置是否有动画
		 * @param  {Boolean} ani 是否有动画
		 */
		animate: function(ani) {
			this.options.animation = !!ani;
		},

		/*出错回调*/
		errorback: null,

		/**
		 * 设置出错回调函数
		 * @param  {Function} cb 出错回调函数
		 */
		error: function(cb) {
			this.errorback = cb;
		},

		/**
		 * 显示loading
		 * @param  {Boolean|Undefined} force 是否强制显示loading
		 */
		showLoading: function(force) {
			if (!this.options.showLoading && !force) return;
			if (!this.maskEle) {
				this.maskEle = maskEle;
				M.body.appendChild(maskEle);
			}
			this.maskEle.style.visibility = 'visible';
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
		 * 将用户定义的路由规则转成正则表达式
		 * 用于做匹配
		 * @param  {String} pattern 用户定义的路由规则
		 * @param  {Object} opts    opt配置对象
		 * @return {Object}         opt配置后（增加了regexp）对象
		 */
		_pathToRegExp: function(pattern, opts) {
			var keys = opts.keys = [],
					sensitive = typeof opts.caseInsensitive === 'boolean' ? opts.caseInsensitive : true,
					compiled = '^', last = 0, m, name, regexp, segment;

			while ((m = placeholder.exec(pattern))) {
				name = m[2] || m[3];
				regexp = m[4] || (m[1] == '*' ? '.*' : 'string');
				segment = pattern.substring(last, m.index);
				// 类型检测
				var type = this.$types[regexp];
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
			compiled += quoteRegExp(segment) + (opts.strict ? opts.last : '\/?') + '$';
			opts.regexp = new RegExp(compiled, sensitive ? 'i' : undefined);
			return opts;
		},

		/**
		 * 添加一个路由规则
		 * @param {String}   method   路由方法
		 * @param {String}   path     路由path 也就是path规则
		 * @param {Function} callback 对应的进入后回调
		 * @param {Object}   opts     配置对象
		 */
		add: function(method, path, callback, opts) {
			var array = routerCache[method.toLowerCase()];
			if (!array) array = routerCache[method.toLowerCase()] = [];
			if (path.charAt(0) !== '/') {
				throw 'path必须以/开头';
			}
			if (typeof callback === 'object') {
				opts = callback;
			}
			opts = opts || {};
			opts.callback = callback || M.noop;
			if (path.length > 2 && path.charAt(path.length - 1) === '/') {
				path = path.slice(0, -1);
				opts.last = '/';
			}
			M.Array.ensure(array, this._pathToRegExp(path, opts));
		},
		
		/*当前pageview状态对象*/
		pageViewState: null,
		
		/**
		 * 判定当前URL与已有状态对象的路由规则是否符合
		 * @param  {String} method  路由方法
		 * @param  {String} path    路由path
		 * @param  {String} query   路由query
		 * @param  {Object} options 配置对象
		 */
		route: function(method, path, query, options) {
			path = path.trim();
			var states = routerCache[method];
			if (!options) options = {};

			for (var i = 0, el; el = states[i++]; ) {
				var args = path.match(el.regexp);
				if (args) {
					if (el.element) {
						// 一条路由规则可能会对应着N个pageview
						var finded = false;
						while (el) {
							if (el.path === path) {
								finded = true;
								break;
							}
							if (el.child) {
								el = el.child;
							} else {
								break;
							}
						}
						if (!finded) {
							// 有元素
							var _el = el;
							// 克隆新的一份
							el = M.Object.create(_el);
							['cacheTemplate', 'callback', 'getTemplate',
							 'keys', 'onDestroy', 'pattern', 'regexp'].forEach(function(k) {
								el[k] = _el[k];
							});
							el.child = null;
							_el.child = el;
						}
					}
					el.query = query || {};
					el.path = path;
					el.params = {};
					el.historyOptions = options;
					var keys = el.keys;
					args.shift();
					if (keys.length) {
						this._parseArgs(args, el);
					}

					// 缓存模板
					var cacheTemplate = this.getOption(el, options.state, 'cacheTemplate');
					if (options.first) {
						var initView = M.document.getElementsByClassName(defViewClass)[0];
						if (initView) {
							templateCache[el.path] = initView.innerHTML;
							cacheTemplate = true;
						}
					}
					if (M.isString(cacheTemplate)) cacheTemplate = cacheTemplate === 'true';
					// 这里加上 得到模板
					if (!(cacheTemplate && templateCache[el.path]) && el.getTemplate) {
						this.trigger('routeChangeStart', el, args);
						this.showLoading();
						if (el.getTemplate.length) {
							// 有参数 则需要回调 主要场景是异步得到模板
							// 或者先需要数据 然后利用模板引擎得到结果字符串
							el.getTemplate(getTemplateCb);
						} else {
							getTemplateCb(el.getTemplate());
						}
						return;
					} else {
						this.trigger('routeChangeStart', el, args);
						return getTemplateCb(templateCache[el.path]);
					}
				}
			}
			if (this.errorback) {
				this.errorback();
			}

			function getTemplateCb(template) {
				Router.getTemplateCb(el, template, args);
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
		 * @param  {Object} state    route对象
		 * @param  {String} template 模板字符串
		 * @param  {Array}  args     可变变量对应的值
		 */
		getTemplateCb: function(state, template, args) {
			this.hideLoading();
			state._oldTemplate = templateCache[state.path];
			templateCache[state.path] = template;

			var that = this;
			var routerOptions = this.options;
			var pageViewState = this.pageViewState;
			var options = state.historyOptions; // 带过来的options
			var first = options.first || !pageViewState;
			var nowView;
			var id = M.getUIDByKey(state.path);
			if (first) {
				nowView = M.document.getElementsByClassName(defViewClass)[0];
			}
			
			var enterClass = 'in';
			var leaveClass = 'out';
			var initPosClass = leaveClass;
			var reverseClass = 'reverse';
			var aniClass = 'ani';
			var allClass = enterClass + ' ' + reverseClass;

			var _pageViewEle = M.document.getElementById(id);
			if (!_pageViewEle) {
				// 创建新的元素
				_pageViewEle = nowView || M.document.createElement('div');
				_pageViewEle.id = id;
				// 是新的
				state.cached = false;
				!nowView && this.viewsContainer.appendChild(_pageViewEle);
			} else {
				state.cached = true;
			}

			// 模板不一样 更新
			if ((!state.cached && !nowView) || template !== state._oldTemplate) {
				M.innerHTML(_pageViewEle, template);
				state.cached = false;
			}

			// 重置class
			M.removeClass(_pageViewEle, allClass);
			M.addClass(_pageViewEle, defViewClass + ' ' + routerOptions.viewClass);

			var animation = routerOptions.animation;

			var curAnimation = this.getOption(state, options.state, 'animation');
			var prevAnimation = routerOptions.animation;
			if (!first) {
				prevAnimation = this.getOption(this.pageViewState, options.oldState, 'animation');
			}

			curAnimation = curAnimation == true || curAnimation == 'true' ? true : false;
			prevAnimation = prevAnimation == true || prevAnimation == 'true' ? true : false;

			animation = curAnimation && prevAnimation && !first;
			
			if (animation) {
				var aniEnterClass = aniClass;
				var aniLeaveClass = aniClass;
				if (!first) {
					aniEnterClass += ' ' + this.getOption(state, options.state, 'aniClass');
					aniLeaveClass += ' ' + this.getOption(this.pageViewState, options.oldState, 'aniClass');
				}

				enterClass = aniEnterClass + ' ' + enterClass;
				leaveClass = aniLeaveClass + ' ' + leaveClass;
			}

			if (options.direction === 'back') {
				enterClass += ' ' + reverseClass;
				leaveClass += ' ' + reverseClass;
			}

			if (pageViewState) {
				M.removeClass(pageViewState.element, allClass);
				M.addClass(pageViewState.element, leaveClass);
				// reflow
				pageViewState.element.offsetWidth = pageViewState.element.offsetWidth;
			}
			
			// 移去 initPosClass
			M.removeClass(_pageViewEle, initPosClass);
			M.addClass(_pageViewEle, enterClass);
			// reflow
			_pageViewEle.offsetWidth = _pageViewEle.offsetWidth;
			
			if (!state.cached) {
				// 增加对hash处理 有时候浏览器不能滚动到响应的
				// 带有hash id 的元素位置
				var hash = options.state.hash;
				var scrollToEle;
				if (hash) {
					scrollToEle = M.document.getElementById(hash);
					scrollToEle && scrollToEle.scrollIntoView();
				}
			}

			var entered = false;
			var leaved = false;

			if (!animation) {
				// 没有动画
				entered = true;
				leaved = true;
				endCall(_pageViewEle);
				checkPageViews();
				return;
			}
			_pageViewEle.addEventListener(aniEndName, function aniEnd() {
				// enter了
				entered = true;
				// 取消监听事件
				_pageViewEle.removeEventListener(aniEndName, aniEnd);
				M.removeClass(_pageViewEle, aniEnterClass);
				endCall(_pageViewEle);
				checkPageViews();

				aniEnd = null;
				_pageViewEle = null;
			});
			pageViewState && pageViewState.element.addEventListener(aniEndName, function aniEnd2() {
				// leave了
				leaved = true;
				// 取消监听事件
				pageViewState.element.removeEventListener(aniEndName, aniEnd2);
				M.removeClass(pageViewState.element, aniLeaveClass);
				// pageViewState.element.style.display = 'none';
				checkPageViews();

				aniEnd2 = null;
				pageViewState = null;
			});

			function endCall(element) {
				state.element = element;
				var index = M.Array.indexOfByKey(pagesCache, state,  'path');
				if (~index) {
					// 移掉当前的
					pagesCache.splice(index, 1);
				}
				pagesCache.push(state);
				that.pageViewState = state;
				state.callback.apply(state, args);
				that.trigger('routeChangeEnd', state, args);
			}

			function checkPageViews() {
				// 还有没完成的
				if (!entered || !leaved) return;
				that.checkPageViews();
			}
		},

		/**
		 * 检查views 移除不需要缓存在页面上的元素
		 */
		checkPageViews: function() {
			var cacheViewsNum = this.options.cacheViewsNum;
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
				this.destroyState(pagesCache.shift());
				newLeft--;
				newRight--;
			}
			while (newRight < pagesCache.length - 1) {
				this.destroyState(pagesCache.pop());
			}
		},

		/**
		 * 销毁state
		 * @param  {Object} state route state
		 */
		destroyState: function(state) {
			// 如果存在destroy
			if (M.isFunction(state.onDestroy)) {
				state.onDestroy();
			}
			state.element && state.element.parentNode.removeChild(state.element);
			state.element = null;
			if (state.child) {
				// state.child的prototype就是当前state
				M.Object.setPrototypeOf(state.child, null);
				M.extend(state, state.child);
			}
			var p = M.Object.getPrototypeOf(state);
			if (p && p.child) {
				// prototype 的 child 就是当前的 state
				p.child = null;
			}
			M.Object.setPrototypeOf(state, null);
			state = null;
		},

		/**
		 * 解析match到的参数
		 * @param  {Array} match    匹配结果
		 * @param  {Object} stateObj route state对象
		 */
		_parseArgs: function(match, stateObj) {
			var keys = stateObj.keys;
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
				match[j] = stateObj.params[key.name] = val;
			}
		},

		/**
		 * 获取模板缓存对象
		 * @return {Object} 模板缓存对象
		 */
		getTemplateCache: function() {
			return templateCache;
		},

		/**
		 * 导航到url
		 * @param  {String}           url  导航到的url
		 * @param  {Object|Undefined} data 可选附加数据
		 */
		navigate: function(url, data) {
			if(url.charAt(1) === '/')
				url = url.slice(1); // 修正出现多扛的情况 fix http://localhost:8383/router/index.html#!//
			history.push(url, data);
		},

		/* *
		 `'/hello/'` - 匹配'/hello/'或'/hello'
		 `'/user/:id'` - 匹配 '/user/bob' 或 '/user/1234!!!' 或 '/user/' 但不匹配 '/user' 与 '/user/bob/details'
		 `'/user/{id}'` - 同上
		 `'/user/{id:[^/]*}'` - 同上
		 `'/user/{id:[0-9a-fA-F]{1,8}}'` - 要求ID匹配/[0-9a-fA-F]{1,8}/这个子正则
		 `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
		 path into the parameter 'path'.
		 `'/files/*path'` - ditto.
		 */
		// Router.get("/ddd/:dddID/",callback)
		// Router.get("/ddd/{dddID}/",callback)
		// Router.get("/ddd/{dddID:[0-9]{4}}/",callback)
		// Router.get("/ddd/{dddID:int}/",callback)
		// 我们甚至可以在这里添加新的类型，Router.$type.d4 = { pattern: '[0-9]{4}', decode: Number}
		// Router.get("/ddd/{dddID:d4}/",callback)
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

	// 只需要一种 get
	Router.get = function(path, callback, opts) {
		this.add('get', path, callback, opts);
	};

	// 增加事件机制
	M.extendByBase(Router);

	// 监听history的change
	history.on('change', function(type, state, oldState) {
		var first = false;
		if (!oldState) {
			// 第一次
			first = true;
		}

		var url = state.url;
		var path = history.getPath(url);
		// 如果path为空 但是有base 说明 可以path为/
		if (path || history.base || first) {
			if (!path || path !== '/') path = '/' + (path || '');
			var parsed = parseQuery(path);
			Router.route('get', parsed.path, parsed.query, {
				first: first,
				direction: type,
				state: state,
				oldState: oldState
			});
		}
	});

	function quoteRegExp(string, pattern, isOptional) {
		var result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, '\\$&');
		if (!pattern) return result;
		var flag = isOptional ? '?' : '';
		return result + flag + '(' + pattern + ')' + flag;
	}

	return Router;

});