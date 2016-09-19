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

var defViewClass = 'page-view';
var ENTERCLASS = 'in';

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
	this.routeIns = null;
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

	_checkInsActive: function(routeIns) {
		return this.routeIns === routeIns
	},

	_route: function(routeIns, cb) {
		if (this.routeIns && this.routeIns.endCall) {
			this.routeIns.endCall();
		}
		this.routeIns = routeIns;
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
					M.removeEle(pv);
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
			M.router.trigger('routeChangeStart', routeIns, args);
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
		if (!this._checkInsActive(routeIns)) {
			return;
		}
		routeIns._oldTemplate = this.templateCache[routeIns.path];
		this.templateCache[routeIns.path] = template || '';

		var that = this;
		var options = routeIns.options; // 带过来的options
		var nowView;
		var id = M.getUIDByKey(routeIns.path);
		if (options.first) {
			nowView = this._getDefaultEle(routeIns);
			M.removeEle(this.maskEle);
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
		function endCall() {
			var index = M.Array.indexOfByKey(that.pagesCache, routeIns,  'path');
			if (~index) {
				// 移掉当前的
				that.pagesCache.splice(index, 1);
			}
			that.pagesCache.push(routeIns);
			setHtml();
			_endCall();
		}
		function childDone() {
			if (routeIns.endCall === M.noop || routeIns.destroyed) {
				routeIns.endCall = M.noop;
				return;
			}
			setHtml();
			doCallback(routeIns, 'onEnter');
			_endCall();
			routeIns.endCall = M.noop;
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
			M.router.trigger('routeChangeEnd', routeIns, routeIns.args);
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

		this.pageViewState = routeIns;

		if (_pageViewEle) {
			// 重置class
			M.removeClass(_pageViewEle, allClass);
			M.addClass(_pageViewEle, defViewClass + ' ' + this.options.viewClass);
		}

		routeIns.endCall = function() {
			if (routeIns.endCall === M.noop || routeIns.destroyed) {
				routeIns.endCall = M.noop;
				return;
			}
			endCall && endCall.apply(this, arguments);
			routeIns.endCall = M.noop;
		};
		routeIns.setEle(_pageViewEle);

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
			M.scrollToHash(options.state.hash);
		}

		var entered = false;
		var leaved = false;

		if (!animation) {
			// 没有动画
			entered = true;
			leaved = true;
			routeIns.endCall();
			cb();
			return;
		}
		_pageViewEle && _pageViewEle.addEventListener(aniEndName, function aniEnd() {
			entered = true;
			cancelEvt(_pageViewEle, aniEnd);
			M.removeClass(_pageViewEle, aniEnterClass);
			routeIns.endCall();
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
				routeIns.endCall();
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
	var f = routeIns.route[funcName];
	return M.isFunction(f) && f.apply(routeIns, routeIns.args);
}
