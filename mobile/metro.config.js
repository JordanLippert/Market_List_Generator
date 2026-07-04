const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the shared/ folder so Metro picks up catalog.json changes.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../shared')
];

module.exports = config;
