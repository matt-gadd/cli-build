import webpack = require('webpack');
import NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
import { BuildArgs } from './main';
import Set from '@dojo/shim/Set';
const IgnorePlugin = require('webpack/lib/IgnorePlugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const AutoRequireWebpackPlugin = require('auto-require-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer-sunburst').BundleAnalyzerPlugin;

const isCLI = process.env.DOJO_CLI;
const packagePath = isCLI ? '.' : '@dojo/cli-build-webpack';
const IgnoreUnmodifiedPlugin = require(`${packagePath}/plugins/IgnoreUnmodifiedPlugin`).default;
const ExternalLoaderPlugin = require(`${packagePath}/plugins/ExternalLoaderPlugin`).default;

const basePath = process.cwd();

let tslintExists = false;
try {
	require(path.join(basePath, 'tslint'));
	tslintExists = true;
} catch (ignore) { }

type IncludeCallback = (args: BuildArgs) => any;

interface UMDCompatOptions {
	chunks?: {
		[key: string]: string[];
	};
}

function getUMDCompatLoader(options: UMDCompatOptions) {
	const { chunks = {} } = options;
	return {
		loader: 'umd-compat-loader',
		options: {
			imports(module: string, context: string) {
				const filePath = path.relative(basePath, path.join(context, module));
				let chunkName = filePath;
				Object.keys(chunks).some((name) => {
					if (chunks[name].indexOf(filePath) > -1) {
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

function webpackConfig(args: Partial<BuildArgs>) {
	args = args || {};

	const cssLoader = ExtractTextPlugin.extract({ use: 'css-loader?sourceMap!resolve-url-loader' });
	const localIdentName = (args.watch || args.withTests) ? '[name]__[local]__[hash:base64:5]' : '[hash:base64:8]';
	const externalDependencies = args.externals && args.externals.dependencies;
	const includesExternals = Boolean(externalDependencies && externalDependencies.length);
	const cssModuleLoader = ExtractTextPlugin.extract({
		use: [
			'css-module-decorator-loader',
			`css-loader?modules&sourceMap&importLoaders=1&localIdentName=${localIdentName}!resolve-url-loader`,
			{
				loader: 'postcss-loader?sourceMap',
				options: {
					config: {
						path: path.join(__dirname, 'postcss.config.js')
					}
				}
			}
		]
	});

	const replacedModules = new Set<string>();

	function includeWhen(predicate: any, callback: IncludeCallback, elseCallback: IncludeCallback | null = null) {
		return predicate ? callback(args as any) : (elseCallback ? elseCallback(args as any) : []);
	}

	const ignoredModules: string[] = [];

	if (args.bundles && Object.keys(args.bundles)) {
		Object.keys(args.bundles).forEach(bundleName => {
			(args.bundles || {})[bundleName].forEach(moduleName => {
				ignoredModules.push(moduleName);
			});
		});
	}

	const config: webpack.Config = {
		externals: [
			function (context, request, callback) {
				const externals = externalDependencies || [];
				function findExternalType(externals: (string | { name?: string; type?: string; })[]): string | void {
					for (let external of externals) {
						const name = external && (typeof external === 'string' ? external : external.name);
						if (name && new RegExp(`^${name}[!\/]`).test(request)) {
							return (typeof external === 'string' ? '' : external.type) || 'amd';
						}
					}
				}

				const type = findExternalType(externals.concat('intern'));
				if (type) {
					return callback(null, `${type} ${request}`);
				}

				callback();
			}
		],
		entry: includeWhen(args.element, args => {
			return {
				[args.elementPrefix]: `${__dirname}/templates/custom-element.js`,
				'widget-core': '@dojo/widget-core'
			};
		}, args => {
			return {
				'src/main': [
					path.join(basePath, 'src/main.css'),
					path.join(basePath, 'src/main.ts')
				],
				...includeWhen(args.withTests, () => {
					return {
						'../_build/tests/unit/all': [ path.join(basePath, 'tests/unit/all.ts') ],
						'../_build/tests/functional/all': [ path.join(basePath, 'tests/functional/all.ts') ],
						'../_build/src/main': [
							path.join(basePath, 'src/main.css'),
							path.join(basePath, 'src/main.ts')
						]
					};
				})
			};
		}),
		node: {
			dgram: 'empty',
			net: 'empty',
			tls: 'empty',
			fs: 'empty'
		},
		plugins: [
			new AutoRequireWebpackPlugin(/src\/main/),
			new webpack.BannerPlugin(readFileSync(require.resolve(`${packagePath}/banner.md`), 'utf8')),
			new IgnorePlugin(/request\/providers\/node/),
			new NormalModuleReplacementPlugin(/\.m.css$/, result => {
				const requestFileName = path.resolve(result.context, result.request);
				const jsFileName = requestFileName + '.js';

				if (replacedModules.has(requestFileName)) {
					replacedModules.delete(requestFileName);
				} else if (existsSync(jsFileName)) {
					replacedModules.add(requestFileName);
					result.request = result.request.replace(/\.m\.css$/, '.m.css.js');
				}
			}),
			...includeWhen(args.watch, () => {
				return [ new IgnoreUnmodifiedPlugin() ];
			}),
			includeWhen(args.element, args => {
				return new ExtractTextPlugin({ filename: `${args.elementPrefix}.css` });
			}, () => {
				return new ExtractTextPlugin({ filename: 'main.css', allChunks: true });
			}),
			...includeWhen(!args.watch && !args.withTests, (args) => {
				return [ new OptimizeCssAssetsPlugin({
					cssProcessorOptions: {
						map: { inline: false }
					}
				}) ];
			}),
			includeWhen(args.element, () => {
				return new CopyWebpackPlugin([
					{ context: 'src', from: '**/*', ignore: [ '*.ts', '*.css', '*.html' ] }
				]);
			}, () => {
				return new CopyWebpackPlugin([
					{ context: 'src', from: '**/*', ignore: '*.ts' }
				]);
			}),
			...includeWhen(args.element, () => {
				return [ new webpack.optimize.CommonsChunkPlugin({
					name: 'widget-core',
					filename: 'widget-core.js'
				}) ];
			}),
			...includeWhen(!args.watch && !args.withTests, () => {
				return [ new webpack.optimize.UglifyJsPlugin({
					sourceMap: true,
					compress: { warnings: false },
					exclude: /tests[/]/
				}) ];
			}),
			includeWhen(args.element, args => {
				return new HtmlWebpackPlugin({
					inject: false,
					template: path.join(__dirname, 'templates/custom-element.html'),
					filename: `${args.elementPrefix}.html`
				});
			}, () => {
				return new HtmlWebpackPlugin({
					inject: true,
					chunks: [ 'src/main' ],
					template: 'src/index.html'
				});
			}),
			...includeWhen(!args.watch && !args.withTests, () => {
				return [
					new BundleAnalyzerPlugin({
						analyzerMode: 'static',
						openAnalyzer: false,
						reportType: 'sunburst'
					})
				];
			}),
			...includeWhen(args.withTests, () => {
				return [
					new CopyWebpackPlugin([
						{context: 'tests', from: '**/*', ignore: '*.ts', to: '../_build/tests' }
					]),
					new HtmlWebpackPlugin ({
						inject: true,
						chunks: [ '../_build/src/main' ],
						template: 'src/index.html',
						filename: '../_build/src/index.html'
					})
				];
			}),
			...includeWhen(includesExternals, () => [
				new ExternalLoaderPlugin({
					dependencies: externalDependencies,
					outputPath: args.externals && args.externals.outputPath,
					pathPrefix: args.withTests ? '../_build/src' : ''
				})
			])

		],
		output: {
			libraryTarget: 'umd',
			library: '[name]',
			umdNamedDefine: true,
			path: includeWhen(args.element, args => {
				return path.resolve(`./dist/${args.elementPrefix}`);
			}, () => {
				return path.resolve('./dist');
			}),
			filename: '[name].js',
			chunkFilename: '[name].js'
		},
		devtool: 'source-map',
		resolve: {
			modules: [
				basePath,
				path.join(basePath, 'node_modules')
			],
			extensions: ['.ts', '.tsx', '.js']
		},
		resolveLoader: {
			modules: [
				path.join(isCLI ? __dirname : 'node_modules/@dojo/cli-build-webpack', 'loaders'),
				path.join(__dirname, 'node_modules'),
				'node_modules' ]
		},
		module: {
			rules: [
				...includeWhen(tslintExists, () => {
					return [
						{
							test: /\.ts$/,
							enforce: 'pre',
							loader: 'tslint-loader',
							options: {
								tsConfigFile: path.join(basePath, 'tslint.json')
							}
						}
					];
				}),
				{ test: /@dojo\/.*\.js$/, enforce: 'pre', loader: 'source-map-loader-cli', options: { includeModulePaths: true } },
				{ test: /src[\\\/].*\.ts?$/, enforce: 'pre', loader: 'css-module-dts-loader?type=ts&instanceName=0_dojo' },
				{ test: /src[\\\/].*\.m\.css?$/, enforce: 'pre', loader: 'css-module-dts-loader?type=css' },
				{ test: /src[\\\/].*\.ts(x)?$/, use: [
					getUMDCompatLoader({ chunks: args.chunks }),
					{
						loader: 'ts-loader',
						options: {
							instance: 'dojo'
						}
					}
				]},
				{ test: new RegExp(`globalize(\\${path.sep}|$)`), loader: 'imports-loader?define=>false' },
				{ test: /\.js?$/, use: [ getUMDCompatLoader({ chunks: args.chunks }) ] },
				...includeWhen(!args.element, () => {
					return [
						{ test: /\.html$/, loader: 'html-loader' }
					];
				}),
				{ test: /.*\.(gif|png|jpe?g|svg|eot|ttf|woff|woff2)$/i, loader: 'file-loader?hash=sha512&digest=hex&name=[hash:base64:8].[ext]' },
				{ test: /\.css$/, exclude: /src[\\\/].*/, loader: cssLoader },
				{ test: /src[\\\/].*\.css?$/, loader: cssModuleLoader },
				{ test: /\.m\.css.js$/, exclude: /src[\\\/].*/, use: ['json-css-module-loader'] },
				...includeWhen(args.withTests, () => {
					return [
						{ test: /tests[\\\/].*\.ts?$/, use: [
							getUMDCompatLoader({ chunks: args.chunks }),
							{
								loader: 'ts-loader',
								options: {
									instance: 'dojo'
								}
							}
						] }
					];
				}),
				...includeWhen(args.element, args => {
					return [
						{ test: /custom-element\.js/, loader: `imports-loader?widgetFactory=${args.element}` }
					];
				})
			]
		}
	};

	if (args.debug) {
		config.profile = true;
	}

	return config;
}

module.exports = isCLI ? webpackConfig : webpackConfig({});
