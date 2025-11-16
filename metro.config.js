const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

const { assetExts, sourceExts } = config.resolver;

config.resolver = {
  ...config.resolver,
  assetExts: assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: Array.from(new Set([...sourceExts, 'svg', 'css'])),
};

module.exports = config;
