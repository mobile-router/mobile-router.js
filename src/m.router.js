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

	// 是否已初始化
	var inited = false;
	
	var defViewClass = 'page-view';

	var ENTERCLASS = 'in';

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
	var defOptionsKeys = M.Object.keys(defOptions);

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

	function RouteView(parentRouteObj, parentRouterView, options) {
		if (parentRouteObj) {
			parentRouteObj.$routeView = this;
		} else {
			this.$root = true;
		}
		if (parentRouterView) {
			this.$parent = parentRouterView;
		}

		this.routes = [];

		this.$parentRouteEle = null;

		/*蒙层元素*/
		this.maskEle = null;
		/*当前pageview状态对象*/
		this.pageViewState = null;
		/*views容器*/
		this.viewsContainer = null;

		this.options = options;

		// page的route state缓存
		this.pagesCache = [];
		// 模板缓存
		this.templateCache = {};

		// view的cache数量不能少于1
		if (this.options.cacheViewsNum < 1) {
			this.options.cacheViewsNum = 1;
		}
		if (!parentRouteObj) {
			this.setViewsContainer(M.document.body);
		}
	}
	var routeKeys = ['cacheTemplate', 'callback', 'getTemplate', '$regexp',
		'regexp', 'viewClass', 'keys', 'onDestroy', 'pattern', '$routeView',
		'$parentArgsLen', 'onEnter', 'onLeave']
	M.extend(RouteView.prototype, {

		route: function(path, query, options, realPath, cb) {
			var states = this.routes;
			if (!options) options = {};
			var ret = false;
			var that = this;
			for (var i = 0, el; el = states[i]; i++) {
				var args = path.match(realPath && el.$regexp || el.regexp);
				if (args) {
					var _path = args[0];
					if (el.element) {
						// 一条路由规则可能会对应着N个pageview
						var finded = false;
						while (el) {
							if (el.path === _path) {
								finded = true;
								break;
							}
							if (el.$child) {
								el = el.$child;
							} else {
								break;
							}
						}
						if (!finded) {
							// 有元素
							var _el = el;
							// 克隆新的一份
							el = M.Object.create(_el);
							routeKeys.forEach(function(k) {
								el[k] = _el[k];
							});
							el.$child = null;
							_el.$child = el;
							states[i] = el;
						}
					}
					el.query = query || {};
					el.path = _path;
					el.params = {};
					el.historyOptions = options;
					var keys = el.keys;
					args.shift();
					if (keys.length) {
						_parseArgs(args, el);
					}
					if (!that.$root && (!that.viewsContainer || !M.hasClass(that.$parentRouteEle, ENTERCLASS))) {
						// 初始化 但是默认匹配到的是 子路由 需要初始化 父路由
						that.$parent.route(el.path, el.query, options, path, function() {
							that._waiting = true;
							route(el);
						});
						return true;
					}
					// else {
					// 	that._waiting = true;
					// }
					route(el);
					ret = true;
				} else if (!realPath) {
					if (el.$routeView) {
						ret = el.$routeView.route(path, query, options);
					}
				}
				if (ret) {
					break;
				}
			}
			return ret;
			function route(el) {
				// 缓存模板
				var cacheTemplate = that.getOption(el, options.state, 'cacheTemplate');
				var id = M.getUIDByKey(el.path);
				if (options.first) {
					var initView = that.viewsContainer.getElementsByClassName(defViewClass)[0];
					if (initView) {
						if (!initView.id || initView.id == id) {
							that.templateCache[el.path] = initView.innerHTML;
							cacheTemplate = true;
						}
					}
				}
				matchArgs(el); // 得到正确的参数
				if (M.isString(cacheTemplate)) cacheTemplate = cacheTemplate === 'true';
				// 这里加上 得到模板
				if (!(cacheTemplate && that.templateCache[el.path]) && el.getTemplate) {
					Router.trigger('routeChangeStart', el, el.args);
					that.showLoading();
					if (el.getTemplate.length) {
						that._waiting = false;
						// 有参数 则需要回调 主要场景是异步得到模板
						// 或者先需要数据 然后利用模板引擎得到结果字符串
						el.getTemplate(getTemplateCb);
					} else {
						getTemplateCb(el.getTemplate());
					}
				} else {
					Router.trigger('routeChangeStart', el, el.args);
					getTemplateCb(that.templateCache[el.path]);
				}
			}
			function getTemplateCb(template) {
				that.getTemplateCb(el, template, realPath && cb);
			}
		},

		setViewsContainer: function(ele) {
			this.$parentRouteEle = ele;
			var viewsContainer;
			var viewsSelector;
			if (ele) {
				// 根据viewsSelector得到views容器元素
				viewsSelector = this.options.viewsSelector;
				viewsContainer = viewsSelector && ele.querySelector(viewsSelector);
				if (!viewsContainer) {
					viewsContainer = ele;
				}
			}
			this.viewsContainer = viewsContainer || null;
		},

		/**
		 * 设置是否有动画
		 * @param  {Boolean} ani 是否有动画
		 */
		animate: function(ani) {
			this.options.animation = !!ani;
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
		 * @param  {Object} state    route对象
		 * @param  {String} template 模板字符串
		 * @param  {Function}  cb    完成后回调
		 */
		getTemplateCb: function(state, template, cb) {
			this.hideLoading();
			state._oldTemplate = this.templateCache[state.path];
			this.templateCache[state.path] = template;

			var that = this;
			var options = state.historyOptions; // 带过来的options
			var first = options.first || !this.pageViewState;
			var nowView;
			var id = M.getUIDByKey(state.path);
			if (first) {
				options.first = first;
				nowView = this.viewsContainer.getElementsByClassName(defViewClass)[0];
				if (this.maskEle) {
					if (this.maskEle.parentNode) {
						this.maskEle.parentNode.removeChild(this.maskEle);
					} else {
						this.maskEle = null;
					}
				}
				if (this.viewsContainer && this.viewsContainer !== this.$parentRouteEle) {
					this.defaultTemplate = this.viewsContainer.innerHTML;
					if (!nowView) {
						M.innerHTML(this.viewsContainer, '');
						this.maskEle = null;
					}
				}
				if (this.maskEle) {
					this.viewsContainer.appendChild(this.maskEle);
				}
			}

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

			var shown = false;
			if (state.$routeView) {
				shown = M.hasClass(_pageViewEle, ENTERCLASS);
			}
			// 模板不一样 更新
			if ((!state.cached && !nowView) || template !== state._oldTemplate) {
				if (!shown) {
					M.innerHTML(_pageViewEle, template);
				}
				state.cached = false;
			}
			
			if (state.$routeView) {
				if (shown) {
					state.$routeView._transView(null, state.$routeView.pageViewState, options, childDone);
					return;
				} else if (state.$routeView.pageViewState) {
					state.$routeView._transView(null, state.$routeView.pageViewState, options);
				}
			}
			this._transView(_pageViewEle, state, options, endCall);
			function endCall(element) {
				state.element = element;
				var index = M.Array.indexOfByKey(that.pagesCache, state,  'path');
				if (~index) {
					// 移掉当前的
					that.pagesCache.splice(index, 1);
				}
				that.pagesCache.push(state);
				that.pageViewState = state;
				setHtml();
				_endCall();
			}
			function childDone() {
				setHtml();
				state.onEnter && state.onEnter.apply(state, state.args);
				_endCall();
			}
			function setHtml() {
				if (shown) {
					if (state.$routeView.defaultTemplate || !state.cached) {
						M.innerHTML(_pageViewEle, template);
						state.cached = false;
					}
				}
			}
			function _endCall() {
				if (state.$routeView) {
					state.$routeView.setViewsContainer(state.element);
				}
				state.callback.apply(state, state.args);
				Router.trigger('routeChangeEnd', state, state.args);
				cb && cb();
				delete that._waiting;
			}
		},

		_transView: function(_pageViewEle, state, options, endCall) {
			var enterClass = ENTERCLASS;
			var leaveClass = 'out';
			var initPosClass = leaveClass;
			var reverseClass = 'reverse';
			var aniClass = 'ani';
			var allClass = enterClass + ' ' + reverseClass;
			var overhidden = 'overhidden';

			var pageViewState = this.pageViewState;
			var that = this;

			if (_pageViewEle) {
				// 重置class
				M.removeClass(_pageViewEle, allClass);
				M.addClass(_pageViewEle, defViewClass + ' ' + this.options.viewClass);
			}
			
			var animation = this._shouldAni(this.options.animation, state, options);
			animation = animation && !!endCall;
			
			if (animation) {
				var aniEnterClass = aniClass;
				var aniLeaveClass = aniClass;
				aniEnterClass += ' ' + this.getOption(state, options.state, 'aniClass');
				if (!options.first) {
					aniLeaveClass += ' ' + this.getOption(pageViewState, options.oldState, 'aniClass');
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

			if (pageViewState) {
				M.removeClass(pageViewState.element, allClass);
				M.addClass(pageViewState.element, leaveClass);
				// reflow
				pageViewState.element.offsetWidth = pageViewState.element.offsetWidth;
				pageViewState.onLeave && pageViewState.onLeave.apply(pageViewState, pageViewState.args);
			}
			
			if (_pageViewEle) {
				// 移去 initPosClass
				M.removeClass(_pageViewEle, initPosClass);
				M.addClass(_pageViewEle, enterClass);
				// reflow
				_pageViewEle.offsetWidth = _pageViewEle.offsetWidth;
				state.onEnter && state.onEnter.apply(state, state.args);
			}
			
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
				endCall && endCall(_pageViewEle);
				if (!_pageViewEle) {
					that.pageViewState = null;
					if (that.defaultTemplate) M.innerHTML(that.viewsContainer, that.defaultTemplate);
				}
				checkPageViews();
				return;
			}
			_pageViewEle && _pageViewEle.addEventListener(aniEndName, function aniEnd() {
				// enter了
				entered = true;
				// 取消监听事件
				_pageViewEle.removeEventListener(aniEndName, aniEnd);
				M.removeClass(_pageViewEle, aniEnterClass);
				endCall && endCall(_pageViewEle);
				checkPageViews();

				aniEnd = null;
			});
			pageViewState && pageViewState.element.addEventListener(aniEndName, function aniEnd2() {
				// leave了
				leaved = true;
				// 取消监听事件
				pageViewState.element.removeEventListener(aniEndName, aniEnd2);
				M.removeClass(pageViewState.element, aniLeaveClass);
				if (!_pageViewEle) {
					endCall && endCall();
					that.pageViewState = null;
					if (that.defaultTemplate) M.innerHTML(that.viewsContainer, that.defaultTemplate);
				}
				// pageViewState.element.style.display = 'none';
				checkPageViews();

				aniEnd2 = null;
				pageViewState = null;
			});

			function checkPageViews() {
				setTimeout(function() {
					M.removeClass(that.viewsContainer, overhidden);
				});
				// 还有没完成的
				if (!entered || !leaved) return;
				that.checkPageViews();
			}
		},

		_shouldAni: function(animation, state, options) {
			var curAnimation = this.getOption(state, options.state, 'animation');
			var prevAnimation = animation;
			if (!options.first) {
				prevAnimation = this.getOption(this.pageViewState, options.oldState, 'animation');
			}

			curAnimation = curAnimation == true || curAnimation == 'true' ? true : false;
			prevAnimation = prevAnimation == true || prevAnimation == 'true' ? true : false;

			// 决定了第一次load的时候第一个view（需要加载模板的情况下）是否启用动画
			// 如果不需要加载模板或者直接同步获得template的话 也是不启用的
			// animation = curAnimation && prevAnimation && (!this._waiting && !this.$root || !options.first);
			animation = curAnimation && prevAnimation && (!this._waiting || !options.first);
			if (options.first) {
				animation = animation && !this.$root;
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
			if (state.$routeView) {
				// destroy child
				var _state = state.$routeView.pagesCache.pop();
				while (_state) {
					state.$routeView.destroyState(_state);
					_state = state.$routeView.pagesCache.pop();
				}
				// state.$routeView.templateCache = {};
				state.$routeView.setViewsContainer();
				state.$routeView.pageViewState = null;
				var _ms = state.$routeView.maskEle;
				_ms && _ms.parentNode.removeChild(_ms);
				state.$routeView.maskEle = null;
				state.$routeView = null;
			}
			// 如果存在destroy
			if (M.isFunction(state.onDestroy)) {
				state.onDestroy();
			}
			try {
				state.element && state.element.parentNode.removeChild(state.element);
			} catch(e) {
				debugger;
			}
			state.element = null;
			var p = M.Object.getPrototypeOf(state);
			if (p && p.$child) {
				// prototype 的 child 就是当前的 state
				p.$child = state.$child || null;
			}
			if (state.$child) {
				M.Object.setPrototypeOf(state.$child, p || null);
				state.$child = null;
			}
			M.Object.setPrototypeOf(state, null);
			state = null;
		},

		/**
		 * 获取模板缓存对象
		 * @return {Object} 模板缓存对象
		 */
		getTemplateCache: function() {
			return this.templateCache;
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
			this.$routeView = new RouteView(null, null, childOptions);
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
			var finded = this.$routeView.route(path, query, options);
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
					path = basePath + path;
					if (parentRoute.$parentArgsLen) {
						len += parentRoute.$parentArgsLen;
					}
					len += parentRoute.keys.length;
					route.$parentArgsLen = len;
				}
				// 避免和之后的path冲突 这里换成pattern
				route.pattern = path;
				delete route.path;
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
			if (!routeView) routeView = this.$routeView;

			var array = routeView.routes;
			if (path.charAt(0) !== '/') {
				throw 'path必须以/开头';
			}

			opts = opts || {};
			opts.callback = callback || M.noop;
			if (path.length > 2 && path.charAt(path.length - 1) === '/') {
				path = path.slice(0, -1);
				opts.last = '/';
			}
			M.Array.ensure(array, this._pathToRegExp(path, opts));

			var children = opts.children;
			if (children) {
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
				var subRouteView = new RouteView(opts, routeView, childOptions);

				routes = children.routes;
				delete children.routes;
				this._add(routes, subRouteView, path, opts);
				delete opts.children; // 移除掉
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
			compiled += quoteRegExp(segment);
			if (opts.children) {
				// 增加不带end $ 的正则
				opts.$regexp = new RegExp(compiled, sensitive ? 'i' : undefined);
			}
			compiled += (opts.strict ? opts.last : '\/?') + '$';
			opts.regexp = new RegExp(compiled, sensitive ? 'i' : undefined);
			return opts;
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
			Router.route(parsed.path, parsed.query, {
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

	/**
	 * 解析match到的参数
	 * @param  {Array} match    匹配结果
	 * @param  {Object} stateObj route state对象
	 */
	function _parseArgs(match, stateObj) {
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
		
		stateObj.args = match;
	}
	function matchArgs(stateObj) {
		var match = stateObj.args;
		if (!match) return;
		if (stateObj.keys.length) {
			var pl = stateObj.$parentArgsLen;
			match.splice(0, pl);
		} else {
			match.length = 0;
		}
	}

	return Router;

});