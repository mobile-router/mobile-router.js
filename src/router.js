var M = require('./history');
var types = require('./router/types');
var Route = require('./router/Route');
var RouteView = require('./router/RouteView');

var history = M.history;

// 是否已初始化
var inited = false;

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

	$types: types

};

// 增加事件机制
M.extendByBase(Router);

// 监听history的change
history.on('change', function(type, state, oldState) {
	var first = false;
	if (!oldState) first = true;
	var parsed = M.history.parseUrl(state.url);
	parsed && Router.route(parsed.path, parsed.query, {
		first: first,
		direction: type,
		state: state,
		oldState: oldState
	});
});

M.router = Router;
module.exports = M;
