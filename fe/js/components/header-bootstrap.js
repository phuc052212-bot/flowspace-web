/** Initializes Header-only components after the DOM and authenticated session are ready. */
(function (FS, $) {
  'use strict';

  $(function () {
    if (!FS.auth?.isLoggedIn()) return;

    FS.headerSearch?.init();
    FS.notificationCenter?.init();
    FS.userProfileMenu?.init();
  });
})(window.FS = window.FS || {}, jQuery);
