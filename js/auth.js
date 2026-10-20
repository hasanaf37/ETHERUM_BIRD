/**
 * ETHERUM_BIRDS - Modul Autentikasi User Pelanggan (js/auth.js)
 * Terintegrasi langsung dengan tabel Supabase:
 *   - public.users     (berisi username, password, full_name, phone, address)
 *   - public.penjualan (berisi riwayat pembelian user)
 */

const USER_SESSION_KEY = "etherum_birds_user_session_v2";

const AuthManager = {
  user: null, // { id, username, full_name, phone, address }

  // Properti kompatibilitas dengan modul lain
  get session() {
    return this.user ? { user: this.user } : null;
  },

  init() {
    this.loadSession();
    this.ensureAccountModalExists();
    this.updateAccountDropdownUI();
    if (this.user && this.user.username) {
      this.refreshUserFromDb();
    }
  },

  loadSession() {
    try {
      const raw = localStorage.getItem(USER_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username) {
          this.user = parsed;
        }
      }
    } catch (_) {
      this.user = null;
    }
  },

  saveSession(userData) {
    if (!userData || !userData.username) {
      this.user = null;
      localStorage.removeItem(USER_SESSION_KEY);
    } else {
      this.user = userData;
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
    }
    this.updateAccountDropdownUI();
  },

  getDisplayName() {
    if (!this.user) return "";
    return this.user.full_name || this.user.username;
  },

  async refreshUserFromDb() {
    if (!this.user || !this.user.username) return;
    try {
      const rows = await supabaseFetch(
        "users",
        `select=id,username,full_name,phone,address&username=eq.${encodeURIComponent(this.user.username)}&limit=1`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        this.saveSession(rows[0]);
      }
    } catch (_) {}
  },

  /**
   * Daftar Akun Baru -> Simpan ke tabel public.users di Supabase
   */
  async signUp({ username, password, fullName, phone }) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanName = (fullName || cleanUser).trim();
    const cleanPhone = (phone || "").trim();

    if (cleanUser.length < 3) {
      throw new Error("Username minimal 3 karakter.");
    }
    if (cleanPass.length < 4) {
      throw new Error("Password minimal 4 karakter.");
    }

    // Cek apakah username sudah dipakai di tabel public.users
    const existing = await supabaseFetch(
      "users",
      `select=id,username&username=eq.${encodeURIComponent(cleanUser)}&limit=1`
    );
    if (Array.isArray(existing) && existing.length > 0) {
      throw new Error(`Username "${cleanUser}" sudah terdaftar. Silakan gunakan username lain atau langsung Masuk.`);
    }

    const inserted = await supabaseFetch("users", "", {
      method: "POST",
      body: {
        username: cleanUser,
        password: cleanPass,
        full_name: cleanName,
        phone: cleanPhone,
        address: ""
      }
    });

    const userRow = Array.isArray(inserted) && inserted[0] ? inserted[0] : {
      username: cleanUser,
      full_name: cleanName,
      phone: cleanPhone,
      address: ""
    };

    this.saveSession({
      id: userRow.id,
      username: userRow.username,
      full_name: userRow.full_name,
      phone: userRow.phone,
      address: userRow.address || ""
    });

    showToast(`Akun "${cleanUser}" berhasil dibuat! Selamat datang.`);
    this.closeModal();
  },

  /**
   * Masuk (Login) -> Cek username & password ke tabel public.users di Supabase
   */
  async signIn({ username, password }) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const rows = await supabaseFetch(
      "users",
      `select=*&username=eq.${encodeURIComponent(cleanUser)}&limit=1`
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`Username "${cleanUser}" belum terdaftar.`);
    }

    const account = rows[0];
    if (String(account.password) !== cleanPass) {
      throw new Error("Password yang Anda masukkan salah.");
    }

    this.saveSession({
      id: account.id,
      username: account.username,
      full_name: account.full_name || account.username,
      phone: account.phone || "",
      address: account.address || ""
    });

    showToast(`Berhasil masuk sebagai ${this.getDisplayName()}`);
    this.closeModal();
  },

  /**
   * Lupa / Ganti Password User di tabel public.users
   */
  async resetUserPassword({ username, newPassword }) {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = newPassword.trim();

    const rows = await supabaseFetch(
      "users",
      `select=id,username,full_name,phone,address&username=eq.${encodeURIComponent(cleanUser)}&limit=1`
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`Username "${cleanUser}" tidak ditemukan di tabel users.`);
    }

    await supabaseFetch("users", `username=eq.${encodeURIComponent(cleanUser)}`, {
      method: "PATCH",
      body: { password: cleanPass }
    });

    const acc = rows[0];
    this.saveSession({
      id: acc.id,
      username: acc.username,
      full_name: acc.full_name || acc.username,
      phone: acc.phone || "",
      address: acc.address || ""
    });

    showToast("Password berhasil diperbarui dan Anda telah masuk!");
    this.closeModal();
  },

  /**
   * Update Profil User di tabel public.users
   */
  async updateProfile({ fullName, phone, address, newPassword }) {
    if (!this.user || !this.user.username) return;

    const updatePayload = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim()
    };
    if (newPassword && newPassword.trim().length > 0) {
      updatePayload.password = newPassword.trim();
    }

    await supabaseFetch("users", `username=eq.${encodeURIComponent(this.user.username)}`, {
      method: "PATCH",
      body: updatePayload
    });

    this.saveSession({
      ...this.user,
      full_name: updatePayload.full_name,
      phone: updatePayload.phone,
      address: updatePayload.address
    });

    showToast("Profil berhasil diperbarui di Supabase.");
  },

  signOut() {
    this.saveSession(null);
    this.closeModal();
    showToast("Anda telah keluar dari akun.");
  },

  /**
   * Mengatur tampilan Dropdown Akun di Header
   */
  updateAccountDropdownUI() {
    const dropdown = document.getElementById("accountDropdown");
    const accountBtn = document.getElementById("headerAccountBtn");
    if (!dropdown) return;

    const isLoggedIn = Boolean(this.user && this.user.username);

    if (accountBtn) {
      accountBtn.classList.toggle("is-logged-in", isLoggedIn);
      accountBtn.title = isLoggedIn
        ? `Akun: ${this.getDisplayName()} (@${this.user.username})`
        : "Akun Pengguna";
    }

    if (isLoggedIn) {
      dropdown.innerHTML = `
        <div class="account-dropdown-header">
          <div class="account-dropdown-title">${this.escapeHtml(this.getDisplayName())}</div>
          <div class="account-dropdown-sub">@${this.escapeHtml(this.user.username)}</div>
        </div>
        <button type="button" class="dropdown-item" data-account-action="profile">
          <i data-lucide="user-check"></i>
          <span>Profil Saya</span>
        </button>
        <button type="button" class="dropdown-item" data-account-action="orders">
          <i data-lucide="clipboard-list"></i>
          <span>Riwayat Pesanan</span>
        </button>
        <button type="button" class="dropdown-item dropdown-item-danger" data-account-action="logout">
          <i data-lucide="log-out"></i>
          <span>Keluar</span>
        </button>
      `;
    } else {
      dropdown.innerHTML = `
        <div class="account-dropdown-header">
          <div class="account-dropdown-title">Akun ETHERUM_BIRDS</div>
          <div class="account-dropdown-sub">Masuk dengan Username & Password</div>
        </div>
        <button type="button" class="dropdown-item" data-account-action="login">
          <i data-lucide="log-in"></i>
          <span>Masuk</span>
        </button>
        <button type="button" class="dropdown-item" data-account-action="register">
          <i data-lucide="user-plus"></i>
          <span>Daftar Akun</span>
        </button>
      `;
    }

    dropdown.querySelectorAll("[data-account-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-account-action");
        dropdown.classList.remove("active");
        this.handleAction(action);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  },

  handleAction(action) {
    if (action === "login") {
      this.openModal("login");
    } else if (action === "register") {
      this.openModal("register");
    } else if (action === "profile") {
      if (!this.user) return this.openModal("login");
      this.openModal("profile");
    } else if (action === "orders") {
      if (!this.user) return this.openModal("login");
      this.openModal("orders");
    } else if (action === "logout") {
      this.signOut();
    }
  },

  ensureAccountModalExists() {
    if (document.getElementById("accountModalOverlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "accountModalOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="modal-box auth-modal-box">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title" id="accountModalTitle">Akun Pengguna</h3>
            <span class="modal-badge" id="accountModalBadge">Tabel Users</span>
          </div>
          <button type="button" class="modal-close-btn" id="closeAccountModalBtn" aria-label="Tutup">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body" id="accountModalBody"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#closeAccountModalBtn").addEventListener("click", () => {
      this.closeModal();
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeModal();
    });
  },

  openModal(view = "login") {
    this.ensureAccountModalExists();
    this.renderModalView(view);
    const overlay = document.getElementById("accountModalOverlay");
    if (overlay) {
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  closeModal() {
    const overlay = document.getElementById("accountModalOverlay");
    if (overlay) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  renderModalView(view) {
    const titleEl = document.getElementById("accountModalTitle");
    const badgeEl = document.getElementById("accountModalBadge");
    const bodyEl = document.getElementById("accountModalBody");
    if (!bodyEl) return;

    if (view === "login" || view === "register") {
      const isLogin = view === "login";
      if (titleEl) titleEl.textContent = isLogin ? "Masuk ke Akun" : "Daftar Akun User";
      if (badgeEl) badgeEl.textContent = isLogin ? "Masuk" : "Pendaftaran";

      bodyEl.innerHTML = `
        <div class="auth-tabs">
          <button type="button" class="auth-tab ${isLogin ? "active" : ""}" data-switch-view="login">Masuk</button>
          <button type="button" class="auth-tab ${!isLogin ? "active" : ""}" data-switch-view="register">Daftar Akun</button>
        </div>

        <div class="auth-alert" id="authErrorBox" hidden></div>

        <form id="authForm" class="auth-form" autocomplete="on">
          <div class="form-field">
            <label for="authUsername">Username</label>
            <input type="text" id="authUsername" class="form-input" placeholder="Contoh: budi123" required />
          </div>
          ${
            !isLogin
              ? `
            <div class="form-field">
              <label for="authFullName">Nama Lengkap</label>
              <input type="text" id="authFullName" class="form-input" placeholder="Contoh: Budi Santoso" required />
            </div>
            <div class="form-field">
              <label for="authPhone">Nomor WhatsApp</label>
              <input type="tel" id="authPhone" class="form-input" placeholder="Contoh: 081234567890" required />
            </div>
          `
              : ""
          }
          <div class="form-field">
            <div class="form-label-row">
              <label for="authPassword">Password</label>
              ${
                isLogin
                  ? `<button type="button" class="auth-link-btn" data-switch-view="forgot">Lupa password?</button>`
                  : ""
              }
            </div>
            <input type="password" id="authPassword" class="form-input" placeholder="Masukkan password" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="authSubmitBtn">
            <span>${isLogin ? "Masuk Sekarang" : "Daftar & Masuk"}</span>
          </button>
        </form>
      `;

      bodyEl.querySelectorAll("[data-switch-view]").forEach((tab) => {
        tab.addEventListener("click", () => {
          this.renderModalView(tab.getAttribute("data-switch-view"));
        });
      });

      const form = bodyEl.querySelector("#authForm");
      const errorBox = bodyEl.querySelector("#authErrorBox");
      const submitBtn = bodyEl.querySelector("#authSubmitBtn");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Memproses...";

        try {
          const username = bodyEl.querySelector("#authUsername").value;
          const password = bodyEl.querySelector("#authPassword").value;

          if (isLogin) {
            await this.signIn({ username, password });
          } else {
            const fullName = bodyEl.querySelector("#authFullName").value;
            const phone = bodyEl.querySelector("#authPhone").value;
            await this.signUp({ username, password, fullName, phone });
          }
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.hidden = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    } else if (view === "forgot") {
      if (titleEl) titleEl.textContent = "Reset Password User";
      if (badgeEl) badgeEl.textContent = "Tabel Users";

      bodyEl.innerHTML = `
        <p class="auth-helper-text">
          Masukkan <strong>Username</strong> Anda dan ketik <strong>Password Baru</strong> untuk memperbarui password di database.
        </p>
        <div class="auth-alert" id="forgotErrorBox" hidden></div>
        <form id="forgotForm" class="auth-form">
          <div class="form-field">
            <label for="resetUsername">Username Terdaftar</label>
            <input type="text" id="resetUsername" class="form-input" placeholder="Ketik username Anda" required />
          </div>
          <div class="form-field">
            <label for="resetNewPass">Password Baru</label>
            <input type="password" id="resetNewPass" class="form-input" placeholder="Masukkan password baru" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block" id="forgotSubmitBtn">
            <span>Simpan Password Baru</span>
          </button>
          <div class="auth-bottom-links">
            <button type="button" class="auth-link-btn" data-switch-view="login">← Kembali ke Masuk</button>
          </div>
        </form>
      `;

      bodyEl.querySelectorAll("[data-switch-view]").forEach((btn) => {
        btn.addEventListener("click", () => this.renderModalView(btn.getAttribute("data-switch-view")));
      });

      const form = bodyEl.querySelector("#forgotForm");
      const errorBox = bodyEl.querySelector("#forgotErrorBox");
      const submitBtn = bodyEl.querySelector("#forgotSubmitBtn");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";
        try {
          await this.resetUserPassword({
            username: bodyEl.querySelector("#resetUsername").value,
            newPassword: bodyEl.querySelector("#resetNewPass").value
          });
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.hidden = false;
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Simpan Password Baru";
        }
      });
    } else if (view === "profile") {
      if (titleEl) titleEl.textContent = "Profil Saya";
      if (badgeEl) badgeEl.textContent = `@${this.user.username}`;

      bodyEl.innerHTML = `
        <div class="auth-alert" id="profileErrorBox" hidden></div>
        <form id="profileForm" class="auth-form">
          <div class="form-field">
            <label>Username</label>
            <input type="text" class="form-input" value="${this.escapeHtml(this.user.username)}" disabled />
          </div>
          <div class="form-field">
            <label for="profFullName">Nama Lengkap</label>
            <input type="text" id="profFullName" class="form-input" value="${this.escapeHtml(this.user.full_name || "")}" required />
          </div>
          <div class="form-field">
            <label for="profPhone">Nomor WhatsApp</label>
            <input type="tel" id="profPhone" class="form-input" value="${this.escapeHtml(this.user.phone || "")}" placeholder="0812xxxx" />
          </div>
          <div class="form-field">
            <label for="profAddress">Alamat Pengiriman / Kunjungan</label>
            <textarea id="profAddress" class="form-input" rows="2" placeholder="Alamat lengkap Anda">${this.escapeHtml(this.user.address || "")}</textarea>
          </div>
          <div class="form-field">
            <label for="profNewPassword">Ganti Password Baru (Opsional)</label>
            <input type="password" id="profNewPassword" class="form-input" placeholder="Kosongkan jika tidak ingin ganti password" />
          </div>
          <div class="cart-footer-buttons">
            <button type="button" class="btn btn-outline" id="profLogoutBtn">Keluar</button>
            <button type="submit" class="btn btn-primary" id="profSaveBtn">Simpan Profil</button>
          </div>
        </form>
      `;

      bodyEl.querySelector("#profLogoutBtn").addEventListener("click", () => this.signOut());

      const form = bodyEl.querySelector("#profileForm");
      const errorBox = bodyEl.querySelector("#profileErrorBox");
      const saveBtn = bodyEl.querySelector("#profSaveBtn");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorBox.hidden = true;
        saveBtn.disabled = true;
        saveBtn.textContent = "Menyimpan...";
        try {
          await this.updateProfile({
            fullName: bodyEl.querySelector("#profFullName").value,
            phone: bodyEl.querySelector("#profPhone").value,
            address: bodyEl.querySelector("#profAddress").value,
            newPassword: bodyEl.querySelector("#profNewPassword").value
          });
          this.closeModal();
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.hidden = false;
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Simpan Profil";
        }
      });
    } else if (view === "orders") {
      if (titleEl) titleEl.textContent = "Riwayat Pesanan Saya";
      if (badgeEl) badgeEl.textContent = `@${this.user.username}`;
      bodyEl.innerHTML = `<p style="text-align:center; padding:1.5rem 0; color:var(--color-text-gray);">Memuat riwayat pesanan...</p>`;
      this.renderOrdersList(bodyEl);
    }

    if (window.lucide) window.lucide.createIcons();
  },

  async renderOrdersList(container) {
    try {
      const orders = await supabaseFetch(
        "penjualan",
        `select=*&username=eq.${encodeURIComponent(this.user.username)}&order=created_at.desc`
      );
      if (!Array.isArray(orders) || orders.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div>
            <h4 class="empty-state-title">Belum ada riwayat pesanan.</h4>
            <p class="empty-state-sub">Pesanan yang Anda kirim melalui keranjang akan tercatat otomatis di sini.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const list = document.createElement("div");
      list.className = "orders-history-list";

      orders.forEach((ord) => {
        const dateStr = new Date(ord.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
        const items = Array.isArray(ord.items) ? ord.items : [];
        const itemsHtml = items
          .map(
            (i) =>
              `<div class="order-item-line">${this.escapeHtml(i.name)} <span>(${i.quantity}x ${formatRupiah(i.price)})</span></div>`
          )
          .join("");

        const card = document.createElement("div");
        card.className = "order-history-card";
        card.innerHTML = `
          <div class="order-history-top">
            <span class="order-history-date">${dateStr}</span>
            <span class="order-history-status">${this.escapeHtml(ord.status || "Tercatat")}</span>
          </div>
          <div class="order-history-items">${itemsHtml}</div>
          <div class="order-history-bottom">
            <span>Total</span>
            <strong>${formatRupiah(ord.total_amount)}</strong>
          </div>
        `;
        list.appendChild(card);
      });

      container.innerHTML = "";
      container.appendChild(list);
    } catch (_) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i data-lucide="clipboard-list"></i></div>
          <h4 class="empty-state-title">Belum ada riwayat pesanan.</h4>
          <p class="empty-state-sub">Jalankan file supabase/schema.sql di SQL Editor Supabase untuk mengaktifkan tabel penjualan.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
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
  AuthManager.init();
});
