module.exports = {
  stories: ['./stories/**/*.stories.@(ts|tsx|js|jsx)'],
  staticDirs: [
    { from: '../AudioFlow/Assets', to: '/shared-assets' },
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: true,
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  webpackFinal: async (config) => {
    config.module.rules.push({
      test: /\.(ts|tsx|js|jsx)$/,
      include: [
        /\/\.storybook\//,
        /\/frontend\/components\//,
        /\/frontend\/lib\//,
      ],
      use: {
        loader: require.resolve('babel-loader'),
        options: {
          presets: [
            [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
            [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
            require.resolve('@babel/preset-typescript'),
          ],
        },
      },
    });

    return config;
  },
};
