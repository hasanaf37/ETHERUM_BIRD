/**
 * ETHERUM_BIRDS - Konfigurasi & Sinkronisasi Supabase (js/supabase.js)
 * Terintegrasi langsung dengan tabel:
 *   - public.stok      (Data katalog & stok burung)
 *   - public.penjualan (Data transaksi penjualan burung)
 *   - public.admin     (Username & password admin)
 *   - public.users     (Username & password user pelanggan)
 */

const SUPABASE_CONFIG = {
  url: "https://icekzrcsyijvirvftrdy.supabase.co",
  publishableKey: "sb_publishable_G5539ckx8cGwRmNVjVS3eQ_SdUnnrW9"
};

window.IS_SUPABASE_LIVE = false;

/**
 * Helper memanggil endpoint REST Supabase (PostgREST)
 */
async function supabaseFetch(table, query = "", options = {}) {
  const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${table}${query ? "?" + query : ""}`;
  const res = await fetch(endpoint, {
    method: options.method || "GET",
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.publishableKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Prefer: options.prefer || "return=representation"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && (data.message || data.details)) || `Supabase HTTP ${res.status}`);
  }
  return data;
}

/**
 * Memuat data stok burung dari tabel public.stok (atau fallback ke public.products)
 */
async function syncFromSupabase() {
  try {
    let stokRows = null;
    try {
      stokRows = await supabaseFetch("stok", "select=*&order=created_at.desc");
    } catch (_) {
      stokRows = await supabaseFetch("products", "select=*&order=created_at.desc");
    }

    if (Array.isArray(stokRows) && stokRows.length > 0) {
      PRODUCTS_DATA.length = 0;
      stokRows.forEach((row) => {
        PRODUCTS_DATA.push({
          id: row.id,
          name: row.name,
          category: row.category || "Burung Kicau",
          tags:
            Array.isArray(row.tags) && row.tags.length > 0
              ? row.tags
              : [row.category || "Burung Kicau", "Burung Kicau"],
          price: Number(row.price) || 0,
          stock: Number(row.stock) || 0,
          sold: Number(row.sold) || 0,
          isFeatured: Boolean(row.is_featured),
          createdAt: row.created_at || new Date().toISOString(),
          image: row.image || "assets/icons/favicon.svg",
          ageInfo: row.age_info || "-",
          conditionInfo:
            Number(row.stock) > 0
              ? row.condition_info && row.condition_info !== "Stok Habis"
                ? row.condition_info
                : "Sehat & terawat"
              : "Stok Habis",
          description: row.description || ""
        });
      });
      window.IS_SUPABASE_LIVE = true;
    }

    // Render ulang seluruh komponen di halaman aktif setelah data dari tabel stok masuk
    if (typeof CartManager !== "undefined") {
      CartManager.loadFromStorage();
      CartManager.updateBadge();
    }
    if (typeof initHomePage === "function") initHomePage();
    if (typeof renderCategoryFilters === "function") renderCategoryFilters();
    if (typeof renderCollectionPage === "function") renderCollectionPage();
    if (typeof fillStaticPageData === "function") fillStaticPageData();
    if (typeof AdminManager !== "undefined" && AdminManager.isOnAdminPage()) {
      await AdminManager.loadOrders();
      AdminManager.renderAdminPage();
    }
  } catch (err) {
    console.info("[ETHERUM_BIRDS] Menggunakan data cadangan lokal:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  syncFromSupabase();
});
