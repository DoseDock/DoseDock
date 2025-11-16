module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@data': './src/data',
            '@types': './src/types/index.ts',
            '@engine': './src/engine',
            '@store': './src/store',
            '@utils': './src/utils',
            '@notifications': './src/notifications',
            '@device': './src/device',
            '@i18n': './src/i18n',
            '@theme': './src/theme',
            '@services': './src/services',
          },
        },
      ],
    ],
  };
};

