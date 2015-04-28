mobile-router.js — A lightweight single page bone for mobile web App
=


[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]


[DEMO](http://demo.aijc.net/js/M/examples/) - [source code](https://github.com/dolymood/mobile-router.js/blob/master/examples/index.html)

[require.js DEMO](http://demo.aijc.net/js/M/examples/requirejs/) - [source code](https://github.com/dolymood/mobile-router.js/blob/master/examples/requirejs/index.html)

The [mobile-router.js-demo](https://github.com/dolymood/mobile-router.js-demo) is a simple mobile web app demo for [mobile-router.js](https://github.com/dolymood/mobile-router.js).

[中文](https://github.com/dolymood/mobile-router.js/blob/master/README-zh_CN.md)

## How can i install it?

Download a latest build from <https://github.com/dolymood/mobile-router.js/releases> it contains development and minified production files in build/ folder.

or use npm

	npm install mobile-router.js

or use git clone

	git clone https://github.com/dolymood/mobile-router.js.git

## How can I use it?

```js
M.router.init([
	{
		path: '/', // route path
		cacheTemplate: false, // cacheTemplate option for the current route
		animation: true, // animation option for the current route
		aniClass: 'slideup', // switching effects option for the current route
		getTemplate: function() { // sync
			return '/index template content';
		},
		callback: function() {
			if (this.cached) return; // the page was cached in document.
			// do something ...
		},
		onDestroy: function() {
			// destroy
		}
	},
	{
		path: '/c/:paramName',
		getTemplate: function(cb) { // async
			var that = this;
			// that.params - params info
			// that.query - query info
			setTimeout(function() {
				cb('/c/' + that.params.paramName + ' template content');
			}, 200);
		},
		callback: function(paramName) {
			if (this.cached) return;
			// do something ...
		},
		onDestroy: function() {
			// destroy
		}
	}
], {
	/*cache tempaltes or not*/
	cacheTemplate: true,

	/*views container's selector. Default document.body*/
	viewsSelector: '',

	/*view class*/
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
M.router.get('/ddd/{dddID:int}', function(dddID) {
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

* Lightweight, Easy to use. Based on [history](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history), [window.onpopstate](https://developer.mozilla.org/en-US/docs/WindowEventHandlers.onpopstate).

* No Dependencies. You can use it with `jquery`, `zepto`, `iscroll` or others.

* Cache templates automatically.

* Good for `SEO`. You can render pages on server.

* Cache pages automatically. Default cache pages number is `3`.

* Switching pages use `CSS animation`.

* Enable `pushstate` or not.

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
