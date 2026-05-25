import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/__mocks__/vscode.ts',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json',
        }],
    },
    clearMocks: true,
};

export default config;
