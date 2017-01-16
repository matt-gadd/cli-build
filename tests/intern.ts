export const proxyPort = 9000;

// A fully qualified URL to the Intern proxy
export const proxyUrl = 'http://localhost:9000/';

// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
// specified browser environments in the `environments` array below as well. See
// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
// automatically
export const capabilities = {
	project: 'Dojo 2',
	name: '@dojo/cli-build'
};

// Support running unit tests from a web server that isn't the intern proxy
export const initialBaseUrl: string = (function () {
	if (typeof location !== 'undefined' && location.pathname.indexOf('__intern/') > -1) {
		return '/';
	}
	return '';
})();

// The desired AMD loader to use when running unit tests (client.html/client.js). Omit to use the default Dojo
// loader
export const loaders = {
	'host-browser': 'node_modules/@dojo/loader/loader.js',
	'host-node': '@dojo/loader'
};

// Configuration options for the module loader; any AMD configuration options supported by the specified AMD loader
// can be used here
export const loaderOptions = {
	// Packages that should be registered with the loader in each testing environment
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'tests', location: '_build/tests' },
		{ name: 'dojo', location: 'node_modules/intern/node_modules/dojo' },
		{ name: 'cldr-data', location: 'node_modules/cldr-data' },
		{ name: 'cldrjs', location: 'node_modules/cldrjs' },
		{ name: 'dojo-has', location: 'node_modules/dojo-has' },
		{ name: 'dojo-i18n', location: 'node_modules/dojo-i18n' },
		{ name: 'dojo-shim', location: 'node_modules/dojo-shim' },
		{ name: 'globalize', location: 'node_modules/globalize', main: 'dist/globalize' }
	],
	map: {
		globalize: {
			'cldr': 'cldrjs/dist/cldr',
			'cldr/event': 'cldrjs/dist/cldr/event',
			'cldr/supplemental': 'cldrjs/dist/cldr/supplemental',
			'cldr/unresolved': 'cldrjs/dist/cldr/unresolved'
		},
		'src/plugins/InjectModulesPlugin': {
			'webpack/lib': 'tests/support/webpack'
		},
		'src/plugins/I18nPlugin': {
			'src/plugins/InjectModulesPlugin': 'tests/support/MockPlugin'
		}
	}
};

// Non-functional test suite(s) to run in each browser
export const suites = [ 'tests/unit/all' ];

// A regular expression matching URLs to files that should not be included in code coverage analysis
export const excludeInstrumentation = /(?:node_modules|bower_components|tests)[\/\\]|webpack\.config/;
