import { Command, Helper } from 'dojo-cli/interfaces';
import { Argv } from 'yargs';
const webpack: any = require('webpack');
const WebpackDevServer: any = require('webpack-dev-server');
const config: any = require('./webpack.config');

interface BuildArgs extends Argv {
	watch: boolean;
	test: boolean;
	port: number;
}

interface WebpackOptions {
	compress: boolean;
	stats: {
		colors: boolean
		chunks: boolean
	};
}

function runTests(stats: any, helper: Helper) {
	if (helper.command.exists('test')) {
		const args = { functional: true };
		return helper.command.run('test', undefined, <any> args);
	} else {
		console.log('no test command found');
	}
}

function watch(config: any, options: WebpackOptions, args: BuildArgs, helper: Helper): Promise<any> {
	config.devtool = 'eval-source-map';

	const webpackConfig = config({ test: args.test });

	webpackConfig.entry['src/main'].unshift('webpack-dev-server/client?');
	console.log(webpackConfig.entry);

	if (args.test) {
		webpackConfig.plugins.push({
			apply: (compiler: any) => {
				compiler.plugin('done', (stats: any) => runTests(stats, helper));
			}
		});
	}

	const compiler = webpack(webpackConfig);
	const server = new WebpackDevServer(compiler, options);

	return new Promise((resolve, reject) => {
		const port = args.port || 9999;
		server.listen(port, '127.0.0.1', (err: Error) => {
			console.log(`Starting server on http://localhost:${port}`);
			if (err) {
				reject(err);
				return;
			}
		});
	});
}

function compile(config: any, options: WebpackOptions, args: BuildArgs, helper: Helper): Promise<any> {
	const webpackConfig = config({ test: args.test });
	if (args.test) {
		webpackConfig.plugins.push({
			apply: (compiler: any) => {
				compiler.plugin('done', (stats: any) => runTests(stats, helper));
			}
		});
	}
	const compiler = webpack(webpackConfig);
	return new Promise((resolve, reject) => {
		compiler.run((err: any, stats: any) => {
			if (err) {
				reject(err);
				return;
			}
			console.log(stats.toString(options.stats));
			if (args.test) {
				return runTests(stats, helper);
			}
			else {
				resolve();
			}
		});
	});
}

const command: Command = {
	description: 'create a build of your application',
	register(helper: Helper) {
		helper.yargs.option('w', {
			alias: 'watch',
			describe: 'watch and serve'
		});

		helper.yargs.option('t', {
			alias: 'test',
			describe: 'include test files. when watching, tests will automatically run'
		});

		helper.yargs.option('p', {
			alias: 'port',
			describe: 'port to serve on when using --watch',
			type: 'number'
		});

		return helper.yargs;
	},
	run(helper: Helper, args: BuildArgs) {
		const options: WebpackOptions = {
			compress: true,
			stats: {
				colors: true,
				chunks: false
			}
		};

		if (args.watch) {
			return watch(config, options, args, helper);
		}
		else {
			return compile(config, options, args, helper);
		}
	}
};
export default command;
