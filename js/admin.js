/**
 * ETHERUM_BIRDS - Modul Login Admin & Halaman Penuh Dashboard Admin (js/admin.js)
 * Terintegrasi langsung dengan tabel Supabase:
 *   - public.admin     (Username & password admin)
 *   - public.stok      (Data katalog, stok tersedia, & jumlah terjual burung)
 *   - public.penjualan (Data transaksi penjualan burung)
 */

const ADMIN_SESSION_KEY = "etherum_birds_admin_session_v2";
const LOCAL_PRODUCTS_BACKUP_KEY = "etherum_birds_products_backup_v1";
const LOCAL_ORDERS_BACKUP_KEY = "etherum_birds_orders_backup_v1";

const AdminManager = {
  admin: null, // { id, username, full_name }
  activeTab: "sales", // 'sales' | 'stock'
  orders: [],
  showAddBirdForm: false,
  showAddSaleForm: false,

  async init() {
    this.loadSession();
    this.loadLocalProductsBackup();
    this.bindHeaderButton();
    this.updateAdminButtonUI();

    if (this.isOnAdminPage()) {
      await this.loadOrders();
      this.renderAdminPage();
    } else {
      this.ensureLoginModalExists();
    }
  },

  isOnAdminPage() {
    return Boolean(document.getElementById("adminPageRoot"));
  },

  loadSession() {
    try {
      const raw = localStorage.getItem(ADMIN_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username) {
          this.admin = parsed;
        }
      }
    } catch (_) {
      this.admin = null;
    }
  },

  saveSession(adminData) {
    if (!adminData) {
      this.admin = null;
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } else {
      this.admin = adminData;
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminData));
    }
    this.updateAdminButtonUI();
  },

  loadLocalProductsBackup() {
    try {
      const raw = localStorage.getItem(LOCAL_PRODUCTS_BACKUP_KEY);
      if (!raw || window.IS_SUPABASE_LIVE) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved) && saved.length > 0 && typeof PRODUCTS_DATA !== "undefined") {
        PRODUCTS_DATA.length = 0;
        saved.forEach((p) => PRODUCTS_DATA.push(p));
        this.refreshWebsiteCatalogUI();
      }
    } catch (_) {}
  },

  saveLocalProductsBackup() {
    try {
      if (typeof PRODUCTS_DATA !== "undefined") {
        localStorage.setItem(LOCAL_PRODUCTS_BACKUP_KEY, JSON.stringify(PRODUCTS_DATA));
      }
    } catch (_) {}
  },

  bindHeaderButton() {
    const btn = document.getElementById("headerAdminBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        if (this.admin) {
          window.location.href = "admin.html";
        } else {
          this.openLoginModal();
        }
      });
    }

    document.querySelectorAll("[data-admin-page-tab]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        this.activeTab = tabBtn.getAttribute("data-admin-page-tab");
        this.renderAdminPage();
      });
    });

    const pageLogoutBtn = document.getElementById("adminPageLogoutBtn");
    if (pageLogoutBtn) {
      pageLogoutBtn.addEventListener("click", () => {
        this.logoutAdmin();
      });
    }
  },

  updateAdminButtonUI() {
    const btn = document.getElementById("headerAdminBtn");
    if (!btn) return;
    const isLogged = Boolean(this.admin);
    btn.classList.toggle("is-admin-active", isLogged);
    btn.title = isLogged
      ? `Buka Dashboard Admin (${this.admin.full_name || this.admin.username})`
      : "Login Admin ETHERUM_BIRDS";
  },

  /**
   * Verifikasi Login Admin ke tabel Supabase public.admin (berisi username & password)
   */
  async loginAdmin(username, password) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      const rows = await supabaseFetch(
        "admin",
        `select=*&username=eq.${encodeURIComponent(cleanUser)}&limit=1`
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const adm = rows[0];
        if (String(adm.password) !== cleanPass) {
          throw new Error("Password admin salah.");
        }
        this.saveSession({
          id: adm.id,
          username: adm.username,
          full_name: adm.full_name || adm.username
        });
        this.onLoginSuccess();
        return;
      } else {
        throw new Error(`Username admin "${cleanUser}" tidak ditemukan di tabel admin.`);
      }
    } catch (err) {
      // Fallback jika tabel public.admin belum dijalankan di SQL Editor
      if (cleanUser === "admin" && cleanPass === "admin123") {
        this.saveSession({
          id: "local-admin",
          username: "admin",
          full_name: "Admin ETHERUM_BIRDS"
        });
        this.onLoginSuccess();
        return;
      }
      throw new Error(
        err.message.includes("HTTP")
          ? "Username/Password salah (Default: admin / admin123)."
          : err.message
      );
    }
  },

  async onLoginSuccess() {
    if (this.isOnAdminPage()) {
      showToast(`Selamat datang, ${this.admin.full_name || this.admin.username}!`);
      await this.loadOrders();
      this.renderAdminPage();
    } else {
      window.location.href = "admin.html";
    }
  },

  logoutAdmin() {
    this.saveSession(null);
    if (this.isOnAdminPage()) {
      showToast("Anda telah keluar dari Dashboard Admin.");
      this.renderAdminPage();
    } else {
      this.closeModal();
      showToast("Anda telah keluar dari mode Admin.");
    }
  },

  /**
   * Memuat seluruh data penjualan dari tabel public.penjualan
   */
  async loadOrders() {
    let localOrders = [];
    try {
      localOrders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_BACKUP_KEY) || "[]");
    } catch (_) {
      localOrders = [];
    }

    try {
      const remoteOrders = await supabaseFetch("penjualan", "select=*&order=created_at.desc");
      if (Array.isArray(remoteOrders)) {
        this.orders = remoteOrders;
        return;
      }
    } catch (_) {}

    this.orders = localOrders;
  },

  /**
   * Mencatat pesanan/penjualan baru ke tabel public.penjualan & mengurangi stok di public.stok
   */
  async createSaleRecord({ customerName, items, totalAmount, status = "Selesai / Terjual", reduceStock = true }) {
    const activeUsername =
      typeof AuthManager !== "undefined" && AuthManager.user ? AuthManager.user.username : "";

    const newOrder = {
      id: "ord-" + Date.now(),
      username: activeUsername,
      customer_name: customerName || "Pelanggan",
      items,
      total_amount: Number(totalAmount) || 0,
      status,
      created_at: new Date().toISOString()
    };

    try {
      const localOrders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_BACKUP_KEY) || "[]");
      localOrders.unshift(newOrder);
      localStorage.setItem(LOCAL_ORDERS_BACKUP_KEY, JSON.stringify(localOrders));
    } catch (_) {}

    try {
      await supabaseFetch("penjualan", "", {
        method: "POST",
        body: {
          username: newOrder.username,
          customer_name: newOrder.customer_name,
          items: newOrder.items,
          total_amount: newOrder.total_amount,
          status: newOrder.status
        }
      });
    } catch (_) {}

    // Otomatis kurangi stok & tambah jumlah terjual di tabel public.stok
    if (reduceStock && Array.isArray(items)) {
      for (const item of items) {
        const prod = PRODUCTS_DATA.find((p) => p.id === item.id);
        if (prod) {
          const qtySold = Math.max(1, Number(item.quantity) || 1);
          const nextStock = Math.max(0, Number(prod.stock) - qtySold);
          const nextSold = (Number(prod.sold) || 0) + qtySold;
          await this.updateBirdStock(prod.id, nextStock, true, nextSold);
        }
      }
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      const localOrders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_BACKUP_KEY) || "[]");
      const idx = localOrders.findIndex((o) => String(o.id) === String(orderId));
      if (idx > -1) {
        localOrders[idx].status = newStatus;
        localStorage.setItem(LOCAL_ORDERS_BACKUP_KEY, JSON.stringify(localOrders));
      }
    } catch (_) {}

    try {
      await supabaseFetch("penjualan", `id=eq.${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        body: { status: newStatus }
      });
    } catch (_) {}

    const target = this.orders.find((o) => String(o.id) === String(orderId));
    if (target) target.status = newStatus;
    showToast(`Status penjualan diubah menjadi "${newStatus}".`);
    if (this.isOnAdminPage()) this.renderAdminPage();
  },

  async deleteOrder(orderId) {
    try {
      const localOrders = JSON.parse(localStorage.getItem(LOCAL_ORDERS_BACKUP_KEY) || "[]").filter(
        (o) => String(o.id) !== String(orderId)
      );
      localStorage.setItem(LOCAL_ORDERS_BACKUP_KEY, JSON.stringify(localOrders));
    } catch (_) {}

    try {
      await supabaseFetch("penjualan", `id=eq.${encodeURIComponent(orderId)}`, {
        method: "DELETE"
      });
    } catch (_) {}

    this.orders = this.orders.filter((o) => String(o.id) !== String(orderId));
    showToast("Data penjualan dihapus.");
    if (this.isOnAdminPage()) this.renderAdminPage();
  },

  /**
   * Mengubah stok burung langsung di tabel Supabase public.stok & di katalog website
   */
  async updateBirdStock(productId, newStock, silent = false, newSoldCount = null) {
    const cleanStock = Math.max(0, Math.floor(Number(newStock) || 0));
    const product = PRODUCTS_DATA.find((p) => p.id === productId);
    if (!product) return;

    product.stock = cleanStock;
    if (newSoldCount !== null) {
      product.sold = Math.max(0, Math.floor(Number(newSoldCount) || 0));
    }
    product.conditionInfo =
      cleanStock > 0
        ? product.conditionInfo === "Stok Habis" || product.conditionInfo === "Stok Demo Habis"
          ? "Sehat & terawat"
          : product.conditionInfo
        : "Stok Habis";

    this.saveLocalProductsBackup();

    const patchBody = {
      stock: cleanStock,
      condition_info: product.conditionInfo,
      updated_at: new Date().toISOString()
    };
    if (newSoldCount !== null) {
      patchBody.sold = product.sold;
    }

    try {
      await supabaseFetch("stok", `id=eq.${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: patchBody
      });
    } catch (_) {}

    this.refreshWebsiteCatalogUI();
    if (!silent) {
      showToast(`Stok "${product.name}" di tabel stok diperbarui menjadi ${cleanStock} ekor.`);
      if (this.isOnAdminPage()) this.renderAdminPage();
    }
  },

  /**
   * Menambah burung baru ke tabel Supabase public.stok & katalog website
   */
  async addNewBird(birdInput) {
    const newId = "sb-" + String(Date.now()).slice(-6);
    const stockNum = Math.max(0, Math.floor(Number(birdInput.stock) || 0));
    const priceNum = Math.max(0, Math.floor(Number(birdInput.price) || 0));

    const newProduct = {
      id: newId,
      name: birdInput.name.trim(),
      category: birdInput.category,
      tags: [birdInput.category, "Burung Kicau"],
      price: priceNum,
      stock: stockNum,
      sold: 0,
      isFeatured: Boolean(birdInput.isFeatured),
      createdAt: new Date().toISOString(),
      image:
        birdInput.image.trim() ||
        "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=700&q=80",
      ageInfo: birdInput.ageInfo.trim() || "Dewasa / Siap Rawat",
      conditionInfo:
        stockNum > 0
          ? birdInput.conditionInfo.trim() || "Sehat & terawat - Siap pantau"
          : "Stok Habis",
      description:
        birdInput.description.trim() ||
        `${birdInput.name.trim()} koleksi pilihan ETHERUM_BIRDS.`
    };

    try {
      await supabaseFetch("stok", "", {
        method: "POST",
        body: {
          id: newProduct.id,
          name: newProduct.name,
          category: newProduct.category,
          tags: newProduct.tags,
          price: newProduct.price,
          stock: newProduct.stock,
          sold: 0,
          is_featured: newProduct.isFeatured,
          image: newProduct.image,
          age_info: newProduct.ageInfo,
          condition_info: newProduct.conditionInfo,
          description: newProduct.description
        }
      });
    } catch (_) {}

    PRODUCTS_DATA.unshift(newProduct);
    this.saveLocalProductsBackup();
    this.refreshWebsiteCatalogUI();
    showToast(`Burung "${newProduct.name}" berhasil ditambahkan ke tabel stok!`);
  },

  /**
   * Menghapus burung dari tabel Supabase public.stok & katalog website
   */
  async deleteBird(productId) {
    const prod = PRODUCTS_DATA.find((p) => p.id === productId);
    const prodName = prod ? prod.name : productId;

    try {
      await supabaseFetch("stok", `id=eq.${encodeURIComponent(productId)}`, {
        method: "DELETE"
      });
    } catch (_) {}

    const idx = PRODUCTS_DATA.findIndex((p) => p.id === productId);
    if (idx > -1) {
      PRODUCTS_DATA.splice(idx, 1);
    }

    this.saveLocalProductsBackup();
    this.refreshWebsiteCatalogUI();
    showToast(`"${prodName}" telah dihapus dari tabel stok.`);
    if (this.isOnAdminPage()) this.renderAdminPage();
  },

  refreshWebsiteCatalogUI() {
    if (typeof initHomePage === "function") initHomePage();
    if (typeof renderCategoryFilters === "function") renderCategoryFilters();
    if (typeof renderCollectionPage === "function") renderCollectionPage();
    if (typeof fillStaticPageData === "function") fillStaticPageData();
    if (typeof CartManager !== "undefined") {
      CartManager.loadFromStorage();
      CartManager.updateBadge();
    }
  },

  ensureLoginModalExists() {
    if (document.getElementById("adminModalOverlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "adminModalOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal-box auth-modal-box">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title">Login Admin ETHERUM_BIRDS</h3>
            <span class="modal-badge">Tabel Admin</span>
          </div>
          <button type="button" class="modal-close-btn" id="closeAdminModalBtn" aria-label="Tutup">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body" id="adminModalBody"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector("#closeAdminModalBtn").addEventListener("click", () => {
      this.closeModal();
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeModal();
    });
  },

  openLoginModal() {
    this.ensureLoginModalExists();
    const overlay = document.getElementById("adminModalOverlay");
    const bodyEl = document.getElementById("adminModalBody");
    if (!overlay || !bodyEl) return;

    this.renderLoginFormInto(bodyEl);
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeModal() {
    const overlay = document.getElementById("adminModalOverlay");
    if (overlay) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  renderLoginFormInto(container) {
    container.innerHTML = `
      <p class="auth-helper-text">
        Masuk menggunakan akun dari <strong>tabel admin</strong> Supabase untuk membuka halaman penuh <strong>Dashboard Monitor Penjualan & Stok Burung</strong>.
      </p>
      <div class="auth-alert" id="adminLoginError" hidden></div>
      <form id="adminLoginForm" class="auth-form" autocomplete="on">
        <div class="form-field">
          <label for="adminUsernameInput">Username Admin</label>
          <input type="text" id="adminUsernameInput" class="form-input" placeholder="admin" value="admin" required />
        </div>
        <div class="form-field">
          <label for="adminPasswordInput">Password Admin</label>
          <input type="password" id="adminPasswordInput" class="form-input" placeholder="Masukkan password admin" required />
          <small style="font-size:0.75rem; color:var(--color-text-gray);">Akun bawaan: username <strong>admin</strong> | password <strong>admin123</strong></small>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="adminLoginSubmitBtn">
          <i data-lucide="shield-check"></i>
          <span>Masuk ke Halaman Dashboard Admin</span>
        </button>
      </form>
    `;

    if (window.lucide) window.lucide.createIcons();

    const form = container.querySelector("#adminLoginForm");
    const errorBox = container.querySelector("#adminLoginError");
    const submitBtn = container.querySelector("#adminLoginSubmitBtn");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Memverifikasi...";
      try {
        const userVal = container.querySelector("#adminUsernameInput").value;
        const passVal = container.querySelector("#adminPasswordInput").value;
        await this.loginAdmin(userVal, passVal);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Masuk ke Halaman Dashboard Admin";
      }
    });
  },

  /**
   * Merender Halaman Penuh (1 Layar) di admin.html
   */
  renderAdminPage() {
    const root = document.getElementById("adminPageRoot");
    if (!root) return;

    const headerNav = document.getElementById("adminHeaderNav");
    const logoutBtn = document.getElementById("adminPageLogoutBtn");

    if (!this.admin) {
      if (headerNav) headerNav.hidden = true;
      if (logoutBtn) logoutBtn.hidden = true;

      root.innerHTML = `
        <div class="admin-fullpage-login-wrap">
          <div class="info-card admin-fullpage-login-card">
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem;">
              <div class="feature-icon" style="margin-bottom:0;"><i data-lucide="settings"></i></div>
              <div>
                <h1 class="info-card-title" style="margin-bottom:0;">Login Admin ETHERUM_BIRDS</h1>
                <span style="font-size:0.8rem; color:var(--color-text-gray);">Terintegrasi Tabel Admin & Stok Supabase</span>
              </div>
            </div>
            <div id="adminFullPageLoginBody"></div>
          </div>
        </div>
      `;
      this.renderLoginFormInto(root.querySelector("#adminFullPageLoginBody"));
      return;
    }

    if (headerNav) {
      headerNav.hidden = false;
      headerNav.querySelectorAll("[data-admin-page-tab]").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-admin-page-tab") === this.activeTab);
      });
    }
    if (logoutBtn) logoutBtn.hidden = false;

    const validOrders = this.orders.filter(
      (o) => !String(o.status || "").toLowerCase().includes("batal")
    );
    const totalRevenue = validOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );
    const products = typeof PRODUCTS_DATA !== "undefined" ? PRODUCTS_DATA : [];
    const totalSoldInStok = products.reduce((sum, p) => sum + (Number(p.sold) || 0), 0);
    const totalSoldInOrders = validOrders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      return sum + items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    }, 0);
    const totalBirdsSold = Math.max(totalSoldInStok, totalSoldInOrders);
    const totalStockReady = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const totalBirdTypes = products.length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;

    root.innerHTML = `
      <div class="admin-page-banner">
        <div>
          <span class="section-badge">Admin Aktif: @${this.escapeHtml(this.admin.username)}</span>
          <h1 class="section-title" style="margin-bottom:0.25rem;">Dashboard Monitor Penjualan & Tabel Stok</h1>
          <p class="section-subtitle">Seluruh perubahan pada stok dan penjualan di halaman ini langsung tersimpan ke tabel <code>stok</code> dan <code>penjualan</code> di Supabase.</p>
        </div>
        <div class="admin-tabs">
          <button type="button" class="admin-tab-btn ${this.activeTab === "sales" ? "active" : ""}" data-switch-admin-tab="sales">
            <i data-lucide="bar-chart-3"></i>
            <span>Monitor Penjualan (${this.orders.length})</span>
          </button>
          <button type="button" class="admin-tab-btn ${this.activeTab === "stock" ? "active" : ""}" data-switch-admin-tab="stock">
            <i data-lucide="package-plus"></i>
            <span>Tabel Stok Burung (${totalBirdTypes})</span>
          </button>
        </div>
      </div>

      <div class="admin-stats-grid">
        <div class="admin-stat-card">
          <span class="admin-stat-label">Total Nilai Penjualan</span>
          <strong class="admin-stat-value">${formatRupiah(totalRevenue)}</strong>
          <span class="admin-stat-note">Dari ${validOrders.length} transaksi aktif</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-label">Total Burung Terjual</span>
          <strong class="admin-stat-value">${totalBirdsSold} Ekor</strong>
          <span class="admin-stat-note">Tercatat di tabel stok & penjualan</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-label">Total Stok Tersedia</span>
          <strong class="admin-stat-value">${totalStockReady} Ekor</strong>
          <span class="admin-stat-note">Dari ${totalBirdTypes} jenis di tabel stok</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-label">Koleksi Stok Habis</span>
          <strong class="admin-stat-value">${outOfStockCount} Jenis</strong>
          <span class="admin-stat-note">Perlu penambahan stok</span>
        </div>
      </div>

      <div class="info-card admin-page-panel" id="adminPageMainPanel"></div>
    `;

    root.querySelectorAll("[data-switch-admin-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.activeTab = btn.getAttribute("data-switch-admin-tab");
        this.renderAdminPage();
      });
    });

    const panel = root.querySelector("#adminPageMainPanel");
    if (this.activeTab === "sales") {
      this.renderSalesTab(panel);
    } else {
      this.renderStockTab(panel);
    }

    if (window.lucide) window.lucide.createIcons();
  },

  renderSalesTab(container) {
    const productOptionsHtml = (typeof PRODUCTS_DATA !== "undefined" ? PRODUCTS_DATA : [])
      .map(
        (p) =>
          `<option value="${p.id}">${this.escapeHtml(p.name)} — ${formatRupiah(p.price)} (Stok: ${p.stock})</option>`
      )
      .join("");

    container.innerHTML = `
      <div class="admin-section-header">
        <div>
          <h2 class="info-card-title" style="margin-bottom:0.2rem;">Monitor Penjualan Burung (Tabel Penjualan)</h2>
          <p class="admin-section-sub">Setiap transaksi yang dicatat otomatis mengurangi jumlah stok di tabel <code>stok</code>.</p>
        </div>
        <div style="display:flex; gap:0.6rem; flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="adminRefreshOrdersBtn">
            <i data-lucide="refresh-cw"></i>
            <span>Segarkan Data</span>
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="toggleAddSaleBtn">
            <i data-lucide="plus-circle"></i>
            <span>${this.showAddSaleForm ? "Tutup Form" : "Catat Penjualan Baru"}</span>
          </button>
        </div>
      </div>

      ${
        this.showAddSaleForm
          ? `
        <form id="adminAddSaleForm" class="admin-form-card">
          <h5 class="admin-form-title">Catat Penjualan Baru (Otomatis Mengurangi Tabel Stok)</h5>
          <div class="admin-form-grid-3">
            <div class="form-field">
              <label for="saleCustomerName">Nama Pembeli / Username</label>
              <input type="text" id="saleCustomerName" class="form-input" placeholder="Contoh: Pak Hendra" required />
            </div>
            <div class="form-field">
              <label for="saleProductId">Pilih Koleksi Burung</label>
              <select id="saleProductId" class="form-select" required>
                ${productOptionsHtml}
              </select>
            </div>
            <div class="form-field">
              <label for="saleQty">Jumlah Terjual (Ekor)</label>
              <input type="number" id="saleQty" class="form-input" value="1" min="1" required />
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
            <button type="submit" class="btn btn-primary btn-sm">
              <i data-lucide="check"></i>
              <span>Simpan Penjualan & Kurangi Stok</span>
            </button>
          </div>
        </form>
      `
          : ""
      }

      <div id="adminOrdersTableWrap"></div>
    `;

    container.querySelector("#adminRefreshOrdersBtn").addEventListener("click", async () => {
      await syncFromSupabase();
      await this.loadOrders();
      this.renderAdminPage();
      showToast("Data penjualan & stok berhasil disegarkan dari Supabase.");
    });

    container.querySelector("#toggleAddSaleBtn").addEventListener("click", () => {
      this.showAddSaleForm = !this.showAddSaleForm;
      this.renderAdminPage();
    });

    const addSaleForm = container.querySelector("#adminAddSaleForm");
    if (addSaleForm) {
      addSaleForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const customerName = addSaleForm.querySelector("#saleCustomerName").value.trim();
        const prodId = addSaleForm.querySelector("#saleProductId").value;
        const qty = Math.max(1, Number(addSaleForm.querySelector("#saleQty").value) || 1);
        const prod = PRODUCTS_DATA.find((p) => p.id === prodId);
        if (!prod) return;

        await this.createSaleRecord({
          customerName,
          items: [
            {
              id: prod.id,
              name: prod.name,
              price: prod.price,
              quantity: qty
            }
          ],
          totalAmount: prod.price * qty,
          status: "Selesai / Terjual",
          reduceStock: true
        });

        this.showAddSaleForm = false;
        await this.loadOrders();
        this.renderAdminPage();
        showToast("Penjualan dicatat & tabel stok otomatis diperbarui!");
      });
    }

    const wrap = container.querySelector("#adminOrdersTableWrap");
    if (this.orders.length === 0) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:2.5rem 1rem;">
          <div class="empty-state-icon"><i data-lucide="shopping-bag"></i></div>
          <h4 class="empty-state-title">Belum ada data penjualan burung.</h4>
          <p class="empty-state-sub">Gunakan tombol "Catat Penjualan Baru" di atas atau lakukan pemesanan dari keranjang toko.</p>
        </div>
      `;
      return;
    }

    const listEl = document.createElement("div");
    listEl.className = "admin-table-list";

    this.orders.forEach((ord) => {
      const dateStr = new Date(ord.created_at || Date.now()).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      const items = Array.isArray(ord.items) ? ord.items : [];
      const itemsSummary = items
        .map((i) => `${this.escapeHtml(i.name)} (${i.quantity} ekor x ${formatRupiah(i.price)})`)
        .join(", ");

      const currentStatus = ord.status || "Diteruskan ke WhatsApp";
      const statuses = [
        "Diteruskan ke WhatsApp",
        "Sedang Diproses",
        "Selesai / Terjual",
        "Dibatalkan"
      ];

      const row = document.createElement("div");
      row.className = "admin-order-row";
      row.innerHTML = `
        <div class="admin-order-main">
          <div class="admin-order-head">
            <strong>${this.escapeHtml(ord.customer_name || "Pelanggan Web")}</strong>
            ${ord.username ? `<span class="modal-badge">@${this.escapeHtml(ord.username)}</span>` : ""}
            <span class="admin-order-date">${dateStr}</span>
          </div>
          <div class="admin-order-items">${itemsSummary || "Item pesanan"}</div>
          <div class="admin-order-total">Total Transaksi: <strong>${formatRupiah(ord.total_amount)}</strong></div>
        </div>
        <div class="admin-order-actions">
          <select class="form-select admin-status-select" aria-label="Status Pesanan">
            ${statuses
              .map(
                (st) =>
                  `<option value="${st}" ${st === currentStatus ? "selected" : ""}>${st}</option>`
              )
              .join("")}
          </select>
          <button type="button" class="remove-item-btn" title="Hapus Data Penjualan">
            <i data-lucide="trash-2"></i>
            <span>Hapus</span>
          </button>
        </div>
      `;

      row.querySelector(".admin-status-select").addEventListener("change", (e) => {
        this.updateOrderStatus(ord.id, e.target.value);
      });

      row.querySelector(".remove-item-btn").addEventListener("click", () => {
        this.deleteOrder(ord.id);
      });

      listEl.appendChild(row);
    });

    wrap.appendChild(listEl);
  },

  renderStockTab(container) {
    const categoryOptionsHtml = (typeof BIRD_CATEGORIES !== "undefined" ? BIRD_CATEGORIES : [])
      .map((c) => `<option value="${this.escapeHtml(c.id)}">${this.escapeHtml(c.name)}</option>`)
      .join("");

    container.innerHTML = `
      <div class="admin-section-header">
        <div>
          <h2 class="info-card-title" style="margin-bottom:0.2rem;">Kelola Tabel Stok Burung</h2>
          <p class="admin-section-sub">Setiap perubahan stok, penambahan burung baru, atau penghapusan otomatis mengubah tabel <code>stok</code> di Supabase & tampilan website.</p>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="toggleAddBirdBtn">
          <i data-lucide="plus"></i>
          <span>${this.showAddBirdForm ? "Tutup Form Tambah" : "Tambah Burung Baru"}</span>
        </button>
      </div>

      ${
        this.showAddBirdForm
          ? `
        <form id="adminAddBirdForm" class="admin-form-card">
          <h5 class="admin-form-title">Tambah Koleksi Burung Baru ke Tabel Stok</h5>
          <div class="admin-form-grid-3">
            <div class="form-field">
              <label for="newBirdName">Nama Burung *</label>
              <input type="text" id="newBirdName" class="form-input" placeholder="Contoh: Murai Batu Medan" required />
            </div>
            <div class="form-field">
              <label for="newBirdCat">Kategori *</label>
              <select id="newBirdCat" class="form-select" required>
                ${categoryOptionsHtml}
              </select>
            </div>
            <div class="form-field">
              <label for="newBirdPrice">Harga (Rp) *</label>
              <input type="number" id="newBirdPrice" class="form-input" placeholder="Contoh: 450000" min="0" step="5000" required />
            </div>
            <div class="form-field">
              <label for="newBirdStock">Jumlah Stok Awal (Ekor) *</label>
              <input type="number" id="newBirdStock" class="form-input" value="1" min="0" required />
            </div>
            <div class="form-field">
              <label for="newBirdAge">Info Usia</label>
              <input type="text" id="newBirdAge" class="form-input" placeholder="Contoh: Dewasa mapan" />
            </div>
            <div class="form-field">
              <label for="newBirdImage">URL Foto Burung</label>
              <input type="url" id="newBirdImage" class="form-input" placeholder="https://..." />
            </div>
          </div>
          <div class="form-field" style="margin-top:0.75rem;">
            <label for="newBirdDesc">Deskripsi Singkat</label>
            <textarea id="newBirdDesc" class="form-input" rows="2" placeholder="Karakter suara, kondisi bulu, dll."></textarea>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; flex-wrap:wrap; gap:0.75rem;">
            <label class="radio-label">
              <input type="checkbox" id="newBirdFeatured" checked />
              <span>Tampilkan juga di Koleksi Unggulan Beranda</span>
            </label>
            <button type="submit" class="btn btn-primary btn-sm">
              <i data-lucide="check"></i>
              <span>Simpan ke Tabel Stok</span>
            </button>
          </div>
        </form>
      `
          : ""
      }

      <div class="admin-table-list" id="adminStockList"></div>
    `;

    container.querySelector("#toggleAddBirdBtn").addEventListener("click", () => {
      this.showAddBirdForm = !this.showAddBirdForm;
      this.renderAdminPage();
    });

    const addForm = container.querySelector("#adminAddBirdForm");
    if (addForm) {
      addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.addNewBird({
          name: addForm.querySelector("#newBirdName").value,
          category: addForm.querySelector("#newBirdCat").value,
          price: addForm.querySelector("#newBirdPrice").value,
          stock: addForm.querySelector("#newBirdStock").value,
          ageInfo: addForm.querySelector("#newBirdAge").value,
          conditionInfo: "Sehat & terawat",
          image: addForm.querySelector("#newBirdImage").value,
          description: addForm.querySelector("#newBirdDesc").value,
          isFeatured: addForm.querySelector("#newBirdFeatured").checked
        });
        this.showAddBirdForm = false;
        this.renderAdminPage();
      });
    }

    const stockList = container.querySelector("#adminStockList");
    const products = typeof PRODUCTS_DATA !== "undefined" ? PRODUCTS_DATA : [];

    products.forEach((prod) => {
      const itemRow = document.createElement("div");
      itemRow.className = "admin-stock-row";
      itemRow.innerHTML = `
        <img src="${this.escapeHtml(prod.image)}" alt="${this.escapeHtml(prod.name)}" class="admin-stock-thumb" />
        <div class="admin-stock-info">
          <strong>${this.escapeHtml(prod.name)}</strong>
          <div class="admin-stock-meta">
            <span>${this.escapeHtml(prod.category)}</span>
            <span>•</span>
            <span>${formatRupiah(prod.price)}</span>
            <span>•</span>
            <span class="${prod.stock > 0 ? "text-in-stock" : "text-out-stock"}">
              ${prod.stock > 0 ? `Stok: ${prod.stock} ekor` : "Stok Habis"}
            </span>
            <span>•</span>
            <span>Terjual: <strong>${Number(prod.sold) || 0} ekor</strong></span>
          </div>
        </div>
        <div class="admin-stock-controls">
          <div class="qty-control">
            <button type="button" class="qty-btn js-stock-minus" title="Kurangi Stok (-1)">-</button>
            <span class="qty-value">${prod.stock}</span>
            <button type="button" class="qty-btn js-stock-plus" title="Tambah Stok (+1)">+</button>
          </div>
          <button type="button" class="remove-item-btn js-delete-bird" title="Hapus Burung dari Tabel Stok">
            <i data-lucide="trash-2"></i>
            <span>Hapus</span>
          </button>
        </div>
      `;

      itemRow.querySelector(".js-stock-minus").addEventListener("click", () => {
        if (prod.stock > 0) {
          this.updateBirdStock(prod.id, prod.stock - 1);
        }
      });

      itemRow.querySelector(".js-stock-plus").addEventListener("click", () => {
        this.updateBirdStock(prod.id, prod.stock + 1);
      });

      itemRow.querySelector(".js-delete-bird").addEventListener("click", () => {
        this.deleteBird(prod.id);
      });

      stockList.appendChild(itemRow);
    });
  },

  escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  AdminManager.init();
});
