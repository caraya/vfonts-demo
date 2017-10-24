module.exports = {
  'globDirectory': './',
  'globPatterns': [
    'index.html',
    'styles/type/RobotoUpright-VF.ttf',
    'styles/type/RobotoItalic-VF.ttf',
    'styles/main.css',
    'styles/robotovf.css',
    'styles/prism.css',
    'scripts/fontloader.js',
    'scripts/vendor/clipboard.min.js',
    'scripts/vendor/fontfaceobserver.js',
    'scripts/vendor/prism.js',
  ],
  'swSrc': 'src/sw.js',
  'swDest': './sw.js',
  'globIgnores': [
    'workbox-cli-config.js',
    'node_modules/**/*',
    'sw.js',
  ],
};
