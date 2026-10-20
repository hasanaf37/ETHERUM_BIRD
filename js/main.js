/**
 * SAMPADA BIRD - Main JavaScript (main.js)
 * Mengelola navigasi, dropdown akun, kartu produk reusable, modal detail, dan halaman Beranda.
 */

/**
 * Menampilkan notifikasi kecil (Toast) yang elegan
 */
function showToast(message) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";

  const textSpan = document.createElement("span");
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Membuat elemen DOM Kartu Produk (Reusable untuk Beranda & Halaman Koleksi)
 */
function createProductCardElement(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const isAvailable = product.stock > 0;

  // Wrapper Gambar
  const thumbWrapper = document.createElement("div");
  thumbWrapper.className = "product-thumb-wrapper";

  const img = document.createElement("img");
  img.className = "product-thumb";
  img.src = product.image;
  img.alt = product.name;
  img.loading = "lazy";
  // Gambar cadangan jika foto gagal dimuat
  img.addEventListener("error", () => {
    if (img.dataset.fallback) return;
    img.dataset.fallback = "1";
    img.src = "assets/icons/favicon.svg";
  });

  const stockBadge = document.createElement("span");
  stockBadge.className = `stock-badge ${isAvailable ? "in-stock" : "out-stock"}`;
  stockBadge.textContent = isAvailable ? `Tersedia (${product.stock})` : "Stok Habis";

  const demoTag = document.createElement("span");
  demoTag.className = "demo-tag";
  demoTag.textContent = "Data Demo";

  thumbWrapper.appendChild(img);
  thumbWrapper.appendChild(stockBadge);
  if (!window.IS_SUPABASE_LIVE) {
    thumbWrapper.appendChild(demoTag);
  }

  // Body Kartu
  const body = document.createElement("div");
  body.className = "product-body";

  const categorySpan = document.createElement("span");
  categorySpan.className = "product-category";
  categorySpan.textContent = product.category;

  const titleH3 = document.createElement("h3");
  titleH3.className = "product-title";
  titleH3.textContent = product.name;

  const priceP = document.createElement("p");
  priceP.className = "product-price";
  priceP.textContent = formatRupiah(product.price);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "product-actions";

  const detailBtn = document.createElement("button");
  detailBtn.type = "button";
  detailBtn.className = "btn btn-outline";
  detailBtn.textContent = "Lihat Detail";
  detailBtn.addEventListener("click", () => openProductDetailModal(product.id));

  const addCartBtn = document.createElement("button");
  addCartBtn.type = "button";
  addCartBtn.className = "btn btn-primary";
  addCartBtn.textContent = isAvailable ? "+ Keranjang" : "Habis";
  addCartBtn.disabled = !isAvailable;
  addCartBtn.addEventListener("click", () => {
    CartManager.addItem(product.id, 1);
  });

  actionsDiv.appendChild(detailBtn);
  actionsDiv.appendChild(addCartBtn);

  body.appendChild(categorySpan);
  body.appendChild(titleH3);
  body.appendChild(priceP);
  body.appendChild(actionsDiv);

  card.appendChild(thumbWrapper);
  card.appendChild(body);

  return card;
}

/**
 * Membuka Modal Detail Produk
 */
