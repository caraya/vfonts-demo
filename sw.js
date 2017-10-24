importScripts('scripts/workbox-sw.prod.v2.1.0.js');
// const workboxSW = new self.SWLib();
const workboxSW = new self.WorkboxSW();

// Pass in an empty array for our dev environment service worker.
// As part of the production build process, the `service-worker`
// gulp task will automatically replace the empty array with the
// current precache manifest.
workboxSW.precache([
  {
    "url": "index.html",
    "revision": "702e1cd06e6e6781d9109ccf6e57230e"
  },
  {
    "url": "styles/type/RobotoUpright-VF.ttf",
    "revision": "8b2f177b4b501170fcdf13769682c1a5"
  },
  {
    "url": "styles/type/RobotoItalic-VF.ttf",
    "revision": "2a758f13a55b97cc18d55c41f4105e34"
  },
  {
    "url": "styles/main.css",
    "revision": "24a3df003f3e0d7538d8c6a95b171195"
  },
  {
    "url": "styles/robotovf.css",
    "revision": "16d4812f252d242e3a067341ae750aa3"
  },
  {
    "url": "styles/prism.css",
    "revision": "06ba4b6654ed4da068095bf8d0649754"
  },
  {
    "url": "scripts/fontloader.js",
    "revision": "e6678741939510d27d39f4c42b6fc212"
  },
  {
    "url": "scripts/vendor/clipboard.min.js",
    "revision": "3e5e0fa949e0e7c5ed5fed7b4cc0ee00"
  },
  {
    "url": "scripts/vendor/fontfaceobserver.js",
    "revision": "12e030679994c1096167adc703666895"
  },
  {
    "url": "scripts/vendor/prism.js",
    "revision": "01ab7c4a7c518cafd2bc645d14b9d68e"
  }
]);

// Use a cache first strategy for files from googleapis.com
workboxSW.router.registerRoute(
  new RegExp('.googleapis.com$'),
  workboxSW.strategies.cacheFirst({
    cacheName: 'googleapis',
    cacheExpiration: {
      // Expire after 30 days (expressed in seconds)
      maxAgeSeconds: 30 * 24 * 60 * 60,
    },
  })
);

workboxSW.router.registerRoute(
  new RegExp('/.(?:ttf|otf|woff|woff2)$/'),
  workboxSW.strategies.cacheFirst({
    cacheName: 'fonts',
    cacheExpiration: {
      // Expire after 24 hours (expressed in seconds)
      maxAgeSeconds: 1 * 24 * 60 * 60,
    },
  })
);

// Use a cache-first strategy for the images
workboxSW.router.registerRoute(
  new RegExp('/.(?:png|gif|jpg)$/'),
  workboxSW.strategies.cacheFirst({
    cacheName: 'images',
    cacheExpiration: {
      // maximum 50 entries
      maxEntries: 50,
      // Expire after 30 days (expressed in seconds)
      maxAgeSeconds: 30 * 24 * 60 * 60,
    },
    // The images are returned as opaque responses, with a status of 0.
    // Normally these wouldn't be cached; here we opt-in to caching them.
    // If the image returns a satus 200 we cache it too
    cacheableResponse: {statuses: [0, 200]},
  })
);

// Match all .html and .html files use cacheFirst
workboxSW.router.registerRoute(
  new RegExp('/.html$|.htm$/'),
  workboxSW.strategies.cacheFirst({
    cacheName: 'content',
    cacheExpiration: {
      maxAgeSeconds: 1 * 24 * 60 * 60,
    },
  })
);

// For video we use a network only strategy. We don't want to clog
// the cache with large video files
workboxSW.router.registerRoute(
  new RegExp('/.(?:youtube|vimeo).com$/'),
  workboxSW.strategies.networkOnly()
);

// Local videos get the same treatment, only pull from the network
workboxSW.router.registerRoute(
  new RegExp('/.(?:mp4|webm|ogg)$/'),
  workboxSW.strategies.networkOnly()
);

// The default route uses a cache first strategy
workboxSW.router.registerRoute('/*',
  workboxSW.strategies.cacheFirst()
);
