import process from 'node:process';
import { rspack } from '@rspack/core';

const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  global: {
    cwd: __dirname,
    clear: ['dist'],
    copy: {},
    node: {
      rootOutPath: 'dist/',
      packerConfig: {
        node: {
          __dirname: false,
          __filename: false,
          global: true,
        },
        optimization: {
          moduleIds: 'named',
        },
        externals: [],
        ignoreWarnings: [],
        resolve: {
          extensions: ['.js', '.ts', '.json'],
        },
        output: {
          clean: true,
        },
        plugins: [
          isDev &&
          new rspack.CopyRspackPlugin({
            patterns: [{ from: './config.yaml' }],
          }),
        ],
      },
    },
  },
  server: {
    packerConfig: {},
  },
  entries: {
    server: {
      type: 'node',
      name: 'server',
      output: {
        fileName: 'main.js',
        filePath: 'dist',
      },
      input: 'src/main.ts',
    },
  },
};
