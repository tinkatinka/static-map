module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testTimeout: 60000,
	testPathIgnorePatterns: ['<rootDir>/(.*build|dist|node_modules)/']
};
