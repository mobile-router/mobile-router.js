;(function(win, factory) {
	if (typeof define === 'function' && (define.amd || define.cmd)) {
		define('history', function(require) {
			var M = require('m');
			return factory(win, M);
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
		 * @param  {String} base 设置的base path
		 */
		start: function(base) {
			if (this._startd) return;
			if (M.isDefined(base) && M.isString(base)) {
				this.base = parseBasePath(base);
			}
			this._startd = true;

			if (support) {
				// 监听改变
				win.addEventListener('popstate', this.onChange);

				// 阻止 a
				M.document.addEventListener('click', this.onDocClick);
			}

			// 需要初始化一次当前的state
			this.onChange({
				type: 'popstate',
				state: History.getUrlState(location.href)
			});
			this.trigger('inited');
		},

		/**
		 * 停止监听
		 */
		stop: function() {
			win.removeEventListener('popstate', this.onChange);
			M.document.removeEventListener('click', this.onDocClick);
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
			var parsedUrl = M.parseUrl(href);
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
			if (!checked) {
				if (!this.checkUrl(state.url, state.origin) || state.url === M.location.href) {
					return;
				}
			}
			history[state.replace == 'true' ? 'replaceState' : 'pushState'](state, state.title, state.url);
			this.onChange({
				state: state
			});
		},

		/**
		 * history改变回调
		 * @param  {Event|Object|Undefined} e 事件对象或者包含state对象
		 */
		onChange: function(e) {
			var state = e && e.state || History.getUrlState(location.href);
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
			document.title = state.title;
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
				if (url.charAt(0) === '/') url = url.slice(1);
			} else {
				url = location.href;
			}
			var parsedUrl = M.parseUrl(url);
			return {
				data: data || (data = {}),
				title: title || data.title || document.title,
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
				// 重新更新
				stateCache[url] = state;
			} else {
				urlCache.push(url);
				i = urlCache.length - 1;
			}
			stateCache[url] = state;
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