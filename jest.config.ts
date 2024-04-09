import { pathsToModuleNameMapper } from 'ts-jest';
import type { Config } from 'jest';

import { compilerOptions } from './tsconfig.json';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/test/**/?(*.)+(spec|test).[jt]s?(x)'],
    roots: ['<rootDir>'],
    modulePaths: [compilerOptions.baseUrl],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    globalSetup: './test-utils/globalSetup.ts',
    globalTeardown: './test-utils/globalTeardown.ts'
};

export default config;
