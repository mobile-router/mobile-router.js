var M = require('../m');

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

var DEFVIEWCLASS = 'page-view';
var ENTERCLASS = 'in';
var LEAVECLASS = 'out';
var REVERSECLASS = 'reverse';
var ANICLASS = 'ani';
var OVERHIDDEN = 'overhidden';
var ALLCLASS = ENTERCLASS + ' ' + REVERSECLASS;

function RouteView(parentRoute, options) {
	if (parentRoute) {
		parentRoute.setRouteView(this);
	}

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
	if (!this.options.maskClass) {
		this.options.maskClass = 'mask';
	}
	this.options.maskClass = this.options.maskClass.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
	if (!parentRoute) {
		// 根 RouteView
		this.setViewsContainer(M.document.body);
	}
}
M.extend(RouteView.prototype, {

	route: function(path, query, options) {
		if (!options) options = {};
		return this._match('regexp', path, query, options) || this._match('$regexp', path, query, options);
	},

	_match: function(regexp, path, query, options) {
		if (!regexp) {
			regexp = 'regexp';
		}
		for (var i = 0, el, args; el = this.routes[i]; i++) {
			if (el[regexp]) {
				args = path.match(el[regexp]);
				if (args) {
					this._matched(el, path, args, query, options);
					return true;
				}
			}
		}
		return false;
	},

	_matched: function(el, path, args, query, options) {
		var _path = args.shift();
		routeIns = el.ins(_path, query || {}, args, options);
		routeIns.targetPath = path;
		this._route(routeIns, function() {
			// M.nextTick(function() {
				if (el.routeView && !routeIns.destroyed) {
					// 子 RouteView
					if (!el.routeView.route(path, routeIns.query, M.extend({parentUID: routeIns.id}, options))) {
						// 子的并没有匹配到 例如说从 子路由 恢复到 父路由的时候
						// 如果说子 routeView 当前active的path和targetPath一样的话 就没必要leave了
						el.routeView.pageViewState && el.routeView.pageViewState.path !== routeIns.targetPath && el.routeView.leave(options);
					}
				}
			// });
		});
	},

	_redirectTo: function(routeIns, isAsync) {
		var route = routeIns.route;
		var rtUrl;
		if (routeIns.path === routeIns.targetPath && route.redirectTo && (rtUrl = doCallback(routeIns, 'redirectTo'))) {
			if (!routeIns.equalTo(rtUrl, true) && rtUrl !== routeIns.targetPath) {
				if (isAsync) M.nextTick(reT);
				else reT();
				return true;
			}
		}
		return false;
		function reT() {
			!routeIns.element && route.destroyIns(routeIns);
			var data = {
				_redirectedOriginPath: routeIns.path
			};
			if (!isAsync) data.redirectToSync = true;
			if (!route.redirectPushState) data.href = rtUrl;
			M.router.navigate(rtUrl, data);
		}
	},

	_getDefaultEle: function(routeIns) {
		var initView;
		if (!this.pageViewState &&
				(initView = this.viewsContainer.getElementsByClassName(DEFVIEWCLASS)[0]) &&
				(!initView.id || initView.id === routeIns.id)
			) {
			return initView;
		}
		return null;
	},

	_setDefTemplateCache: function(routeIns) {
		var initView = routeIns.element;
		var cacheTemplate = false;
		if (initView && routeIns.options.first) {
			// 初次进入 获得内容 得到默认模板 后端渲染
			if (routeIns.route.routeView) {
				// 有 routeView 证明有子view
				var pageViews = initView.getElementsByClassName(DEFVIEWCLASS);
				// 获取初始的 innerHTML 作为缓存了的模板内容
				var childViews = [];
				M.each(pageViews, function(pv) {
					if (pv.parentNode == initView) {
						M.removeEle(pv);
						childViews.push(pv);
					}
				});
				// 移除了子元素的 html 后的内容
				this.templateCache[routeIns.path] = initView.innerHTML;
				// 依次附加回去
				M.each(childViews, function(cv) {
					initView.appendChild(cv);
				});
				pageViews = null;
				childViews = null;
			} else {
				this.templateCache[routeIns.path] = initView.innerHTML;
			}
			cacheTemplate = !!this.templateCache[routeIns.path];
		}
		return cacheTemplate;
	},

	_route: function(routeIns, cb) {
		if (routeIns === this.pageViewState) {
			// 判断 redirect
			// if (routeIns.options.state.data._redirectedOriginPath || routeIns.path === routeIns.targetPath) {
			// 	this._redirectTo(routeIns);
			// }
			this._redirectTo(routeIns, true);	
			return cb();
		}
		var route = routeIns.route;
		var that = this;
		// 缓存模板
		var cacheTemplate = this.getOption(route, routeIns.options.state, 'cacheTemplate');
		var initView = this._getDefaultEle(routeIns);
		routeIns.setEle(initView);
		if (this._setDefTemplateCache(routeIns)) {
			cacheTemplate = true;
		}
		if (M.isString(cacheTemplate)) cacheTemplate = cacheTemplate === 'true';
		// 这里加上 得到模板
		var args = routeIns.args;
		if (!(cacheTemplate && this.templateCache[routeIns.path]) && route.getTemplate) {
			doCallback(routeIns, 'onActive');
			M.router.trigger('routeChangeStart', routeIns, args);
			// 给当前的活动ins的元素加上 on-out
			// 为了隐藏 loading
			if (this.pageViewState && this.pageViewState.element) {
				M.addClass(this.pageViewState.element, 'on-out');
			}
			this.showLoading();
			if (route.getTemplate.length > 0) {
				// 有参数 则需要回调 主要场景是异步得到模板
				route.getTemplate.call(routeIns, getTemplateCb);
			} else {
				getTemplateCb(route.getTemplate.call(routeIns));
			}
		} else {
			// 无模板 直接跳转
			if (!route.getTemplate && this._redirectTo(routeIns, true)) {
				return;
			}
			doCallback(routeIns, 'onActive');
			M.router.trigger('routeChangeStart', routeIns, args);
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
		var maskEle = this.viewsContainer.querySelector(this.options.maskClass.replace(/^|\s/g, '.'));
		if (!maskEle) {
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
		if (routeState && M.isUndefined(val)) {
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
		var pageViewState = this.pageViewState;
		var nowView;
		var id = routeIns.id;
		if (!this.pageViewState) {
			nowView = routeIns.element;
		}
		if (!this.viewsContainer || routeIns.destroyed) {
			// 还没来得及 就已经被 destroy 了
			return;
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
		routeIns.setEle(_pageViewEle);
		this._initEle(_pageViewEle);
		var route = routeIns.route;
		// 模板不一样 更新
		if (!routeIns.cached || template !== routeIns._oldTemplate) {
			M.innerHTML(_pageViewEle, template);
			routeIns.cached = false;
		}

		var routeView = route.routeView;
		// 更新 pagesCache
		var index = M.Array.indexOfByKey(that.pagesCache, routeIns,  'path');
		if (~index) {
			// 移掉当前的
			that.pagesCache.splice(index, 1);
		}
		that.pagesCache.push(routeIns);

		if (routeView) {
			routeView.setViewsContainer(routeIns.element);
		}
		// 不需要等到昨晚动画即可
		cb && cb();

		this._transView(routeIns, options, function() {
			if (pageViewState && pageViewState.element) {
				M.removeClass(pageViewState.element, 'on-out');
			}
			doCallback(routeIns, 'callback');
			M.router.trigger('routeChangeEnd', routeIns, routeIns.args);
			// 结束后判断是否 redirect
			that._redirectTo(routeIns);
		});
	},

	_initEle: function(ele) {
		// 重置class
		M.removeClass(ele, ALLCLASS);
		M.addClass(ele, DEFVIEWCLASS + ' ' + LEAVECLASS + ' ' + this.options.viewClass);
	},

	leave: function(options) {
		if (this.pageViewState && !this.pageViewState.destroyed) {
			// 存在当前活动的
			var childRouteView = this.pageViewState.route.routeView;
			this._transView(this.pageViewState, options, function() {
				if (childRouteView) {
					options = M.extend({}, options);
					// 不要animation
					options.first = true;
					childRouteView.leave(options);
				}
			});
		}
	},

	_transView: function(routeIns, options, endCall) {
		var enterClass = ENTERCLASS;
		var leaveClass = LEAVECLASS;
		var initPosClass = leaveClass;

		var _pageViewEle = routeIns.element;
		var pageViewState = this.pageViewState;
		var ele = pageViewState && pageViewState.element;
		var that = this;

		this.pageViewState = routeIns;

		if (pageViewState === routeIns) {
			// 两者相等 认为是leave
			_pageViewEle = null;
			this.pageViewState = null;
		}

		var animation = this._shouldAni(this.options.animation, routeIns, options);
		animation = animation && !routeIns.options.state.data.redirectToSync;

		if (animation) {
			var aniEnterClass = ANICLASS;
			var aniLeaveClass = ANICLASS;
			aniEnterClass += ' ' + this.getOption(routeIns.route, options.state, 'aniClass');
			if (!options.first && pageViewState) {
				aniLeaveClass += ' ' + this.getOption(pageViewState.route, options.oldState, 'aniClass');
			}

			enterClass = aniEnterClass + ' ' + enterClass;
			leaveClass = aniLeaveClass + ' ' + leaveClass;
			// 给viewsContainer增加class overhidden 为了不影响做动画效果
			M.addClass(this.viewsContainer, OVERHIDDEN);
		}

		if (options.direction === 'back') {
			enterClass += ' ' + REVERSECLASS;
			leaveClass += ' ' + REVERSECLASS;
		}

		if (ele) {
			M.removeClass(ele, ALLCLASS);
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
			M.scrollToHash(options.state.hash);
		}

		var entered = !_pageViewEle;
		var leaved = !ele;

		if (!animation) {
			// 没有动画
			entered = true;
			leaved = true;
			endCall && endCall();
			cb();
			return;
		}
		_pageViewEle && _pageViewEle.addEventListener(aniEndName, function aniEnd() {
			entered = true;
			cancelEvt(_pageViewEle, aniEnd);
			M.removeClass(_pageViewEle, aniEnterClass);
			endCall && endCall();
			checkPageViews();
		});
		ele && ele.addEventListener(aniEndName, function aniEnd2() {
			leaved = true;
			cancelEvt(ele, aniEnd2);
			M.removeClass(ele, aniLeaveClass);
			cb();
		});
		function cancelEvt(ele, func) {
			func && ele.removeEventListener(aniEndName, func);
		}
		function cb() {
			if (!_pageViewEle) {
				// leave 模式
				endCall && endCall();
				checkPageViews();
				if (routeIns === that.pageViewState) {
					that.pageViewState = null;
				}
				return;
			}
			// 如果有子的 routeView 那么需要 leave
			if (pageViewState && pageViewState.route && pageViewState.route.getActive() !== that.pageViewState) {
				pageViewState.route.routeView && pageViewState.route.routeView.leave(options)
			}
			checkPageViews();
		}
		function checkPageViews() {
			if (!entered || !leaved) return;
			M.removeClass(that.viewsContainer, OVERHIDDEN);
			that.checkPageViews(routeIns);
		}
	},

	_shouldAni: function(animation, routeIns, options) {
		var curAnimation = this.getOption(routeIns.route, options.state, 'animation');
		var prevAnimation = animation;
		if (!options.first && this.pageViewState) {
			prevAnimation = this.getOption(this.pageViewState.route, options.oldState, 'animation');
		}

		curAnimation = curAnimation == true || curAnimation == 'true' ? true : false;
		prevAnimation = prevAnimation == true || prevAnimation == 'true' ? true : false;

		animation = curAnimation && prevAnimation && !options.first;
		return animation;
	},

	/**
	 * 检查views 移除不需要缓存在页面上的元素
	 */
	checkPageViews: function(routeIns) {
		var cacheViewsNum = this.options.cacheViewsNum;
		var pagesCache = this.pagesCache;
		if (pagesCache.length <= cacheViewsNum) return;
		// 当前的index
		var curIndex = M.Array.indexOfByKey(pagesCache, routeIns, 'path');
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
		if (routeIns.destroyed) {
			return;
		}
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
			M.removeEle(routeView.maskEle);
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

module.exports = RouteView;

function doCallback(routeIns, funcName) {
	if (routeIns.destroyed) {
		return;
	}
	var f = routeIns.route[funcName];
	return M.isFunction(f) && f.apply(routeIns, routeIns.args);
}
