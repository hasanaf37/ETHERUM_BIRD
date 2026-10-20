/**
 * SAMPADA BIRD - Data & Konfigurasi Utama (Frontend Demo)
 * Catatan: Pada tahap integrasi Laravel, data ini akan digantikan oleh database & API.
 */

const STORE_CONFIG = {
  name: "ETHERUM_BIRDS",
  tagline: "Bird Shop",
  whatsappNumber: "6281615226087",
  whatsappDefaultMsg: "Halo ETHERUM_BIRDS, saya ingin bertanya mengenai koleksi burung kicau yang tersedia.",
  address: "[Placeholder Alamat: Jl. Nama Jalan No. XX, Kecamatan, Kota/Kabupaten, Provinsi - Silakan sesuaikan]",
  operationalHours: "Senin - Minggu: 08.00 - 17.00 WIB (Data Demo)",
  mapsUrl: "https://maps.google.com",
  // Kata kunci / koordinat lokasi untuk peta tersemat (iframe). Contoh: "-6.200000,106.816666" atau "Pasar Burung Pramuka Jakarta"
  mapsQuery: "Pasar Burung Pramuka Jakarta",
  email: "info@sampadabird.demo",
  sellerName: "[Placeholder Nama Pemilik]",
  sellerBio:
    "Penghobi burung kicau yang membuka kios SAMPADA BIRD untuk membantu sesama pecinta burung menemukan koleksi yang sehat dan terawat. (Data Demo)",
  instagram: "" // Opsional, contoh: "https://instagram.com/sampadabird"
};

/**
 * URL peta tersemat (Google Maps embed tanpa API key)
 */
function createMapsEmbedUrl() {
  const q = STORE_CONFIG.mapsQuery || STORE_CONFIG.address;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}

const BIRD_CATEGORIES = [
  {
    id: "Burung Kicau",
    name: "Burung Kicau",
    icon: "music",
    description: "Koleksi burung dengan karakter suara merdu dan variasi lagu."
  },
  {
    id: "Burung Hutan",
    name: "Burung Hutan",
    icon: "trees",
    description: "Burung berkarakter alami dengan daya tarik suara khas alam."
  },
  {
    id: "Burung Lokal",
    name: "Burung Lokal",
    icon: "map-pin",
    description: "Burung pilihan dari berbagai daerah kepulauan Nusantara."
  },
  {
    id: "Burung Impor",
    name: "Burung Impor",
    icon: "globe",
    description: "Koleksi burung eksotis luar negeri untuk penghobi."
  },
  {
    id: "Burung Dewasa",
    name: "Burung Dewasa",
    icon: "award",
    description: "Burung usia mapan yang siap rawat dan pantau suara."
  },
  {
    id: "Burung Muda",
    name: "Burung Muda",
    icon: "sparkles",
    description: "Burung bahan/muda potensial untuk pemasteran sejak dini."
  }
];

