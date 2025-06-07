// jest.config.js
module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts'],
    transform: {
        '^.+\\.(ts|js|mjs|html|svg)$': [
            'jest-preset-angular',
            {
                // These options were previously under 'globals.ts-jest'
                tsconfig: '<rootDir>/tsconfig.spec.json',
                stringifyContentPathRegex: '\\.(html|svg)$',
                // If you had any other ts-jest specific options, they would go here.
            },
        ],
    },
    transformIgnorePatterns: [
        // Ignore all node_modules except for the ones listed below
        'node_modules/(?!(?:jest-preset-angular|@angular|@ngneat|three|three-globe|lodash-es|kapsule)/)',
        // If you have other specific ES Module packages that fail, add them to the regex.
        // Example: 'node_modules/(?!(?:jest-preset-angular|@angular|@ngneat|three|three-globe|lodash-es|kapsule|your-other-esm-lib)/)',
    ],
    // The entire 'globals' block for 'ts-jest' is removed because its options are now
    // configured directly within the 'jest-preset-angular' transformer in the 'transform' section.
    coverageDirectory: './coverage', // Optional: for coverage reports
    // Other Jest configurations as needed
};
