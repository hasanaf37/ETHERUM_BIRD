/**
 * SAMPADA BIRD - Logika Halaman Informasi (pages.js)
 * Mengisi data toko pada halaman Lokasi Kios & Info Penjual dari STORE_CONFIG.
 */

function fillStaticPageData() {
  if (typeof STORE_CONFIG === "undefined") return;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  };

  // Format nomor WA agar mudah dibaca: 62812xxxx -> +62 812-xxxx-xxxx
  const prettyPhone = (num) => {
    const clean = String(num).replace(/[^0-9]/g, "");
    if (!clean.startsWith("62")) return clean;
    const local = clean.slice(2);
    return `+62 ${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`.replace(
      /-$/,
      "",
    );
  };

  set("storeAddress", STORE_CONFIG.address);
  set("storeHours", STORE_CONFIG.operationalHours);
  set("storeEmail", STORE_CONFIG.email);
  set("storePhone", prettyPhone(STORE_CONFIG.whatsappNumber));

  set("sellerStoreName", STORE_CONFIG.name);
  set("sellerName", STORE_CONFIG.sellerName);
  set("sellerBio", STORE_CONFIG.sellerBio);
  set("sellerPhone", prettyPhone(STORE_CONFIG.whatsappNumber));
  set("sellerEmail", STORE_CONFIG.email);
  set("sellerHours", STORE_CONFIG.operationalHours);

  // Tautan email
  document.querySelectorAll(".js-email-link").forEach((a) => {
    a.href = `mailto:${STORE_CONFIG.email}`;
  });

  // Instagram (disembunyikan jika belum diisi)
  document.querySelectorAll(".js-instagram-link").forEach((a) => {
    if (STORE_CONFIG.instagram) {
      a.href = STORE_CONFIG.instagram;
    } else {
      a.hidden = true;
    }
  });

  // Peta
  const mapsLink = document.getElementById("mapsLink");
  const mapsFrame = document.getElementById("mapsFrame");
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    STORE_CONFIG.mapsQuery || STORE_CONFIG.address,
  )}`;
  if (mapsLink) mapsLink.href = mapsSearchUrl;
  if (mapsFrame) mapsFrame.src = createMapsEmbedUrl();

  // Statistik singkat koleksi
  if (typeof PRODUCTS_DATA !== "undefined") {
    const available = PRODUCTS_DATA.filter((p) => p.stock > 0);
    set("statTotalBirds", String(PRODUCTS_DATA.length));
    set("statAvailable", String(available.length));
    set(
      "statCategories",
      String(
        typeof BIRD_CATEGORIES !== "undefined" ? BIRD_CATEGORIES.length : 0,
      ),
    );
  }
}

/**
 * Accordion FAQ sederhana
 */
function initFaq() {
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;
      const isOpen = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fillStaticPageData();
  initFaq();
  if (window.lucide) window.lucide.createIcons();
});
