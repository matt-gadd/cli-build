import webpack = require('webpack');
import Set from '@dojo/shim/Set';
import { existsSync } from 'fs';
import * as path from 'path';
import { BuildArgs } from '../../main';
import BuildTimeRender from './BuildTimeRender';
import CssModulePlugin from '@dojo/webpack-contrib/css-module-plugin/CssModulePlugin';

const IgnorePlugin = require('webpack/lib/IgnorePlugin');
const AutoRequireWebpackPlugin = require('auto-require-webpack-plugin');
const OfflinePlugin = require('offline-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const basePath = process.cwd();
const srcPath = path.join(basePath, 'src');
const testPath = path.join(basePath, 'tests');
const allPaths = [ srcPath,  testPath ];
const mainEntry = 'src/main';
const packageJsonPath = path.join(basePath, 'package.json');
const packageJson = existsSync(packageJsonPath) ? require(packageJsonPath) : {};
const packageName = packageJson.name || '';
const tsLintPath = path.join(basePath, 'tslint.json');
const tsLint = existsSync(tsLintPath) ? require(tsLintPath) : false;

const banner = `
[Dojo](https://dojo.io/)
Copyright [JS Foundation](https://js.foundation/) & contributors
[New BSD license](https://github.com/dojo/meta/blob/master/LICENSE)
All rights reserved
`;

function getJsonpFunctionName(name: string) {
	name =  name.replace(/[^a-z0-9_]/g, ' ').trim().replace(/\s+/g, '_');
	return `dojoWebpackJsonp${name}`;
}

function getUMDCompatLoader(options: { bundles?: { [key: string ]: string[] } }) {
	const { bundles = {} } = options;
	return {
		loader: 'umd-compat-loader',
		options: {
			imports(module: string, context: string) {
				const filePath = path.relative(basePath, path.join(context, module));
				let chunkName = filePath;
				Object.keys(bundles).some((name) => {
					if (bundles[name].indexOf(filePath) > -1) {
						chunkName = name;
						return true;
					}
					return false;
				});
				return `promise-loader?global,${chunkName}!${module}`;
			}
		}
	};
}

const removeEmpty = (items: any[]) => items.filter((item) => item);

const cssLoaders = 	[
	'@dojo/webpack-contrib/css-module-decorator-loader',
	`css-loader?modules&sourceMap&importLoaders=1&localIdentName=[hash:base64:8]`,
	{
		loader: 'postcss-loader?sourceMap',
		options: {
			plugins: [
				require('postcss-import')(),
				require('postcss-cssnext')({ features: { autoprefixer: { browsers: [ 'last 2 versions', 'ie >= 10' ] } } })
			]
		}
	}
];

function webpackConfig(args: Partial<BuildArgs>) {
	args = args || {};
	const serviceWorker = args.pwa && args.pwa.serviceWorker && {
		...{ ServiceWorker: { entry: path.join(__dirname, './sw-handler.js') } }
		, ...args.pwa.serviceWorker,
		AppCache: false
	};
	const manifest = args.pwa && args.pwa.manifest;
	const buildTimeRender = !args['watch-serve'] && args.buildTimeRender;

	const config: webpack.Configuration = {
		entry: {
			[ mainEntry ]: removeEmpty([
				serviceWorker && path.join(__dirname, 'sw.js'),
				buildTimeRender && path.join(__dirname, 'btr.js'),
				path.join(srcPath, 'main.css'),
				path.join(srcPath, 'main.ts')
			])
		},
		node: { dgram: 'empty', net: 'empty', tls: 'empty', fs: 'empty' },
		plugins: removeEmpty([
			new CssModulePlugin(basePath),
			serviceWorker && new webpack.DefinePlugin({ SW_ROUTES: JSON.stringify(serviceWorker.request || []) }),
			new AutoRequireWebpackPlugin(mainEntry),
			new webpack.BannerPlugin(banner),
			new IgnorePlugin(/request\/providers\/node/),
			new ExtractTextPlugin({ filename: 'src/main.css', allChunks: true, disable: true }),
			serviceWorker && new OfflinePlugin(serviceWorker),
			manifest && new WebpackPwaManifest(manifest),
			buildTimeRender && new BuildTimeRender(buildTimeRender)
		]),
		output: {
			chunkFilename: '[name].js',
			library: '[name]',
			umdNamedDefine: true,
			filename: '[name].js',
			jsonpFunction: getJsonpFunctionName(packageName),
			libraryTarget: 'umd',
			path: path.resolve('./output')
		},
		devServer: { port: 8888 },
		devtool: 'source-map',
		watchOptions: { ignored: /node_modules/ },
		resolve: {
			modules: [ basePath, path.join(basePath, 'node_modules') ],
			extensions: ['.ts', '.tsx', '.js']
		},
		resolveLoader: {
			modules: [ path.join(__dirname, '../../loaders'), path.join(__dirname, '../../node_modules'), 'node_modules' ]
		},
		module: {
			rules: removeEmpty([
				tsLint && { test: /\.ts$/, enforce: 'pre', loader: 'tslint-loader', options: { configuration: tsLint, emitErrors: true, failOnHint: true } },
				{ test: /@dojo\/.*\.js$/, enforce: 'pre', loader: 'source-map-loader-cli', options: { includeModulePaths: true } },
				{ include: allPaths, test: /.*\.ts?$/, enforce: 'pre', loader: '@dojo/webpack-contrib/css-module-dts-loader?type=ts&instanceName=0_dojo' },
				{ include: allPaths, test: /.*\.m\.css?$/, enforce: 'pre', loader: '@dojo/webpack-contrib/css-module-dts-loader?type=css' },
				{ include: allPaths, test: /.*\.ts(x)?$/, use: [ getUMDCompatLoader({ bundles: args.bundles }), { loader: 'ts-loader', options: { instance: 'dojo' } } ]},
				{ test: /\.js?$/, loader: 'umd-compat-loader' },
				{ test: new RegExp(`globalize(\\${path.sep}|$)`), loader: 'imports-loader?define=>false' },
				{ test: /.*\.(gif|png|jpe?g|svg|eot|ttf|woff|woff2)$/i, loader: 'file-loader?hash=sha512&digest=hex&name=[hash:base64:8].[ext]' },
				{ test: /\.css$/, exclude: allPaths, use: ExtractTextPlugin.extract({ fallback: [ 'style-loader' ], use: [ 'css-loader?sourceMap' ] }) },
				{ test: /\.m\.css.js$/, exclude: allPaths, use: [ 'json-css-module-loader' ] },
				{ include: allPaths, test: /.*\.css?$/, use: ExtractTextPlugin.extract({ fallback: [ 'style-loader' ], use: cssLoaders }) }
			])
		}
	};

	return config;
}

export default webpackConfig;
