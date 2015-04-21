'use strict';

require.config({
	baseUrl: '/examples/requirejs/js/',
	paths: {
		'm.router': '/build/m'
	}
});

require(['m.router'], function(M) {

	M.router.init([
		{
			path: '/',
			getTemplate: function() {
				return '<div>/<p><a href="#link">link</a></p></div><h3 id="link">cc</h3>';
			},
			callback: function() {
				var that = this;
				var args = arguments;
				require(['index'], function(cb) {
					cb.apply(that, args);
				});
			},
			onDestroy: function() {
				// 当前被销毁时调用
				// console.log(this.element.id)
			}
		},
		{
			path: '/a',
			getTemplate: function() {
				return '<div>/a</div>';
			},
			callback: function() {
				var that = this;
				var args = arguments;
				require(['a'], function(cb) {
					cb.apply(that, args);
				});
			}
		},
		{
			path: '/d/{did:int}',
			getTemplate: function(cb) {
				var that = this;
				setTimeout(function() {
					var nextLink = 'd/' + (that.params.did + 1);
					cb('<div>/d/' + that.params.did + '<p><a href="' + nextLink +'">' + nextLink + '</a></p></div>');
				}, 200);
			},
			callback: function() {
				var that = this;
				var args = arguments;
				require(['d'], function(cb) {
					cb.apply(that, args);
				});
			},
			onDestroy: function() {
				// 当前被销毁时调用
				
			}
		}
	], {
		animation: true,
		cacheTemplate: true,
		error: function() {
			M.router.navigate('/');
		}
	});

	M.history.start();
});