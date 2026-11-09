
const DB_NAME = "between-two-worlds-gallery";
const STORE_NAME = "images";
const PAGE_SIZE = 10;

let galleryItems = [];
let currentPage = 1;
let objectUrls = [];

const downloadIcon = `
<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 3.75v10.5m0 0 4-4m-4 4-4-4M5 16.5v2.25c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5V16.5"
  stroke="currentColor" stroke-width="1.7"
  stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return resolve(null);

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getUploadedImages() {
  const db = await openDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

async function buildGalleryItems() {
  const response = await fetch("./data/media.json");

  if (!response.ok) {
    throw new Error("Could not load media.");
  }

  const items = await response.json();

  // Only images marked SFW are included.
  let images = items.filter(item =>
    item.type === "image" &&
    item.safety === "sfw"
  );

  try {
    const uploads = await getUploadedImages();

    uploads.forEach((item, index) => {
      const src = URL.createObjectURL(item.blob);
      objectUrls.push(src);

      if ((item.safety || "sfw") === "sfw") {
        images.push({
          id: item.id || `upload-${index}`,
          src,
          name: item.filename || `upload-${index + 1}`,
          type: "image",
          safety: "sfw",
          uploaded: true
        });
      }
    });
  } catch (error) {
    console.warn("Could not load browser uploads:", error);
  }

  // Shuffle once per page visit.
  return shuffle(images);
}

function makeDownloadButton(item) {
  const button = document.createElement("button");

  button.className = "download-button";
  button.type = "button";
  button.innerHTML = downloadIcon;
  button.setAttribute("aria-label", `Download ${item.name}`);
  button.title = "Download";

  button.addEventListener("click", () => {
    downloadMedia(item.src, item.name);
  });

  return button;
}

function renderGallery() {
  const grid = document.getElementById("mediaGrid");
  const count = document.getElementById("resultsCount");
  const empty = document.getElementById("emptyState");
  const pagination = document.getElementById("pagination");

  if (!grid) return;

  const totalItems = galleryItems.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  // Keep current page within valid limits.
  currentPage = Math.min(currentPage, Math.max(1, totalPages));

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = galleryItems.slice(start, start + PAGE_SIZE);

  grid.replaceChildren();

  pageItems.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "media-card";

    const img = document.createElement("img");

    img.src = item.src;
    img.alt = item.name;
    img.loading = index < 4 ? "eager" : "lazy";
    img.decoding = "async";

    img.addEventListener("error", () => card.remove(), { once: true });

    card.append(img, makeDownloadButton(item));
    grid.appendChild(card);
  });

  count.textContent = totalItems
    ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, totalItems)} of ${totalItems} images`
    : "0 images";

  empty.hidden = totalItems !== 0;

  renderPagination(totalPages, pagination);
}

function renderPagination(totalPages, container) {
  container.replaceChildren();

  if (totalPages <= 1) return;

  function createButton(label, page, disabled = false, active = false) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.className = active ? "page-button active" : "page-button";

    if (active) button.setAttribute("aria-current", "page");

    button.addEventListener("click", () => {
      currentPage = page;
      renderGallery();

      document.getElementById("gallery")
        .scrollIntoView({ behavior: "smooth" });
    });

    return button;
  }

  container.append(
    createButton("Previous", currentPage - 1, currentPage === 1)
  );

  for (let page = 1; page <= totalPages; page++) {
    container.append(
      createButton(
        String(page),
        page,
        false,
        page === currentPage
      )
    );
  }

  container.append(
    createButton("Next", currentPage + 1, currentPage === totalPages)
  );
}

async function downloadMedia(url, filename) {
  try {
    const response = await fetch(url);

    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectURL;
    link.download = filename || "gallery-image";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectURL), 1500);

  } catch (error) {
    const link = document.createElement("a");

    link.href = url;
    link.download = filename || "";
    link.target = "_blank";
    link.rel = "noopener";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    galleryItems = await buildGalleryItems();
    renderGallery();
  } catch (error) {
    console.error(error);

    document.getElementById("emptyState").hidden = false;
    document.getElementById("emptyState").textContent =
      "Unable to load images.";
  }
});
