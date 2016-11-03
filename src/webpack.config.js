const webpack = require('webpack');
const RequirePlugin = require('umd-compat-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');
const path = require('path');
const basePath = process.cwd();

function isTestEntry(entry) {
	return entry.indexOf('tests/') === 0;
}

function filterEntries(args, entries) {
	return Object.keys(entries)
	.filter((entry) => {
		if (isTestEntry(entry) && !args.test) {
			return false;
		}
		return true;
	})
	.reduce((result, entry) => {
		let deps = entries[entry];
		deps = deps.filter((dep) => fs.existsSync(dep));
		if (deps.length) {
			result[entry] = deps;
		}
		return result;
	}, {});
}

function tsLoader(args) {
	const regex = args.test ? /[src|test]\/.*\.ts?$/ : /src\/.*\.ts?$/;
	return { test: regex, loader: 'ts-loader' };
}

module.exports = function (args) {
	args = args || {};
	return {
		entry: filterEntries(args, {
			'src/main': [ path.join(basePath, 'src/main.ts'), path.join(basePath, 'src/main.styl') ],
			'tests/unit/all': [ path.join(basePath, 'tests/unit/all.ts') ]
		}),
		devtool: 'source-map',
		resolve: {
			root: [ basePath ],
			extensions: ['', '.ts', '.tsx', '.js'],
			alias: {
				rxjs: '@reactivex/rxjs/dist/amd',
				intern: path.join(__dirname, 'intern')
			}
		},
		resolveLoader: {
			root: [ path.join(__dirname, 'node_modules') ]
		},
		module: {
			unknownContextRegExp: /$^/,
			unknownContextCritical: false,
			exprContextRegExp: /$^/,
			exprContextCritical: false,
			preLoaders: [
				{
					test: /dojo-.*\.js$/,
					loader: 'source-map-loader'
				}
			],
			loaders: [
				tsLoader(args),
				{ test: /\.html$/, loader: "html" },
				{ test: /\.(jpe|jpg|woff|woff2|eot|ttf|svg)(\?.*$|$)/, loader: 'file' },
				{ test: /\.styl$/, loader: ExtractTextPlugin.extract(['css-loader?sourceMap', 'stylus-loader']) }
			]
		},
		plugins: [
			new ExtractTextPlugin('main.css'),
			new CopyWebpackPlugin([
				{ context: 'src', from: '**/*', ignore: '*.ts' },
				{ context: 'test', from: '**/*', ignore: '*.ts' },
			]),
			new RequirePlugin(),
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false }}),
			new HtmlWebpackPlugin ({
				inject: true,
				chunks: [ 'src/main' ],
				template: 'src/index.html'
			})
		],
		output: {
			path: path.resolve('./dist'),
			filename: '[name].js'
		}
	};
}
