const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Only watch shared-types in the monorepo to avoid crawling all server/web node_modules
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/shared-types'),
];

// 2. Let Metro resolve modules in both mobile/node_modules and root/node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
