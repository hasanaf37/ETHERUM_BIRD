/**
 * SAMPADA BIRD - Modul Keranjang Belanja Interaktif (cart.js)
 * Menggunakan LocalStorage dengan validasi data produk dan penanganan error JSON.
 */

const CART_STORAGE_KEY = "sampada_bird_cart_v1";

const CartManager = {
  items: [], // Array of { productId: string, quantity: number }

  /**
   * Inisialisasi keranjang saat halaman dimuat
   */
  init() {
    this.loadFromStorage();
    this.bindEvents();
    this.updateBadge();
  },

  /**
   * Membaca & memvalidasi data keranjang dari LocalStorage
   */
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        this.items = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.items = [];
        return;
      }

      // Filter hanya produk yang valid dan ada di PRODUCTS_DATA serta stok > 0
      this.items = parsed
        .filter((item) => item && typeof item.productId === "string" && Number(item.quantity) > 0)
        .map((item) => {
          const product = this.findProduct(item.productId);
          if (!product || product.stock <= 0) return null;
          const validQty = Math.min(Math.floor(Number(item.quantity)), product.stock);
          return {
            productId: product.id,
            quantity: validQty
          };
        })
        .filter(Boolean);

      this.saveToStorage();
    } catch (error) {
      console.warn("Data LocalStorage keranjang rusak, mereset keranjang:", error);
      this.items = [];
      this.saveToStorage();
    }
  },

  /**
   * Menyimpan state keranjang ke LocalStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
    } catch (error) {
      console.error("Gagal menyimpan ke LocalStorage:", error);
    }
  },

  /**
   * Mencari referensi produk asli dari PRODUCTS_DATA
   */
  findProduct(productId) {
    if (typeof PRODUCTS_DATA === "undefined") return null;
    return PRODUCTS_DATA.find((p) => p.id === productId) || null;
  },

  /**
   * Menambahkan produk ke keranjang
   */
  addItem(productId, qtyToAdd = 1) {
    const product = this.findProduct(productId);
    if (!product) {
      showToast("Produk tidak ditemukan.");
      return false;
    }

    if (product.stock <= 0) {
      showToast("Maaf, stok produk ini sedang habis.");
      return false;
    }

    const existingIndex = this.items.findIndex((i) => i.productId === productId);
    const addAmount = Math.max(1, Number(qtyToAdd) || 1);

    if (existingIndex > -1) {
      const currentQty = this.items[existingIndex].quantity;
      if (currentQty + addAmount > product.stock) {
        this.items[existingIndex].quantity = product.stock;
        this.saveToStorage();
        this.updateBadge();
        this.renderCartModal();
        showToast(`Jumlah maksimum sesuai stok demo (${product.stock} ekor).`);
        return true;
      }
      this.items[existingIndex].quantity += addAmount;
    } else {
      const initialQty = Math.min(addAmount, product.stock);
      this.items.push({ productId: product.id, quantity: initialQty });
    }

    this.saveToStorage();
    this.updateBadge(true);
    this.renderCartModal();
    showToast(`"${product.name}" ditambahkan ke keranjang.`);
    return true;
  },

  /**
   * Menambah jumlah (+1)
   */
  incrementItem(productId) {
    const product = this.findProduct(productId);
    const item = this.items.find((i) => i.productId === productId);
    if (!product || !item) return;

    if (item.quantity >= product.stock) {
      showToast(`Stok demo tersedia maksimal ${product.stock} ekor.`);
      return;
    }

    item.quantity += 1;
    this.saveToStorage();
    this.updateBadge();
    this.renderCartModal();
  },

  /**
   * Mengurangi jumlah (-1), tidak boleh menjadi 0
   */
  decrementItem(productId) {
    const item = this.items.find((i) => i.productId === productId);
    if (!item) return;

    if (item.quantity <= 1) {
      showToast("Gunakan tombol Hapus jika ingin menghapus produk.");
      return;
    }

    item.quantity -= 1;
    this.saveToStorage();
    this.updateBadge();
    this.renderCartModal();
  },

  /**
   * Menghapus satu produk tertentu dari keranjang
   */
  removeItem(productId) {
    const product = this.findProduct(productId);
    const prevLength = this.items.length;
    this.items = this.items.filter((i) => i.productId !== productId);

    if (this.items.length !== prevLength) {
      this.saveToStorage();
      this.updateBadge();
      this.renderCartModal();
      if (product) {
        showToast(`"${product.name}" dihapus dari keranjang.`);
      }
    }
  },

  /**
   * Menghitung total kuantitas seluruh barang
   */
  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  /**
   * Menghitung total belanja keseluruhan dari data produk asli
   */
  getTotalPrice() {
    return this.items.reduce((total, item) => {
      const product = this.findProduct(item.productId);
      if (!product) return total;
      return total + product.price * item.quantity;
    }, 0);
  },

  /**
   * Memperbarui badge angka pada header dan modal
   */
  updateBadge(animate = false) {
    const count = this.getTotalCount();
    const headerBadge = document.getElementById("headerCartBadge");
    const modalBadge = document.getElementById("modalCartBadge");

    if (headerBadge) {
      headerBadge.textContent = String(count);
      if (animate) {
        headerBadge.classList.remove("bump");
        void headerBadge.offsetWidth;
        headerBadge.classList.add("bump");
      }
    }

    if (modalBadge) {
      modalBadge.textContent = `${count} Barang`;
    }
  },

  /**
   * Membuka modal keranjang
   */
  openCartModal() {
    this.renderCartModal("cart");
    const overlay = document.getElementById("cartModalOverlay");
    if (overlay) {
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  /**
   * Menutup modal keranjang (Tombol Batal / X / Escape)
   * Aturan wajib: Mempertahankan isi keranjang dan TIDAK mengosongkan LocalStorage
   */
  closeCartModal() {
    const overlay = document.getElementById("cartModalOverlay");
    if (overlay) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  },

  /**
   * Merender isi modal keranjang atau ringkasan pesanan (mode: 'cart' | 'checkout')
   */
  renderCartModal(mode = "cart") {
    const bodyEl = document.getElementById("cartModalBody");
    const footerEl = document.getElementById("cartModalFooter");
    const titleEl = document.getElementById("cartModalTitle");
    if (!bodyEl || !footerEl) return;

    bodyEl.innerHTML = "";
    footerEl.innerHTML = "";

    // Jika keranjang kosong
    if (this.items.length === 0) {
      if (titleEl) titleEl.textContent = "Keranjang Belanja";
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state";
      emptyDiv.innerHTML = `
        <div class="empty-state-icon">
          <i data-lucide="shopping-bag"></i>
        </div>
        <h4 class="empty-state-title">Keranjangmu masih kosong.</h4>
        <p class="empty-state-sub">Yuk, temukan burung favoritmu.</p>
        <button type="button" class="btn btn-primary" id="emptyCartExploreBtn">
          Lihat Koleksi
        </button>
      `;
      bodyEl.appendChild(emptyDiv);

      const exploreBtn = emptyDiv.querySelector("#emptyCartExploreBtn");
      if (exploreBtn) {
        exploreBtn.addEventListener("click", () => {
          this.closeCartModal();
          window.location.href = "koleksi.html";
        });
      }

      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Mode Ringkasan Pesanan (Ketika tombol Beli diklik)
    if (mode === "checkout") {
      if (titleEl) titleEl.textContent = "Ringkasan Pesanan";

      const notice = document.createElement("div");
      notice.className = "checkout-notice";
      notice.textContent =
        "Periksa kembali daftar pesanan Anda. Karena sistem pembayaran otomatis masih dalam tahap pengembangan backend, pemesanan diteruskan langsung ke penjual melalui WhatsApp.";
      bodyEl.appendChild(notice);

      const summaryList = document.createElement("div");
      summaryList.className = "checkout-summary-list";

      this.items.forEach((item) => {
        const product = this.findProduct(item.productId);
        if (!product) return;
        const subtotal = product.price * item.quantity;

        const row = document.createElement("div");
        row.className = "checkout-item-row";

        const leftInfo = document.createElement("div");
        const nameStrong = document.createElement("strong");
        nameStrong.textContent = product.name;
        const qtySpan = document.createElement("div");
        qtySpan.style.fontSize = "0.8rem";
        qtySpan.style.color = "var(--color-text-gray)";
        qtySpan.textContent = `${item.quantity} x ${formatRupiah(product.price)}`;

        leftInfo.appendChild(nameStrong);
        leftInfo.appendChild(qtySpan);

        const rightSubtotal = document.createElement("strong");
        rightSubtotal.style.color = "var(--color-dark-green)";
        rightSubtotal.textContent = formatRupiah(subtotal);

        row.appendChild(leftInfo);
        row.appendChild(rightSubtotal);
        summaryList.appendChild(row);
      });

      bodyEl.appendChild(summaryList);

      // Footer Ringkasan
      const totalAmount = this.getTotalPrice();
      footerEl.innerHTML = `
        <div class="cart-summary-row">
          <span class="cart-total-label">Total Estimasi Belanja</span>
          <span class="cart-total-amount" id="checkoutTotalAmount"></span>
        </div>
        <div class="cart-footer-buttons">
          <button type="button" class="btn btn-outline" id="backToCartBtn">
            Kembali ke Keranjang
          </button>
          <button type="button" class="btn btn-primary" id="confirmWhatsAppOrderBtn">
            <i data-lucide="message-circle"></i>
            Hubungi Penjual via WhatsApp
          </button>
        </div>
      `;

      footerEl.querySelector("#checkoutTotalAmount").textContent = formatRupiah(totalAmount);

      footerEl.querySelector("#backToCartBtn").addEventListener("click", () => {
        this.renderCartModal("cart");
      });

      footerEl.querySelector("#confirmWhatsAppOrderBtn").addEventListener("click", () => {
        this.sendOrderToWhatsApp();
      });

      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Mode Default: Daftar Keranjang Interaktif
    if (titleEl) titleEl.textContent = "Keranjang Belanja";

    const listContainer = document.createElement("div");
    listContainer.className = "cart-items-list";

    this.items.forEach((item) => {
      const product = this.findProduct(item.productId);
      if (!product) return;

      const subtotal = product.price * item.quantity;

      const itemEl = document.createElement("div");
      itemEl.className = "cart-item";

      // Gambar
      const imgEl = document.createElement("img");
      imgEl.className = "cart-item-img";
      imgEl.src = product.image;
      imgEl.alt = product.name;

      // Info Teks
      const infoEl = document.createElement("div");
      infoEl.className = "cart-item-info";

      const titleH5 = document.createElement("h5");
      titleH5.className = "cart-item-title";
      titleH5.textContent = product.name;

      const priceP = document.createElement("p");
      priceP.className = "cart-item-price";
      priceP.textContent = formatRupiah(product.price);

      const subP = document.createElement("p");
      subP.className = "cart-item-subtotal";
      subP.textContent = `Subtotal: ${formatRupiah(subtotal)}`;

      infoEl.appendChild(titleH5);
      infoEl.appendChild(priceP);
      infoEl.appendChild(subP);

      // Kontrol Kuantitas & Hapus
      const controlsEl = document.createElement("div");
      controlsEl.className = "cart-item-controls";

      const qtyBox = document.createElement("div");
      qtyBox.className = "qty-control";

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "qty-btn";
      minusBtn.textContent = "-";
      minusBtn.setAttribute("aria-label", "Kurangi jumlah");
      if (item.quantity <= 1) minusBtn.disabled = true;
      minusBtn.addEventListener("click", () => this.decrementItem(product.id));

      const qtyVal = document.createElement("span");
      qtyVal.className = "qty-value";
      qtyVal.textContent = String(item.quantity);

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "qty-btn";
      plusBtn.textContent = "+";
      plusBtn.setAttribute("aria-label", "Tambah jumlah");
      if (item.quantity >= product.stock) plusBtn.disabled = true;
      plusBtn.addEventListener("click", () => this.incrementItem(product.id));

      qtyBox.appendChild(minusBtn);
      qtyBox.appendChild(qtyVal);
      qtyBox.appendChild(plusBtn);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-item-btn";
      removeBtn.innerHTML = `<i data-lucide="trash-2"></i><span>Hapus</span>`;
      removeBtn.addEventListener("click", () => this.removeItem(product.id));

      controlsEl.appendChild(qtyBox);
      controlsEl.appendChild(removeBtn);

      itemEl.appendChild(imgEl);
      itemEl.appendChild(infoEl);
      itemEl.appendChild(controlsEl);

      listContainer.appendChild(itemEl);
    });

    bodyEl.appendChild(listContainer);

    // Footer Total, Tombol Batal & Tombol Beli
    const totalAmount = this.getTotalPrice();
    footerEl.innerHTML = `
      <div class="cart-summary-row">
        <span class="cart-total-label">Total Belanja</span>
        <span class="cart-total-amount" id="cartTotalAmountText"></span>
      </div>
      <div class="cart-footer-buttons">
        <button type="button" class="btn btn-outline" id="cartCancelBtn">
          Batal
        </button>
        <button type="button" class="btn btn-primary" id="cartCheckoutBtn">
          Beli Sekarang
        </button>
      </div>
    `;

    footerEl.querySelector("#cartTotalAmountText").textContent = formatRupiah(totalAmount);

    // Tombol Batal wajib hanya menutup modal tanpa menghapus isi keranjang
    footerEl.querySelector("#cartCancelBtn").addEventListener("click", () => {
      this.closeCartModal();
    });

    // Tombol Beli menampilkan ringkasan pesanan
    footerEl.querySelector("#cartCheckoutBtn").addEventListener("click", () => {
      if (this.items.length === 0) {
        showToast("Keranjang belanja Anda masih kosong.");
        return;
      }
      this.renderCartModal("checkout");
    });

    if (window.lucide) window.lucide.createIcons();
  },

  /**
   * Membuka WhatsApp dengan format rincian daftar produk, jumlah, dan total belanja
   */
  sendOrderToWhatsApp() {
    if (this.items.length === 0) return;

    let lines = [
      `Halo *${STORE_CONFIG.name}*, saya ingin menanyakan ketersediaan dan memesan burung berikut:`,
      ""
    ];

    const orderSnapshot = [];
    this.items.forEach((item, index) => {
      const product = this.findProduct(item.productId);
      if (!product) return;
      const subtotal = product.price * item.quantity;
      orderSnapshot.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });
      lines.push(
        `${index + 1}. *${product.name}* (${item.quantity} ekor x ${formatRupiah(product.price)}) = ${formatRupiah(subtotal)}`
      );
    });

    lines.push("");
    lines.push(`*Total Estimasi: ${formatRupiah(this.getTotalPrice())}*`);
    lines.push("");
    lines.push("Mohon informasi ketersediaan stok aktual dan prosedur pemesanannya. Terima kasih.");

    const buyerName =
      typeof AuthManager !== "undefined" && AuthManager.session
        ? AuthManager.getDisplayName()
        : "Pelanggan WhatsApp";

    if (typeof AdminManager !== "undefined") {
      AdminManager.createSaleRecord({
        customerName: buyerName,
        items: orderSnapshot,
        totalAmount: this.getTotalPrice(),
        status: "Diteruskan ke WhatsApp",
        reduceStock: false
      });
    } else if (typeof AuthManager !== "undefined" && AuthManager.session) {
      AuthManager.recordOrder(orderSnapshot, this.getTotalPrice());
    }

    const waUrl = createWhatsAppUrl(lines.join("\n"));
    window.open(waUrl, "_blank", "noopener,noreferrer");
  },

  /**
   * Memasang event listener pada tombol keranjang di header dan tombol tutup modal
   */
  bindEvents() {
    const openBtn = document.getElementById("headerCartBtn");
    const closeBtn = document.getElementById("closeCartModalBtn");
    const overlay = document.getElementById("cartModalOverlay");

    if (openBtn) {
      openBtn.addEventListener("click", () => this.openCartModal());
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeCartModal());
    }

    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          this.closeCartModal();
        }
      });
    }
  }
};
