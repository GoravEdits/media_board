(function ($) {
  "use strict";

  $(function () {
    // Smooth scrolling for links that point to an element on this page.
    $(document).on("click", 'a[href^="#"]', function (event) {
      const href = $(this).attr("href");

      // Ignore an empty anchor.
      if (!href || href === "#") {
        return;
      }

      let $target;

      try {
        $target = $(href);
      } catch (error) {
        return;
      }

      if ($target.length) {
        event.preventDefault();

        $("html, body").stop(true).animate(
          {
            scrollTop: $target.first().offset().top,
          },
          500,
        );
      }
    });
  });

// --------------------------------------------------
// Gallery entry and fullscreen
// --------------------------------------------------

window.enterGallery = function () {

    if (
        !document.fullscreenEnabled ||
        !document.documentElement.requestFullscreen
    ) {
        return Promise.reject(
            new Error("Fullscreen is not supported or permitted.")
        );
    }

    // This call must happen directly from the user's click.
    return document.documentElement.requestFullscreen()
        .then(function () {

            $("#galleryApp").prop("hidden", false);
            $("#warningFrame").remove();

        });

};


// Explicit fallback if fullscreen is unavailable.
window.enterGalleryWithoutFullscreen = function () {

    $("#galleryApp").prop("hidden", false);
    $("#warningFrame").remove();

};


// --------------------------------------------------
// Website bookmark functionality
// --------------------------------------------------

$("#bookmarkButton").on("click", function () {

    const isMac = /Mac|iPhone|iPad|iPod/i.test(
        navigator.platform
    );

    const shortcut = isMac ? "⌘ + D" : "Ctrl + D";

    const message =
        "Want to bookmark Gorav Edits?\n\n" +
        "Press " + shortcut +
        " on your keyboard to save this website " +
        "to your browser bookmarks.";

    alert(message);

});

})(jQuery);