const PRODUCTS_DATA = [
  {
    id: "sb-001",
    name: "Jongkangan Coklat Ori Jabar",
    category: "Burung Hutan",
    tags: ["Burung Kicau", "Burung Hutan", "Burung Lokal", "Burung Dewasa"],
    price: 150000,
    stock: 3,
    isFeatured: true,
    createdAt: "2026-10-01",
    // Menggunakan foto burung asli dari Unsplash sebagai placeholder yang relevan, mudah diganti ke assets/images/birds/...
    image: "https://images.unsplash.com/photo-1544923408-75c5cef46f14?auto=format&fit=crop&w=700&q=80",
    ageInfo: "Data demo (Konfirmasi ke penjual)",
    conditionInfo: "Data demo - Pantau langsung di kios atau minta video via WhatsApp",
    description: "Jongkangan Coklat Ori Jabar (Data Demo). Karakter burung hutan dengan suara khas. Informasi usia, asal detail, dan kondisi aktual dapat dikonfirmasi langsung kepada penjual sebelum memesan."
  },
  {
    id: "sb-002",
    name: "Kepodang Damer",
    category: "Burung Lokal",
    tags: ["Burung Kicau", "Burung Lokal", "Burung Dewasa"],
    price: 350000,
    stock: 2,
    isFeatured: true,
    createdAt: "2026-10-03",
    image: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=700&q=80",
    ageInfo: "Data demo (Konfirmasi ke penjual)",
    conditionInfo: "Data demo - Silakan hubungi penjual untuk cek kondisi terkini",
    description: "Kepodang Damer (Data Demo). Memiliki warna bulu kontras yang elegan serta siulan khas. Stok, usia, dan kondisi riil merupakan data simulasi frontend."
  },
  {
    id: "sb-003",
    name: "Kepodang Sungu",
    category: "Burung Kicau",
    tags: ["Burung Kicau", "Burung Lokal", "Burung Dewasa"],
    price: 400000,
    stock: 1,
    isFeatured: true,
    createdAt: "2026-10-05",
    image: "https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=700&q=80",
    ageInfo: "Data demo (Konfirmasi ke penjual)",
    conditionInfo: "Data demo - Silakan hubungi penjual untuk cek kondisi terkini",
    description: "Kepodang Sungu (Data Demo). Salah satu primadona burung kicau berpostur tegap. Harga dan stok yang tertera adalah data demo untuk keperluan tampilan sistem."
  },
  {
    id: "sb-004",
    name: "Blue Robin",
    category: "Burung Impor",
    tags: ["Burung Kicau", "Burung Impor", "Burung Dewasa"],
    price: 850000,
    stock: 2,
    isFeatured: true,
    createdAt: "2026-10-08",
    image: "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=700&q=80",
    ageInfo: "Data demo (Konfirmasi ke penjual)",
    conditionInfo: "Data demo - Silakan hubungi penjual untuk cek kondisi terkini",
    description: "Blue Robin (Data Demo). Burung eksotis dengan warna bulu biru menawan dan kicauan kristal. Seluruh atribut harga dan ketersediaan pada halaman ini berstatus data demo."
  },
  {
    id: "sb-005",
    name: "Pleci Dakun Jabar",
    category: "Burung Kicau",
    tags: ["Burung Kicau", "Burung Lokal", "Burung Muda"],
    price: 120000,
    stock: 5,
    isFeatured: false,
    createdAt: "2026-10-10",
    image: "https://images.unsplash.com/photo-1480044965905-02098d419e96?auto=format&fit=crop&w=700&q=80",
    ageInfo: "Data demo (Konfirmasi ke penjual)",
    conditionInfo: "Data demo - Silakan hubungi penjual untuk cek kondisi terkini",
    description: "Pleci Dakun Jabar (Data Demo). Burung mungil yang digemari para penghobi karena karakter suara ngalas dan bukaan paruhnya. Data masih bersifat demo."
  },
  {
    id: "sb-006",
    name: "Cendet Matahari",
    category: "Burung Lokal",
    tags: ["Burung Kicau", "Burung Lokal", "Burung Muda"],
    price: 200000,
    stock: 0, // Sengaja diset 0 untuk demonstrasi fitur stok habis
    isFeatured: false,
    createdAt: "2026-10-12",
    image: "https://images.unsplash.com/photo-1518992028580-6d57bd80f2dd?auto=format&fit=crop&w=700&q=80",
    ageInfo: "Data demo (Konfirmasi ke penjual)",
    conditionInfo: "Stok Demo Habis",
    description: "Cendet Matahari (Data Demo). Burung cerdas dengan kemampuan menirukan berbagai suara masteran. Saat ini ditampilkan habis untuk menguji fitur validasi stok habis."
  }
];

/**
 * Helper Format Mata Uang Rupiah yang Konsisten
 */
function formatRupiah(amount) {
  const num = Number(amount) || 0;
  return "Rp" + num.toLocaleString("id-ID");
}

/**
 * Helper Pembuat URL WhatsApp
 */
function createWhatsAppUrl(customMessage) {
  const message = customMessage || STORE_CONFIG.whatsappDefaultMsg;
  const cleanNumber = STORE_CONFIG.whatsappNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
