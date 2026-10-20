/**
 * SAMPADA BIRD - Koleksi Page Logic (koleksi.js)
 * Mengelola katalog: pencarian, filter kategori, rentang harga, ketersediaan stok,
 * pengurutan, serta sinkronisasi filter dengan URL (?kategori=...&q=...).
 */

const CatalogState = {
  search: "",
  category: "all",
  priceMin: null,
  priceMax: null,
  inStockOnly: false,
  sort: "newest"
};

/**
 * Mengecek apakah produk termasuk kategori tertentu (kategori utama atau tag)
 */
function productMatchesCategory(product, categoryId) {
  if (categoryId === "all") return true;
  if (product.category === categoryId) return true;
  return Array.isArray(product.tags) && product.tags.includes(categoryId);
}

/**
 * Mengembalikan daftar produk yang sudah difilter & diurutkan
 */
function getFilteredProducts() {
  const keyword = CatalogState.search.trim().toLowerCase();

  const result = PRODUCTS_DATA.filter((p) => {
    if (keyword) {
      const haystack = `${p.name} ${p.category} ${(p.tags || []).join(" ")}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    if (!productMatchesCategory(p, CatalogState.category)) return false;
    if (CatalogState.priceMin !== null && p.price < CatalogState.priceMin) return false;
    if (CatalogState.priceMax !== null && p.price > CatalogState.priceMax) return false;
    if (CatalogState.inStockOnly && p.stock <= 0) return false;
    return true;
  });

  const sorters = {
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    "name-asc": (a, b) => a.name.localeCompare(b.name, "id")
  };
  result.sort(sorters[CatalogState.sort] || sorters.newest);

  // Produk yang stoknya habis selalu ditaruh di akhir
  result.sort((a, b) => (b.stock > 0) - (a.stock > 0));
  return result;
}

/**
 * Merender grid koleksi sesuai state filter
 */
function renderCollectionPage() {
  const grid = document.getElementById("collectionGrid");
  if (!grid || typeof PRODUCTS_DATA === "undefined") return;

  const products = getFilteredProducts();
  grid.innerHTML = "";
  products.forEach((product) => grid.appendChild(createProductCardElement(product)));

  const countEl = document.getElementById("catalogCount");
  if (countEl) {
    const catLabel = CatalogState.category === "all" ? "" : ` di kategori "${CatalogState.category}"`;
    countEl.textContent = `Menampilkan ${products.length} dari ${PRODUCTS_DATA.length} burung${catLabel}`;
  }

  const emptyEl = document.getElementById("catalogEmpty");
  if (emptyEl) emptyEl.hidden = products.length > 0;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Menyimpan filter utama ke URL agar bisa dibagikan / di-bookmark
 */
function syncStateToUrl() {
  const params = new URLSearchParams();
  if (CatalogState.category !== "all") params.set("kategori", CatalogState.category);
  if (CatalogState.search.trim()) params.set("q", CatalogState.search.trim());
  if (CatalogState.sort !== "newest") params.set("urut", CatalogState.sort);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? "?" + query : ""}`;
  window.history.replaceState(null, "", newUrl);
}

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const kategori = params.get("kategori");
  if (kategori && BIRD_CATEGORIES.some((c) => c.id === kategori)) {
    CatalogState.category = kategori;
  }
  CatalogState.search = params.get("q") || "";
  const urut = params.get("urut");
  if (urut) CatalogState.sort = urut;
}

/**
 * Membuat daftar radio kategori
 */
function renderCategoryFilters() {
  const list = document.getElementById("filterCategoryList");
  if (!list) return;
  list.innerHTML = "";

  const options = [{ id: "all", name: "Semua Kategori" }, ...BIRD_CATEGORIES];
  options.forEach((cat) => {
    const count = PRODUCTS_DATA.filter((p) => productMatchesCategory(p, cat.id)).length;

    const label = document.createElement("label");
    label.className = "radio-label";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "kategori";
    input.value = cat.id;
    input.checked = CatalogState.category === cat.id;
    input.addEventListener("change", () => {
      CatalogState.category = cat.id;
      updateCatalog();
    });

    const text = document.createElement("span");
    text.textContent = cat.name;

    const badge = document.createElement("span");
    badge.className = "filter-count";
    badge.textContent = String(count);

    label.appendChild(input);
    label.appendChild(text);
    label.appendChild(badge);
    list.appendChild(label);
  });
}

function updateCatalog() {
  syncStateToUrl();
  renderCollectionPage();
}

function resetCatalogFilters() {
  CatalogState.search = "";
  CatalogState.category = "all";
  CatalogState.priceMin = null;
  CatalogState.priceMax = null;
  CatalogState.inStockOnly = false;
  CatalogState.sort = "newest";

  // Kosongkan input secara manual (bukan form.reset() agar tidak memicu event reset berulang)
  ["filterSearch", "filterPriceMin", "filterPriceMax"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const inStock = document.getElementById("filterInStock");
  if (inStock) inStock.checked = false;
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) sortSelect.value = "newest";

  renderCategoryFilters();
  updateCatalog();
}

/**
 * Inisialisasi halaman koleksi
 */
function initCollectionPage() {
  if (!document.getElementById("collectionGrid")) return;

  readStateFromUrl();
  renderCategoryFilters();

  const searchInput = document.getElementById("filterSearch");
  const priceMinInput = document.getElementById("filterPriceMin");
  const priceMaxInput = document.getElementById("filterPriceMax");
  const inStockInput = document.getElementById("filterInStock");
  const sortSelect = document.getElementById("sortSelect");
  const form = document.getElementById("filterForm");

  if (searchInput) {
    searchInput.value = CatalogState.search;
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        CatalogState.search = searchInput.value;
        updateCatalog();
      }, 200);
    });
  }

  const parsePrice = (input) => {
    const val = input.value.trim();
    if (val === "") return null;
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : null;
  };

  [priceMinInput, priceMaxInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", () => {
      CatalogState.priceMin = parsePrice(priceMinInput);
      CatalogState.priceMax = parsePrice(priceMaxInput);
      updateCatalog();
    });
  });

  if (inStockInput) {
    inStockInput.addEventListener("change", () => {
      CatalogState.inStockOnly = inStockInput.checked;
      updateCatalog();
    });
  }

  if (sortSelect) {
    sortSelect.value = CatalogState.sort;
    sortSelect.addEventListener("change", () => {
      CatalogState.sort = sortSelect.value;
      updateCatalog();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => e.preventDefault());
    form.addEventListener("reset", (e) => {
      e.preventDefault();
      resetCatalogFilters();
    });
  }

  const emptyResetBtn = document.getElementById("emptyResetBtn");
  if (emptyResetBtn) emptyResetBtn.addEventListener("click", resetCatalogFilters);

  // Tombol buka/tutup filter di layar kecil
  const toggleBtn = document.getElementById("mobileFilterToggle");
  const panel = document.getElementById("filterPanel");
  if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("active");
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
      const label = toggleBtn.querySelector("span");
      if (label) label.textContent = isOpen ? "Sembunyikan Filter" : "Tampilkan Filter";
    });
  }

  renderCollectionPage();
}

document.addEventListener("DOMContentLoaded", initCollectionPage);
