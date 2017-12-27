const config = {
	out: '../docs',
	mode: 'modules',
	module: 'commonjs',
	target: 'ES2017',
	name: 'Userstate manager',
	readme: '../README.md',
	includeDeclarations: true,
	ignoreCompilerErrors: true,
	excludeNotExported: true,
	excludeExternals: true,
	exclude: '**/*.test.*',
};

module.exports = config;
