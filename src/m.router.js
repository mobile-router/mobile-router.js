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
					var p = that, pr, element;
					while (p && (pr = p.$parentRoute)) {
						element = pr.ele();
						if (!that.viewsContainer || !element || !pr.actived()) {
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
				this.templateCache[routeIns.path] = initView.innerHTML;
				cacheTemplate = true;
			}
			if (M.isString(cacheTemplate)) cacheTemplate = cacheTemplate === 'true';
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
			var first = options.first || !this.pageViewState;
			var nowView;
			var id = M.getUIDByKey(routeIns.path);
			if (first) {
				options.first = first;
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
				if (shown) {
					if (routeView.pageViewState) {
						routeView._transView(null, routeView.pageViewState, options, childDone);
					} else {
						childDone();
					}
					return;
				} else if (routeView.pageViewState) {
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
						routeView._transView(null, routeView.pageViewState, options);
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
				pageViewState.route.actived(false);
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
					// var curIndex = M.Array.indexOfByKey(that.pagesCache, that.pageViewState, 'path');
					// curIndex >= 0 && that.pagesCache.splice(curIndex, 1);
					// that.pageViewState.route.destroyIns(that.pageViewState);
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
			if (routeView) {
				// destroy child
				var ins = routeView.pagesCache.shift();
				while (ins) {
					routeView.destroyRouteIns(ins);
					ins = routeView.pagesCache.shift();
				}
				// routeView.templateCache = {};
				routeView.pageViewState = null;
				if (routeView.$parentRoute.ele() != this.pageViewState.element) {
					routeView.setViewsContainer();
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
		this._actived = false;

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
			this.actived(this.getIns(index));
		},

		setRouteView: function(routeView) {
			this.routeView = routeView;
		},

		ele: function() {
			var ins = this.getActive() || null;
			return ins && ins.element;
		},

		actived: function(v) {
			if (M.isUndefined(v)) return this._actived;
			this._actived = !!v;
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