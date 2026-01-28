import type { StorybookConfig } from '@storybook/react-webpack5';
import type { Configuration, RuleSetRule } from 'webpack';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: true,
  },
  staticDirs: ['../../../../apps/web/public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  webpackFinal: async (webpackConfig: Configuration) => {
    const rules = webpackConfig.module?.rules as RuleSetRule[];
    
    // Remove existing babel-loader rules for tsx/jsx
    const filteredRules = rules.filter((rule) => {
      if (rule && typeof rule === 'object' && rule.test) {
        const testStr = rule.test.toString();
        if (testStr.includes('tsx') || testStr.includes('jsx')) {
          return false;
        }
      }
      return true;
    });

    // Remove existing CSS rules to replace with PostCSS-enabled ones
    const rulesWithoutCss = filteredRules.filter((rule) => {
      if (rule && typeof rule === 'object' && rule.test) {
        const testStr = rule.test.toString();
        if (testStr.includes('.css')) {
          return false;
        }
      }
      return true;
    });

    if (webpackConfig.module) {
      webpackConfig.module.rules = [
        ...rulesWithoutCss,
        // Add SWC loader for TypeScript/JSX
        {
          test: /\.(tsx?|jsx?)$/,
          exclude: /node_modules/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: false,
                  },
                },
              },
            },
          },
        },
        // Add CSS rule with PostCSS for Tailwind
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  config: path.resolve(__dirname, '../postcss.config.js'),
                },
              },
            },
          ],
        },
      ];
    }

    return webpackConfig;
  },
};

export default config;
