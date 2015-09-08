mobile-router.js — A lightweight single page bone for mobile web App
=


[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]

[Online docs](http://mrdocs.aijc.net/)

[DEMO](http://demo.aijc.net/js/M/examples/) - [source code](https://github.com/dolymood/mobile-router.js/blob/master/examples/index.html)

[require.js DEMO](http://demo.aijc.net/js/M/examples/requirejs/) - [source code](https://github.com/dolymood/mobile-router.js/blob/master/examples/requirejs/index.html)

The [mobile-router.js-demo](https://github.com/dolymood/mobile-router.js-demo) is a simple mobile web app demo for [mobile-router.js](https://github.com/dolymood/mobile-router.js).

[mobile-router.js-sample](https://github.com/dolymood/mobile-router.js-sample) - A mobile-router.js demo like [ui-router sample](http://angular-ui.github.io/ui-router/sample/)

[中文 README](https://github.com/dolymood/mobile-router.js/blob/master/README-zh_CN.md)

## How can i install it?

Download a latest build from <https://github.com/dolymood/mobile-router.js/releases> it contains development and minified production files in build/ folder.

or use npm

	npm install mobile-router.js

or use git clone

	git clone https://github.com/dolymood/mobile-router.js.git

## How can i use it?

```js
M.router.init([
	{
		path: '/', // route path
		cacheTemplate: false, // cacheTemplate option for current route
		animation: true, // animation option for current route
		aniClass: 'slideup', // switching effects option for current route
		getTemplate: function() { // sync
			return '/index template content';
		},
		onActive: function() { // 1.5.5+ // called when the route is actived, even before create `page-view` element

		},
		callback: function() { // called after the page has been shown
			if (this.cached) return; // the page was cached in document.
			// do something ...
		},
		onDestroy: function() {
			// destroy
		},
		onEnter: function(paramName) { // 1.5.3+ // called when the page will show

		},
		onLeave: function() { // 1.5.3+ // called when the page will hide

		}
	},
	{
		path: '/m/:paramName',
		getTemplate: function(cb) { // async
			var that = this;
			// that.params - params info
			// that.query - query info
			setTimeout(function() {
				cb('/m/' + that.params.paramName + ' template content');
			}, 200);
		},
		callback: function(paramName) {
			if (this.cached) return;
			// do something ...
		},
		onDestroy: function() {
			// destroy
		}
	},
	{ // support redirectTo , string url or function (1.5.5+)
		path: '/redirectTo/:rtPath',
		redirectPushState: false, // default true, enable `pushState` when redirectTo is actived
		redirectTo: function(rtPath) {
			console.log('redirectTo', arguments, this);
			return '/' + rtPath;
		}
	},
	{ // support redirectTo , string url or function (1.5.5+)
		// if redirectTo route have getTemplate then the `page-view` will
		// be created, looks like a normal route. The redirectTo will be actived
		// after the route's callback is called
		path: '/contacts',
		getTemplate: contacts.getTemplate,
		onEnter: contacts.onEnter,
		onLeave: contacts.onLeave,
		callback: contacts.controller,
		onDestroy: contacts.onDestroy,

		redirectTo: '/contacts/list',
		redirectPushState: false,

		children: { // Nested routes & views! (1.5.0+)
			viewsSelector: '.content',
			cacheViewsNum: 1,
			routes: [
				{
					// all contacts
					path: '/list',
					getTemplate: list.getTemplate,
					onEnter: list.onEnter,
					onLeave: list.onLeave,
					callback: list.controller,
					onDestroy: list.onDestroy
				}
			]
		}
	},
	{ // Nested routes & views! (1.5.0+)
		path: '/b/:bid',
		getTemplate: function(cb) {
			var path = this.path.substr(1);
			setTimeout(function() {
				var lis = '';
				var t;
				// build sub view link
				for (var i = 1; i <= 4; i++) {
					t = path + '/s' + i;
					lis += '<li><a href="' + t + '">/' + t + '</a></li>';
					// or: (looks like set `enablePushState:false`, do not change `location`)
					// lis += '<li><a href="#" data-href="' + t + '">/' + t + '</a></li>';
				}
				cb(
					'<ul class="nav">' + lis + '</ul>'
				);
			}, 200);
		},
		callback: function() {
			console.log('callback:/b', this, arguments);
		},
		onDestroy: function() {
			console.log('destroy:/b', this, arguments);
		},

		children: { // config for nested routes & views! (1.5.0+)
			/* these configs, default inherit form parent config */
			viewsSelector: '',
			viewClass: 'sub-view-b',
			maskClass: 'mask',
			showLoading: true,
			cacheViewsNum: 3,
			cacheTemplate: true,
			animation: true,
			aniClass: 'slide',

			routes: [
				{
					path: '/:subB', // '/b/:bid/:subB'
					/* config for current sub route */
					cacheTemplate: false,
					animation: true,
					aniClass: 'slideup',
					getTemplate: function(cb) {
						var that = this;
						setTimeout(function() {
							cb('<div>' + that.path + '<p>sub content</p></div>');
						}, 200);
					},
					callback: function() {
						console.log('sub callback b', this, arguments);
					},
					onDestroy: function() {
						console.log('sub destroy b', this, arguments);
					}
				}
			]
			
		}
	}
], {
	/** Global configs  */
	/*cache tempaltes or not*/
	cacheTemplate: true,

	/*views container's selector. Default document.body*/
	viewsSelector: '',

	/*view class. Each page view will have a default class `page-view`, the `viewClass` option's value will be appended to the page view element's class */
	viewClass: 'page-view',

	/*use animation or not*/
	animation: true,
	/*switching effects*/
	aniClass: 'slide',

	/*mask class for loading*/
	maskClass: 'mask',
	/*show loading or not*/
	showLoading: true,

	/*cache views number. Default 3*/
	cacheViewsNum: 3
});

// Or like this
M.router.add('/ddd/{dddID:int}', function(dddID) {
	// callback
}, { // options
	cacheTemplate: true,
	getTemplate: function() {
		return '/ddd/' + this.params.dddID;
	},
	onDestroy: function() {
		// destroy
	}
});

/* global route change events */
/* `routeChangeStart` event, trigged before a route change. */
M.router.on('routeChangeStart', function(currentRouteState) {
	
});
/*`routeChangeEnd` event, trigged after a route changed and the page has been shown.*/
M.router.on('routeChangeEnd', function(currentRouteState) {
	
});

//  start history
M.history.start({
	base: '/', // base path of history. Default the url base in the head of your main html file (<base href="/my-base">) or '/'
	enablePushState: true // enable pushstate or not
});

```

## Advantages?

* Lightweight, Easy. Based on [history](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history), [window.onpopstate](https://developer.mozilla.org/en-US/docs/WindowEventHandlers.onpopstate).

* Nested routes & views (1.5.0+).

* No Dependencies. You can use it with `jquery`, `zepto`, `iscroll` or others.

* Cache templates automatically.

* Good for `SEO`. You can render pages on server.

* Cache pages automatically. Default cache pages number is `3`.

* Switching pages use `CSS animation`.

* Enable `pushstate` or not.

## About some configs

The priority of get `animation`, `aniClass` or `cacheTemplate` config's value is:

	`data-xxx` -> route config -> global config

## About examples/

* `index.html`: basic usage, `getTemplate` config, and `data-rel=back` attribute config on link element for reverse animation direction.

* `index1.html`: `data-href` attribute config on link for disable `pushState`, and disable `animation` of one route.
 
* `index2.html`: disable `animation`.

* `index3.html`: disable `cacheTemplate`.

* `index4.html`: set global `aniClass`.

* `index5.html`: set `aniClass` in two ways.

* `index6.html`: set `cacheTemplate` of one route.

* `index7.html`: set `M.history` config `enablePushState=false` for disable `pushState`.

* `index8.html`: nested routes and views.

* `requirejs/`: use [require.js](http://requirejs.org/)

## About SEO

The server can response HTML with cpmplete content

```html
<div class="page-view"><h2>content rendered by the server</h2></div>
```

## License

The [MIT](https://github.com/dolymood/mobile-router.js/blob/master/LICENSE) License

[npm-image]: https://img.shields.io/npm/v/mobile-router.js.svg?style=flat
[npm-url]: https://npmjs.org/package/mobile-router.js
[downloads-image]: https://img.shields.io/npm/dm/mobile-router.js.svg?style=flat
[downloads-url]: https://npmjs.org/package/mobile-router.js
