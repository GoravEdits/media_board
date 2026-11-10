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
})(jQuery);
