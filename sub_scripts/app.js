(function ($, window, document) {
  "use strict";

  // --------------------------------------------------
  // Configuration
  // --------------------------------------------------

  const DB_NAME = "between-two-worlds-gallery";
  const STORE_NAME = "images";
  const PAGE_SIZE = 10;

  let galleryItems = [];
  let currentPage = 1;
  const objectUrls = [];

  const downloadIcon = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 3.75v10.5m0 0 4-4m-4 4-4-4M5 16.5v2.25c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5V16.5"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    `;

  // --------------------------------------------------
  // IndexedDB
  // --------------------------------------------------

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!("indexedDB" in window)) {
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = function () {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function getUploadedImages() {
    return openDB().then(function (db) {
      if (!db) {
        return [];
      }

      return new Promise(function (resolve, reject) {
        const transaction = db.transaction(
          STORE_NAME,
          "readonly"
        );

        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = function () {
          resolve(request.result || []);
        };

        request.onerror = function () {
          reject(request.error);
        };
      });
    });
  }

  // --------------------------------------------------
  // Utility functions
  // --------------------------------------------------

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
  }

  // --------------------------------------------------
  // Load gallery data
  // --------------------------------------------------

  function loadMediaJSON() {
    return $.ajax({
      url: "./data/media.json",
      method: "GET",
      dataType: "json",
      cache: true
    });
  }

  function buildGalleryItems() {
    return loadMediaJSON().then(function (items) {
      if (!Array.isArray(items)) {
        throw new Error("Invalid media data.");
      }

      // Only include images marked SFW.
      const images = items.filter(function (item) {
        return (
          item &&
          item.type === "image" &&
          item.safety === "sfw" &&
          typeof item.src === "string"
        );
      });

      return getUploadedImages()
        .then(function (uploads) {
          uploads.forEach(function (item, index) {
            if (!item || !item.blob) {
              return;
            }

            const safety = item.safety || "sfw";

            if (safety !== "sfw") {
              return;
            }

            const src = URL.createObjectURL(item.blob);

            objectUrls.push(src);

            images.push({
              id: item.id || `upload-${index}`,
              src: src,
              name: item.filename || `upload-${index + 1}`,
              type: "image",
              safety: "sfw",
              uploaded: true
            });
          });

          // Shuffle once per page visit.
          return shuffle(images);
        })
        .catch(function (error) {
          console.warn(
            "Could not load browser uploads:",
            error
          );

          // Keep the normal gallery working if IndexedDB fails.
          return shuffle(images);
        });
    });
  }

  // --------------------------------------------------
  // Download functionality
  // --------------------------------------------------

  function downloadMedia(url, filename) {
    $.ajax({
      url: url,
      method: "GET",
      xhrFields: {
        responseType: "blob"
      }
    })
      .done(function (blob) {
        try {
          const objectURL = URL.createObjectURL(blob);

          const $link = $("<a>", {
            href: objectURL,
            download: filename || "gallery-image"
          });

          $("body").append($link);

          $link[0].click();
          $link.remove();

          window.setTimeout(function () {
            URL.revokeObjectURL(objectURL);
          }, 1500);

        } catch (error) {
          console.error("Blob download failed:", error);
          fallbackDownload(url, filename);
        }
      })
      .fail(function () {
        fallbackDownload(url, filename);
      });
  }

  function fallbackDownload(url, filename) {
    const $link = $("<a>", {
      href: url,
      download: filename || "",
      target: "_blank",
      rel: "noopener"
    });

    $("body").append($link);

    $link[0].click();
    $link.remove();
  }

  // --------------------------------------------------
  // Gallery card creation
  // --------------------------------------------------

  function makeDownloadButton(item) {
    const $button = $("<button>", {
      type: "button",
      class: "download-button",
      title: "Download",
      "aria-label": "Download " + item.name
    });

    $button.html(downloadIcon);

    // Store the item on the button for delegated click handling.
    $button.data("galleryItem", item);

    return $button;
  }

  function makeMediaCard(item, index) {
    const $card = $("<article>", {
      class: "media-card"
    });

    const $image = $("<img>", {
      alt: item.name,
      loading: index < 4 ? "eager" : "lazy",
      decoding: "async"
    });

    // Remove the card if its image cannot be loaded.
    $image.on("error", function () {
      $card.remove();
    });

    $image.attr("src", item.src);

    $card.append(
      $image,
      makeDownloadButton(item)
    );

    return $card;
  }

  // --------------------------------------------------
  // Pagination button creation
  // --------------------------------------------------

  function makePageButton(label, page, disabled, active) {
    const $button = $("<button>", {
      type: "button",
      class: active ? "page-button active" : "page-button",
      text: label,
      disabled: Boolean(disabled)
    });

    if (active) {
      $button.attr("aria-current", "page");
    }

    $button.data("page", page);

    return $button;
  }

  function renderPagination(totalPages) {
    const $pagination = $("#pagination");

    $pagination.empty();

    if (totalPages <= 1) {
      return;
    }

    // Previous button.
    $pagination.append(
      makePageButton(
        "Previous",
        currentPage - 1,
        currentPage === 1,
        false
      )
    );

    // Numbered page buttons.
    for (let page = 1; page <= totalPages; page++) {
      $pagination.append(
        makePageButton(
          String(page),
          page,
          false,
          page === currentPage
        )
      );
    }

    // Next button.
    $pagination.append(
      makePageButton(
        "Next",
        currentPage + 1,
        currentPage === totalPages,
        false
      )
    );
  }

  // --------------------------------------------------
  // Render gallery
  // --------------------------------------------------

  function renderGallery() {
    const $grid = $("#mediaGrid");
    const $count = $("#resultsCount");
    const $empty = $("#emptyState");

    if (!$grid.length) {
      return;
    }

    const totalItems = galleryItems.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    // Keep current page within valid limits.
    currentPage = Math.min(
      currentPage,
      Math.max(1, totalPages)
    );

    const start = (currentPage - 1) * PAGE_SIZE;

    const pageItems = galleryItems.slice(
      start,
      start + PAGE_SIZE
    );

    // Clear previous gallery content.
    $grid.empty();

    // Create and append gallery cards.
    $.each(pageItems, function (index, item) {
      $grid.append(
        makeMediaCard(item, index)
      );
    });

    // Update result count.
    if (totalItems > 0) {
      $count.text(
        "Showing " +
        (start + 1) +
        "–" +
        Math.min(start + PAGE_SIZE, totalItems) +
        " of " +
        totalItems +
        " images"
      );
    } else {
      $count.text("0 images");
    }

    // Show or hide empty state.
    $empty.prop("hidden", totalItems !== 0);

    renderPagination(totalPages);
  }

  // --------------------------------------------------
  // jQuery event handlers
  // --------------------------------------------------

  function bindEvents() {

    // Download button.
    $(document).on(
      "click",
      ".download-button",
      function () {
        const item = $(this).data("galleryItem");

        if (!item || !item.src) {
          console.error("Invalid gallery item for download.");
          return;
        }

        downloadMedia(item.src, item.name);
      }
    );

    // Pagination buttons.
    $(document).on(
      "click",
      ".page-button:not(:disabled)",
      function () {
        const page = Number($(this).data("page"));

        if (!Number.isInteger(page)) {
          return;
        }

        currentPage = page;

        renderGallery();

        const $gallery = $("#gallery");

        if ($gallery.length) {
          $("html, body").stop(true).animate(
            {
              scrollTop: $gallery.offset().top
            },
            500
          );
        }
      }
    );
  }

  // --------------------------------------------------
  // Initialize application
  // --------------------------------------------------

  function showLoadError(error) {
    console.error("Gallery loading error:", error);

    $("#emptyState")
      .text("Unable to load images.")
      .prop("hidden", false);

    $("#resultsCount").text("");
    $("#mediaGrid").empty();
    $("#pagination").empty();
  }

  $(function () {
    bindEvents();

    buildGalleryItems()
      .then(function (items) {
        galleryItems = items;
        renderGallery();
      })
      .catch(showLoadError);
  });

})(jQuery, window, document);