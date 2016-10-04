module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			webpack: { src: 'src/webpack.config.prod.js', dest: 'dist/umd/webpack.config.prod.js' }
		}
	});

	grunt.registerTask('ci', [
		'intern:node'
	]);

	grunt.registerTask('dist', grunt.config.get('distTasks').concat(['copy:webpack']));
};
