// Alternatively, use your own local copy of workbox-sw.prod.vX.Y.Z.js
importScripts('https://unpkg.com/workbox-sw@0.0.1');

const workboxSW = new goog.SWLib();
// Pass in an empty array for our dev environment service worker.
// As part of the production build process, the `service-worker`
// gulp task will automatically replace the empty array with the
// current the precache manifest.
workboxSW.precache([]);

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

```

The modified service worker takes a different approach than what we saw before using `workbox-build`. Innstead of building the manifest directly, it injects the list of files in the manifest into the service worker. Remember that we put an empty array on the precache section of the service worker. This is the task that will populate the empty array with the files we need to precache. 

And the best part is that, if we missed anythhing, the files will be cached at run time. Not optimal but we will not loose any content. 

```javascript
gulp.task('service-worker', () => {
  return workboxBuild.injectManifest({
    swSrc: 'src/service-worker.js',
    swDest: '_site/service-worker.js',
    globDirectory: '_site',
    staticFileGlobs: [
      'rev/js/**/*.js',
      'rev/styles/*.css',
      'images/**/*'
    ]
  });
});
