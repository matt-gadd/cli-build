module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticDistFiles: { src: 'src/webpack.config.prod.js', dest: 'dist/umd/webpack.config.prod.js' },
			staticDevFiles: { src: 'src/webpack.config.prod.js', dest: '_build/src/webpack.config.prod.js' }
		}
	});

	grunt.registerTask('ci', [
		'intern:node'
	]);

	grunt.registerTask('dist', grunt.config.get('distTasks').concat(['copy:staticDistFiles']));
	grunt.registerTask('dev', grunt.config.get('devTasks').concat(['copy:staticDevFiles']));
};
