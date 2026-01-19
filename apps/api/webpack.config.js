const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },

  // ✅ Make node_modules external EXCEPT our workspace libs
  externals: [
    ({ request }, callback) => {
      // bundle workspace libs
      if (/^@shopit\//.test(request)) {
        return callback(); // NOT external -> bundle it
      }

      // externalize everything else (node_modules)
      if (
        request &&
        !request.startsWith('.') &&
        !request.startsWith('/') &&
        !request.startsWith('webpack/')
      ) {
        return callback(null, 'commonjs ' + request);
      }

      callback();
    },
  ],

  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
