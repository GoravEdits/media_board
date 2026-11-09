const DB_NAME = "between-two-worlds-gallery";
const STORE_NAME = "images";
const state = { safety: "all", type: "all", shuffled: false };
let galleryItems = [];
let objectUrls = [];

const downloadIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.75v10.5m0 0 4-4m-4 4-4-4M5 16.5v2.25c0 .83.67 1.5 1.5 1.5h11c.83 0 1.5-.67 1.5-1.5V16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getUploadedImages() {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
async function buildGalleryItems() {
  const response = await fetch("./data/media.json");

  if (!response.ok) {
    throw new Error("Could not load media.");
  }

  const items = await response.json();

  try {
    const uploads = await getUploadedImages();

    uploads.forEach((item, index) => {
      const src = URL.createObjectURL(item.blob);
      objectUrls.push(src);

      items.push({
        id: item.id || `upload-${index}`,
        src,
        name: item.filename || `upload-${index + 1}`,
        type: "image",
        safety: item.safety || "sfw",
        uploaded: true
      });
    });
  } catch (error) {
    console.warn("Could not load browser uploads:", error);
  }

  return items;
}

function filteredItems() {
  return galleryItems.filter(item =>
    (state.safety === "all" || item.safety === state.safety) &&
    (state.type === "all" || item.type === state.type)
  );
}

function sortedItems(items) {
  const sort = document.getElementById("sortSelect")?.value || "default";
  if (state.shuffled) return items;
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  if (sort === "name-asc") return items.sort(byName);
  if (sort === "name-desc") return items.sort((a, b) => byName(b, a));
  if (sort === "newest") return items.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  if (sort === "oldest") return items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return items;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function makeDownloadButton(item) {
  const button = document.createElement("button");
  button.className = "download-button";
  button.type = "button";
  button.innerHTML = downloadIcon;
  button.setAttribute("aria-label", `Download ${item.type}`);
  button.title = "Download";
  button.addEventListener("click", () => downloadMedia(item.src, item.name));
  return button;
}

function renderGallery() {
  const grid = document.getElementById("mediaGrid");
  const count = document.getElementById("resultsCount");
  const empty = document.getElementById("emptyState");
  if (!grid) return;

  let items = filteredItems();
  if (state.shuffled) items = shuffle(items);
  else items = sortedItems(items);

  grid.replaceChildren();
  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "media-card";

    let media;
    if (item.type === "video") {
      media = document.createElement("video");
      media.controls = true;
      media.preload = "metadata";
      media.playsInline = true;
      media.setAttribute("aria-label", "Gallery video");
    } else {
      media = document.createElement("img");
      media.alt = "Gallery image";
      media.loading = index < 4 ? "eager" : "lazy";
      media.decoding = "async";
    }
    media.src = item.src;
    media.addEventListener("error", () => card.remove(), { once: true });
    card.append(media, makeDownloadButton(item));
    grid.appendChild(card);
  });

  count.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  empty.hidden = items.length !== 0;
}

async function downloadMedia(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectURL;
    link.download = filename || "gallery-media";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectURL), 1500);
  } catch (error) {
    // Direct same-origin download fallback (also works when fetch is blocked).
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

function setupControls() {
  document.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      state[filter] = button.dataset.value;
      document.querySelectorAll(`.filter-chip[data-filter="${filter}"]`).forEach(chip => {
        const active = chip === button;
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
      state.shuffled = false;
      renderGallery();
    });
  });

  document.getElementById("sortSelect")?.addEventListener("change", () => {
    state.shuffled = false;
    renderGallery();
  });

  document.getElementById("shuffleButton")?.addEventListener("click", () => {
    state.shuffled = true;
    renderGallery();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupControls();
  galleryItems = await buildGalleryItems();
  renderGallery();
});
