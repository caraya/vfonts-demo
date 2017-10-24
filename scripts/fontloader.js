(function () {
  'use strict';
   // Load the font(s)
  const roboto = new FontFaceObserver('roboto-vf');
  const robotoItalic = new FontFaceObserver("roboto-vf-italic");
  const amstelvar = new FontFaceObserver('amstelvar-vf');
  const decovar = new FontFaceObserver('decovar-vf');

  // Capture a variable for the document element
  const html = document.documentElement;

  // Add 'fonts-loading' class
  html.classList.add('fonts-loading');

  // load fonts
  Promise.all([
    roboto.load(),
    robotoItalic.load(),
    amstelvar.load(),
    decovar.load(),
  ])
    .then(() => {
      // If they load switch class to fonts-loaded and
      // log success to console
      html.classList.remove('fonts-loading');
      html.classList.add('fonts-loaded');
      console.log('All fonts have loaded.');
    }).catch(() => {
      // If they fail to load switch class to fonts-failed
      // and log failure to console
      html.classList.remove('fonts-loading');
      html.classList.add('fonts-failed');
      console.log('One or more fonts failed to load');
    });
}());
