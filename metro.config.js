const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable Metro's experimental tree shaking
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
    compress: {
      drop_console: true, // Remove console.log statements in production
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.warn', 'console.info'],
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Improve bundle size with inline requires
    },
  }),
};

module.exports = config;
