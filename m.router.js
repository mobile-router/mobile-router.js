;(function(win, factory) {
	if (typeof define === 'function' && (define.amd || define.cmd)) {
		define('router', function(require) {
			var M = require('m');
			var history = require('history');
			return factory(win, M, history);
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
	
	// 默认配置
	var defOptions = {

		/*是否缓存模板*/
		cacheTemplate: true,

		/*views容器选择器*/
		viewsSelector: '',

		/*view的class*/
		viewClass: 'page-view',

		/*是否有动画*/
		animation: true,
		/*类型*/
		aniForm: 'slide',

		/*蒙层class*/
		maskClass: 'mask',
		/*显示loading*/
		showLoading: true,

		/*缓存view数*/
		cacheViewNum: 3

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
			if (this.options.cacheViewNum < 1) {
				this.options.cacheViewNum = 1;
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
		 */
		showLoading: function() {
			if (!this.options.showLoading) return;
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
							el = Object.create(_el);
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
						var initView = M.document.getElementsByClassName(this.options.viewClass)[0];
						if (initView) {
							templateCache[el.path] = initView.innerHTML;
							cacheTemplate = true;
						}
					}
					// 这里加上 得到模板 加动画 class 操作
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
				nowView = M.document.getElementsByClassName(routerOptions.viewClass)[0];
			}
			
			var enterClass = 'enter';
			var leaveClass = 'leave';
			var initClass = 'init';
			var initPosClass = leaveClass;
			var reverseClass = 'reverse';
			var aniClass = 'ani';
			var allClass = aniClass + ' ' + enterClass + ' ' +
										 leaveClass + ' ' + reverseClass + ' ' + initClass;

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
			if (!state.cached || template !== state._oldTemplate) {
				_pageViewEle.innerHTML = template;
				state.cached = false;
			}

			// 重置class
			M.removeClass(_pageViewEle, allClass);
			M.addClass(_pageViewEle, routerOptions.viewClass + ' ' + initPosClass);

			if (first) {
				// 第一次初始化的时候 加上初始化class
				enterClass += ' ' + initClass;
			}

			var animation = routerOptions.animation;
			if (animation) {
				var aniEnterClass = aniClass + ' ' + this.getOption(state, options.state, 'aniForm');
				var aniLeaveClass = aniClass + ' ' + this.getOption(state, options.oldState, 'aniForm');

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
			}
			// 移去 initPosClass
			M.removeClass(_pageViewEle, initPosClass);
			M.addClass(_pageViewEle, enterClass);
			
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
				// pageViewState.element.style.display = 'none';
				checkPageViews();

				aniEnd2 = null;
				pageViewState = null;
			});

			function endCall(element) {
				state.element = element;
				var index = M.Array.indexOfByKey(pagesCache, state,  'path');
				if (index === -1) {
					if (that.pageViewState && (state.element.id.split('-')[2] - that.pageViewState.element.id.split('-')[2]) < 0) {
						pagesCache.unshift(state);
					} else {
						pagesCache.push(state);
					}
				}
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
			var cacheViewNum = this.options.cacheViewNum;
			if (pagesCache.length <= cacheViewNum) return;
			// 当前的index
			var curIndex = M.Array.indexOfByKey(pagesCache, this.pageViewState, 'path');
			var newLeft = 0;
			var newRight = 0;
			newLeft = curIndex - Math.floor((cacheViewNum - 1) / 2);
			if (newLeft < 0) newLeft = 0;
			newRight = cacheViewNum - 1 + newLeft;
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
				Object.setPrototypeOf(state.child, null);
				M.extend(state, state.child);
			}
			var p = Object.getPrototypeOf(state);
			if (p && p.child) {
				// prototype 的 child 就是当前的 state
				p.child = null;
			}
			Object.setPrototypeOf(state, null);
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
	M.history.on('change', function(type, state, oldState) {
		var first = false;
		if (!oldState) {
			// 第一次
			first = true;
		}
		// 对于 有data-rel 是back的 调整其顺序
		// 一般的场景就是 类似 返回按钮
		if (type !== 'back' && state.data.rel === 'back') {
			type = 'back';
		}
		if (!first && type === 'back' && oldState.data.rel === 'back') {
			type = 'forward';
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