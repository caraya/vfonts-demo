// Alternatively, use your own local copy of workbox-sw.prod.vX.Y.Z.js
importScripts('workbox-sw.prod.v2.1.0.js');

const workboxSW = new goog.SWLib();
// Pass in an empty array for our dev environment service worker.
// As part of the production build process, the `service-worker`
// gulp task will automatically replace the empty array with the
// current the precache manifest.
workboxSW.precache([
  {
    "url": "decovar.html",
    "revision": "84091a6a37be8603089b3071874adc61"
  },
  {
    "url": "eslintrc.js",
    "revision": "aa14a69fac2f22cbe32426f42b268171"
  },
  {
    "url": "index.html",
    "revision": "702e1cd06e6e6781d9109ccf6e57230e"
  },
  {
    "url": "offline.html",
    "revision": "c25b4949a324010a270d2a12b1f817f3"
  },
  {
    "url": "scripts/fontloader.js",
    "revision": "e6678741939510d27d39f4c42b6fc212"
  },
  {
    "url": "scripts/lazy-load-plain.js",
    "revision": "57bb58731b5edea2c6583cda37d815d3"
  },
  {
    "url": "scripts/lazy-load-video.js",
    "revision": "1a3dfb9cae8c92803931c6d4b799fd0c"
  },
  {
    "url": "scripts/lazy-load.js",
    "revision": "a60d47bc6105c1cfd274035ecc6718f5"
  },
  {
    "url": "scripts/load-fonts.js",
    "revision": "ae042d0dd488634af35417ffd6e16afd"
  },
  {
    "url": "scripts/menu.js",
    "revision": "2d47b05d3b2a798b3be4cc9c59c63a5f"
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
    "url": "scripts/vendor/fontfaceobserver.standalone.js",
    "revision": "a55c28dd5f5af6e46c5f6cbb9a9fd115"
  },
  {
    "url": "scripts/vendor/prism.js",
    "revision": "01ab7c4a7c518cafd2bc645d14b9d68e"
  },
  {
    "url": "src/sw.js",
    "revision": "165fe0749152cc6e17fa6834f401483a"
  },
  {
    "url": "styles/amstelvar.css",
    "revision": "1aeb2d6ff54cdcbaf18fcffcb4cc08e2"
  },
  {
    "url": "styles/decovar.css",
    "revision": "1ef0d4b056355fc5ad1cf4425adbcd78"
  },
  {
    "url": "styles/github.css",
    "revision": "16532625a6cad9e2bad1cf841aba1586"
  },
  {
    "url": "styles/image-load.css",
    "revision": "7498e8538d1e54e96389178c2c933c3c"
  },
  {
    "url": "styles/main.css",
    "revision": "24a3df003f3e0d7538d8c6a95b171195"
  },
  {
    "url": "styles/normalize.css",
    "revision": "500680071679b7858c9982ca7a70ceaa"
  },
  {
    "url": "styles/prism.css",
    "revision": "06ba4b6654ed4da068095bf8d0649754"
  },
  {
    "url": "styles/robotovf.css",
    "revision": "16d4812f252d242e3a067341ae750aa3"
  },
  {
    "url": "styles/type/AmstelvarAlpha-VF-dollar-jump.ttf",
    "revision": "cd80ffb81d9384661a11fb452a941620"
  },
  {
    "url": "styles/type/AmstelvarAlpha-VF.ttf",
    "revision": "cca98e17f0620cfb9d1c6bef641c2024"
  },
  {
    "url": "styles/type/AvenirNext_Variable.ttf",
    "revision": "ae2da921c8fcfc4214c9cf2834eb4b16"
  },
  {
    "url": "styles/type/DecovarAlpha-VF.ttf",
    "revision": "51a8bd142c09fd562a7a6a537d616532"
  },
  {
    "url": "styles/type/RobotoItalic-GX.ttf",
    "revision": "6579392145087f8a853eb81c3b5b23ce"
  },
  {
    "url": "styles/type/RobotoItalic-VF.ttf",
    "revision": "2a758f13a55b97cc18d55c41f4105e34"
  },
  {
    "url": "styles/type/RobotoUpright-GX.ttf",
    "revision": "45a29e6532390f7cf61fb438ced80ac5"
  },
  {
    "url": "styles/type/RobotoUpright-VF.ttf",
    "revision": "8b2f177b4b501170fcdf13769682c1a5"
  },
  {
    "url": "styles/utility-opentype.css",
    "revision": "213d3444f2d141e64cefc2027a83f505"
  },
  {
    "url": "styles/video-load.css",
    "revision": "7bbe790ce4ec2b643198fd8dfd64849e"
  },
  {
    "url": "workbox-sw.prod.v2.1.0.js",
    "revision": "e5f207838d7fd9c81835d5705a73cfa2"
  }
]);

// All navigation requests should be routed to the App Shell.
// since we're not using app shell it's commented out
// workboxSW.router.registerNavigationRoute('/');

// Use a cache first strategy for files from googleapis.com
workboxSW.router.registerRoute(
  new RegExp('.googleapis.com$'),
  workboxSW.strategies.cacheFirst({
    cacheName: 'googleapis',
    cacheExpiration: {
      // Expire after 3 days (expressed in seconds)
      maxAgeSeconds: 3 * 24 * 60 * 60
    }
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
      maxAgeSeconds: 30 * 24 * 60 * 60
    },
    // The images are returned as opaque responses, with a status of 0.
    // Normally these wouldn't be cached; here we opt-in to caching them.
    // If the image returns a satus 200 we cache it too
    cacheableResponse: {statuses: [0, 200]}
  })
);

// Match all .html and .html files use cacheFirst
workboxSW.router.registerRoute(
  new RegExp('/.html$|.htm$/'),
  workboxSW.strategies.cacheFirst({
    cacheName: 'content',
    cacheExpiration: {
      maxAgeSeconds: 1 * 24 * 60 * 60
    }
  })
);

// For video we use a network only strategy. We don't want to clog
// the cache with large video files
workboxSW.router.registerRoute(
  new RegExp('/.(?:youtube|vimeo).com$/'),
  workboxSW.strategies.networkOnly()
);

// The default route uses a cache first strategy
workboxSW.router.registerRoute('/*',
  workboxSW.strategies.cacheFirst()
);