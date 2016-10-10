import { beforeEach, afterEach, describe, it } from 'intern!bdd';
import * as assert from 'intern/chai!assert';
import MockModule from '../support/util';
import * as sinon from 'sinon';

describe('it should do something', () => {

	let moduleUnderTest: any;
	let mockModule: MockModule;
	let mockWebpack: any;
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		mockModule = new MockModule('../../src/main');
		mockModule.dependencies(['./webpack.config.prod', 'webpack', 'webpack-dev-server']);
		mockWebpack = mockModule.getMock('webpack');
		moduleUnderTest = mockModule.getModuleUnderTest().default;
		sandbox.stub(console, 'log');
	});

	afterEach(() => {
		sandbox.restore();
		mockModule.destroy();
	});

	it('should run compile and log results on success', () => {
		const run = sandbox.stub().yields(false, 'some stats');
		mockWebpack.ctor.returns({ run });

		return moduleUnderTest.run({}, {}).then(() => {
			assert.isTrue(run.calledOnce);
			assert.isTrue((<any> console.log).calledWith('some stats'));
		});
	});

	it('should run compile and reject on failure', () => {
		const compilerError = new Error('compiler error');
		const run = sandbox.stub().yields(compilerError, null);
		mockWebpack.ctor.returns({ run });

		return moduleUnderTest.run({}, {}).then(
			() => {
				throw new Error('unexpected path');
			},
			(e: Error) => {
				assert.isTrue(run.calledOnce);
				assert.equal(e, compilerError);
			}
		);

	});
});
