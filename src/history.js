var M = require('./m');

var win = window;
// 状态缓存
var stateCache = {};
// url缓存
var urlCache = [];

// 得到basepath
var parseBasePath = function(path) {
	path = path.replace(/[^\/]+$/, '');
	return ('/' + path + '/').replace(/^\/+|\/+$/g, '/');
};
var getDefBase = function() {
	// 默认base path
	var defBase = M.document.getElementsByTagName('base');
	if (defBase && defBase.length) {
		defBase = parseBasePath(defBase[0].getAttribute('href'));
	} else {
		defBase = '/';
	}
	return defBase;
};

var locationObj = M.parseLocation();
var locationOrigin = locationObj.origin;

var history = win.history;
var agent = (win.navigator || {}).userAgent;
if (!agent) agent = '';
var android = parseInt((/android (\d+)/.exec(agent.toLowerCase()) || [])[1], 10);
if (isNaN(android)) android = undefined;
var boxee = /Boxee/i.test(agent);

var supportPushState = !!(history && history.pushState && history.replaceState && !(android < 4) && !boxee);
var supportHashChange = !!('onhashchange' in win);

var MODE_MAP = {
	hashbang: 1,
	history: 2,
	abstract: 3
};

var hashbangPrefix = '#!';

var hashCacheState = '';