function openProductDetailModal(productId) {
  const product = PRODUCTS_DATA.find((p) => p.id === productId);
  if (!product) return;

  const overlay = document.getElementById("productDetailModalOverlay");
  const body = document.getElementById("productDetailModalBody");
  if (!overlay || !body) return;

  body.innerHTML = "";
  const isAvailable = product.stock > 0;
  let selectedQty = 1;

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  // Kolom Kiri: Foto
  const imgBox = document.createElement("div");
  imgBox.className = "detail-img-box";
  const img = document.createElement("img");
  img.src = product.image;
  img.alt = product.name;
  imgBox.appendChild(img);

  // Kolom Kanan: Informasi
  const infoBox = document.createElement("div");

  const catSpan = document.createElement("span");
  catSpan.className = "detail-category";
  catSpan.textContent = product.category;

  const titleH3 = document.createElement("h3");
  titleH3.className = "detail-title";
  titleH3.textContent = product.name;

  const priceDiv = document.createElement("div");
  priceDiv.className = "detail-price";
  priceDiv.textContent = formatRupiah(product.price);

  // Meta Data
  const metaList = document.createElement("div");
  metaList.className = "detail-meta-list";

  const metaItems = [
    { label: "Status Stok (Demo)", value: isAvailable ? `Tersedia (${product.stock} ekor)` : "Habis" },
    { label: "Usia", value: product.ageInfo },
    { label: "Kondisi", value: product.conditionInfo }
  ];

  metaItems.forEach((m) => {
    const row = document.createElement("div");
    row.className = "detail-meta-item";
    const lbl = document.createElement("span");
    lbl.className = "detail-meta-label";
    lbl.textContent = m.label;
    const val = document.createElement("span");
    val.className = "detail-meta-val";
    val.textContent = m.value;
    row.appendChild(lbl);
    row.appendChild(val);
    metaList.appendChild(row);
  });

  const descP = document.createElement("p");
  descP.className = "detail-desc";
  descP.textContent = product.description;

  // Kontrol Jumlah
  const qtyRow = document.createElement("div");
  qtyRow.className = "detail-qty-row";

  const qtyLabel = document.createElement("span");
  qtyLabel.className = "detail-qty-label";
  qtyLabel.textContent = "Jumlah:";

  const qtyControl = document.createElement("div");
  qtyControl.className = "qty-control";

  const minusBtn = document.createElement("button");
  minusBtn.type = "button";
  minusBtn.className = "qty-btn";
  minusBtn.textContent = "-";
  minusBtn.disabled = !isAvailable;

  const qtyVal = document.createElement("span");
  qtyVal.className = "qty-value";
  qtyVal.textContent = isAvailable ? "1" : "0";

  const plusBtn = document.createElement("button");
  plusBtn.type = "button";
  plusBtn.className = "qty-btn";
  plusBtn.textContent = "+";
  plusBtn.disabled = !isAvailable || product.stock <= 1;

  minusBtn.addEventListener("click", () => {
    if (selectedQty > 1) {
      selectedQty -= 1;
      qtyVal.textContent = String(selectedQty);
    }
  });

  plusBtn.addEventListener("click", () => {
    if (selectedQty < product.stock) {
      selectedQty += 1;
      qtyVal.textContent = String(selectedQty);
    } else {
      showToast(`Maksimal stok demo ${product.stock} ekor.`);
    }
  });

  qtyControl.appendChild(minusBtn);
  qtyControl.appendChild(qtyVal);
  qtyControl.appendChild(plusBtn);

  qtyRow.appendChild(qtyLabel);
  qtyRow.appendChild(qtyControl);

  // Tombol Aksi
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "detail-actions";

  const addCartBtn = document.createElement("button");
  addCartBtn.type = "button";
  addCartBtn.className = "btn btn-primary";
  addCartBtn.disabled = !isAvailable;
  addCartBtn.innerHTML = `<i data-lucide="shopping-cart"></i><span>${
    isAvailable ? "Tambah ke Keranjang" : "Stok Habis"
  }</span>`;

  addCartBtn.addEventListener("click", () => {
    if (CartManager.addItem(product.id, selectedQty)) {
      closeProductDetailModal();
    }
  });

  const askSellerBtn = document.createElement("a");
  askSellerBtn.className = "btn btn-secondary";
  askSellerBtn.target = "_blank";
  askSellerBtn.rel = "noopener noreferrer";
  askSellerBtn.href = createWhatsAppUrl(
    `Halo ${STORE_CONFIG.name}, saya tertarik dengan burung *${product.name}* (${formatRupiah(
      product.price
    )}). Apakah stok masih tersedia?`
  );
  askSellerBtn.innerHTML = `<i data-lucide="message-circle"></i><span>Hubungi Penjual</span>`;

  actionsDiv.appendChild(addCartBtn);
  actionsDiv.appendChild(askSellerBtn);

  infoBox.appendChild(catSpan);
  infoBox.appendChild(titleH3);
  infoBox.appendChild(priceDiv);
  infoBox.appendChild(metaList);
  infoBox.appendChild(descP);
  infoBox.appendChild(qtyRow);
  infoBox.appendChild(actionsDiv);

  grid.appendChild(imgBox);
  grid.appendChild(infoBox);
  body.appendChild(grid);

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  if (window.lucide) window.lucide.createIcons();
}

