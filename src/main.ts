import { Command, Helper } from 'dojo-cli/interfaces';
import { Argv } from 'yargs';

export interface BuildArgs extends Argv {
	watch: boolean;
	port: number;
}

const command: Command = {
	description: 'create a build of your application',
	register(helper) {
		helper.yargs.option('w', {
			alias: 'watch',
			describe: 'watch and serve'
		});

		helper.yargs.options('p', {
			alias: 'port',
			describe: 'port to serve on when using --serve',
			type: 'number'
		});

		return helper.yargs;
	},
	run(helper: Helper, args: BuildArgs) {
		const webpack: any = require('webpack');
		const path: any = require('path');
		const WebpackDevServer: any = require('webpack-dev-server');
		const config: any = require('./webpack.config.prod.js');

		const options = {
			stats: {
				colors: true,
				chunks: false
			}
		};

		if (args.watch) {
			config.devtool = 'eval-source-map';
			config.entry.unshift(path.join(__dirname, 'node_modules', 'webpack-dev-server/client?'));
		}

		const compiler = webpack(config);

		if (args.watch) {
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
		} else {
			return new Promise((resolve, reject) => {
				compiler.run((err: any, stats: any) => {
					if (err) {
						reject(err);
						return;
					}
					console.log(stats.toString(options.stats));
					resolve({});
				});
			});
		}
	}
};

export default command;
