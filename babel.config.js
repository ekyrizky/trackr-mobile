module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './',
            '@components': './components',
            '@screens': './screens',
            '@services': './services',
            '@contexts': './contexts',
            '@hooks': './hooks',
            '@types': './types',
            '@utils': './utils',
            '@constants': './constants',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};