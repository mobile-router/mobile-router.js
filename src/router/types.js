module.exports = {
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
};