var History = {

	mode: MODE_MAP.hashbang,

	supportPushState: supportPushState,
	supportHashChange: supportHashChange,
	/*是否支持*/
	support: supportPushState || supportHashChange,

	/*是否已启动*/
	startd: false,

	/*在urlCache中位置*/
	index: -1,
	preIndex: -1,

	/*base path*/
	base: '/',

	checkMode: function() {
		var that = this;
		'abstract,history,hashbang'.replace(M.rword, function(mode) {
			if (that.options[mode]) {
				that.mode = MODE_MAP[mode];
			}
		});
		if (this.mode === MODE_MAP.history && !this.supportPushState) {
			// history 模式 但是不支持 pushstate
			this.mode = MODE_MAP.hashbang;
		}
		if (!this.support) {
			// 都不支持
			this.mode = MODE_MAP.abstract;
		}
	},

	/**
	 * 启动
	 * @param  {Object} options 配置参数
	 */
	start: function(options) {
		if (this.startd) return;
		if (!options) options = {};
		var base = options.base;
		if (M.isDefined(base) && M.isString(base)) {
			this.base = parseBasePath(base);
		} else {
			this.base = getDefBase();
		}
		this.startd = true;

		this.options = M.extend({}, options);

		// 检查设置的模式
		this.checkMode();

		// 根据模式做处理
		if (this.mode !== MODE_MAP.abstract) {
			win.addEventListener(this.mode === MODE_MAP.history ? 'popstate' : 'hashchange', this.onChange);
		}
		M.document.addEventListener('click', this.onDocClick);

		// 需要初始化一次当前的state
		this.onChange();
		this.trigger('inited');
	},

	/**
	 * 停止监听
	 */
	stop: function() {
		if (this.mode !== MODE_MAP.abstract) {
			win.removeEventListener(this.mode === MODE_MAP.history ? 'popstate' : 'hashchange', this.onChange);
		}
		M.document.removeEventListener('click', this.onDocClick);
		this.startd = false;
		this.index = -1;
		stateCache = {};
		urlCache = [];
	},

	/**
	 * 去掉url中base之后的path
	 * @param  {String}  url      url
	 * @param  {Boolean} noSearch 不加search信息
	 * @return {String}           去掉base之后的URL
	 */
	getPath: function(url, noSearch) {
		var urlDetail = M.parseUrl(url);
		var path = decodeURIComponent(urlDetail.pathname + (noSearch ? '' : urlDetail.search));
		// 去掉最后/
		var root = this.base.slice(0, -1);
		if (!path.indexOf(root)) path = path.slice(root.length);
		path = path.slice(1);
		if (path || History.base) {
			if (!path || path !== '/') {
				path = '/' + (path || '');
			}
		}
		return path;
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
		if (!href || !targetEle) {
			return;
		}
		// 存在 href 且和当前是同源
		// 且不带 target download rel!=external 且不是以 javascript: 开头
		var noSpes = !targetEle.target && !targetEle.hasAttribute('download') && targetEle.getAttribute('rel') !== 'external';
		if (History.checkUrl(href) && noSpes) {
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
		var rext = /^(javascript|mailto|tel):/i;
		return url && locationOrigin === urlOrigin && !rext.test(url);
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

	currentHref: function() {
		return M.location.href.replace(hashbangPrefix + '/', '');
	},

	/**
	 * 添加新的state
	 * @param  {Object}  state   state数据对象
	 * @param  {Boolean} checked 是否已经校验过该state
	 */
	pushState: function(state, checked) {
		if (!checked && !this.checkUrl(state.url, state.origin)) return;
		if (state.url === History.getCurrentState().url) return;
		// 如果是允许改变history 且其dataset中不包含href的话才会改变history
		// 规则就是：
		// data-href="newUrl"会被认为是在当前页中切换，也就是局部禁用pushstate
		if (this.mode !== MODE_MAP.abstract && state.url !== History.currentHref()) {
			if (this.mode === MODE_MAP.hashbang) {
				if (M.isUndefined(state.data.href)) {
					hashCacheState = state;
					// 更改hash后会自动触发hashchange事件
					var newHash = hashbangPrefix + state.rpath;
					if (newHash !== M.location.hash) {
						// 不相等才会触发 hashchange
						M.location.hash = newHash;
						return;
					}
				}
			} else {
				M.isUndefined(state.data.href) && history[state.replace ? 'replaceState' : 'pushState'](state, state.title, state.url);
			}
		}
		this.onChange({
			state: state
		});
	},

	/**
	 * history改变回调
	 */
	onChange: function(e) {
		if (e && e.type === 'hashchange') {
			e.state = hashCacheState;
		}
		var state = e && e.state || History.getUrlState(History.currentHref());
		var oldState = History.getCurrentState();
		
		hashCacheState = null;
		
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
		if (newIndex !== History.index) {
			History.preIndex = History.index;
		}
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
		var url = urlCache[History.preIndex];
		if (!url) {
			url = urlCache[this.index - 1];
			if (!url) {
				return null;
			}
		}
		return stateCache[url] || null;
	},

	/**
	 * 创建包装state对象
	 * @param  {String} url   url
	 * @param  {object} data  附带数据
	 * @return {Object}       包装的state对象
	 */
	createStateObject: function(url, data) {
		if (url) {
			if (url.charAt(0) === '/') {
				url = url.slice(1);
				url = this.base + url;
			}
		} else {
			url = History.currentHref();
		}
		var parsedUrl = M.parseUrl(url);
		return {
			data: data || (data = {}),
			title: data.title || M.document.title,
			rurl: parsedUrl.rurl,
			url: parsedUrl.url,
			path: parsedUrl.pathname,
			rpath: History.getPath(url),
			origin: parsedUrl.origin,
			hash: parsedUrl.hash,
			replace: M.isString(data.replace) ? data.replace === 'true' : !!data.replace
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
	 * @param  {Object}            state 包装state对象
	 * @return {Number}            在urlCache中位置
	 */
	storeState: function(state) {
		var i = -1;
		var url = state.rurl;
		var toIndex = urlCache.indexOf(url);
		if (this.hasUrl(url)) {
			// 之前有
			i = toIndex;
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
		// 最多保留50条记录
		var num = index + 50;
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
	},

	parseUrl: parseUrl
};

// 增加事件机制
M.extendByBase(History);

M.history = History;

module.exports = M;

function parseUrl(url) {
	var path = History.getPath(url);
	// 如果path为空 但是有base 说明 可以path为/
	if (path) {
		return M.parseQuery(path);
	}
	return null;
}