function closeProductDetailModal() {
  const overlay = document.getElementById("productDetailModalOverlay");
  if (overlay) {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}

/**
 * Mengatur Header, Dropdown Akun, Navigasi Mobile, dan Tombol Escape
 */
function initGlobalUI() {
  // Efek scroll pada sticky header
  const siteHeader = document.getElementById("siteHeader");
  if (siteHeader) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 15) {
        siteHeader.classList.add("scrolled");
      } else {
        siteHeader.classList.remove("scrolled");
      }
    });
  }

  // Hamburger Menu Mobile
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mainNav = document.getElementById("mainNav");
  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener("click", () => {
      mainNav.classList.toggle("active");
    });

    const navLinks = mainNav.querySelectorAll("[data-nav-link]");
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mainNav.classList.remove("active");
      });
    });
  }

  // Dropdown Akun Pengguna
  const accountBtn = document.getElementById("headerAccountBtn");
  const accountDropdown = document.getElementById("accountDropdown");

  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      accountDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!accountDropdown.contains(e.target) && e.target !== accountBtn) {
        accountDropdown.classList.remove("active");
      }
    });

    // Klik item menu akun ditangani oleh AuthManager (js/auth.js)
    const accountItems = accountDropdown.querySelectorAll("[data-account-action]");
    accountItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-account-action");
        accountDropdown.classList.remove("active");
        if (typeof AuthManager !== "undefined") {
          AuthManager.handleAction(action);
        }
      });
    });
  }

  // Modal Detail Close Events
  const closeDetailBtn = document.getElementById("closeDetailModalBtn");
  const detailOverlay = document.getElementById("productDetailModalOverlay");
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener("click", closeProductDetailModal);
  }
  if (detailOverlay) {
    detailOverlay.addEventListener("click", (e) => {
      if (e.target === detailOverlay) closeProductDetailModal();
    });
  }

  // Tutup seluruh modal & dropdown dengan tombol Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      CartManager.closeCartModal();
      closeProductDetailModal();
      if (typeof AuthManager !== "undefined") AuthManager.closeModal();
      if (typeof AdminManager !== "undefined") AdminManager.closeModal();
      if (accountDropdown) accountDropdown.classList.remove("active");
    }
  });

  // Pasang tautan WhatsApp dinamis dari konfigurasi
  const waLinks = document.querySelectorAll(".js-whatsapp-link");
  waLinks.forEach((link) => {
    const customMsg = link.getAttribute("data-wa-msg") || STORE_CONFIG.whatsappDefaultMsg;
    link.href = createWhatsAppUrl(customMsg);
  });
}

/**
 * Inisialisasi Khusus Halaman Beranda (index.html)
 */
function initHomePage() {
  // 1. Render Kategori Burung
  const categoryGrid = document.getElementById("homeCategoryGrid");
  if (categoryGrid && typeof BIRD_CATEGORIES !== "undefined") {
    categoryGrid.innerHTML = "";
    BIRD_CATEGORIES.forEach((cat) => {
      const card = document.createElement("a");
      card.className = "category-card";
      card.href = `koleksi.html?kategori=${encodeURIComponent(cat.id)}`;

      const iconDiv = document.createElement("div");
      iconDiv.className = "category-icon";
      iconDiv.innerHTML = `<i data-lucide="${cat.icon}"></i>`;

      const nameH3 = document.createElement("h3");
      nameH3.className = "category-name";
      nameH3.textContent = cat.name;

      const descP = document.createElement("p");
      descP.className = "category-desc";
      descP.textContent = cat.description;

      card.appendChild(iconDiv);
      card.appendChild(nameH3);
      card.appendChild(descP);
      categoryGrid.appendChild(card);
    });
  }

  // 2. Render 4 Koleksi Unggulan
  const featuredGrid = document.getElementById("homeFeaturedGrid");
  if (featuredGrid && typeof PRODUCTS_DATA !== "undefined") {
    featuredGrid.innerHTML = "";
    const featuredProducts = PRODUCTS_DATA.filter((p) => p.isFeatured).slice(0, 4);
    featuredProducts.forEach((product) => {
      featuredGrid.appendChild(createProductCardElement(product));
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Bootstrap saat DOM selesai dimuat
 */
document.addEventListener("DOMContentLoaded", () => {
  CartManager.init();
  initGlobalUI();
  initHomePage();
  if (window.lucide) window.lucide.createIcons();
});
