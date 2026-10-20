-- ============================================================================
-- ETHERUM_BIRDS - Skema Database Supabase (Tabel: admin, users, stok, penjualan)
-- Cara pakai:
--   1. Buka Supabase Dashboard > SQL Editor > New query
--   2. Tempel seluruh isi file ini lalu klik "Run"
-- Aman dijalankan ulang kapan saja (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABEL ADMIN (Berisi Username & Password Admin)
-- ---------------------------------------------------------------------------
create table if not exists public.admin (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  password   text not null,
  full_name  text not null default 'Administrator ETHERUM_BIRDS',
  created_at timestamptz not null default now()
);

-- Akun Admin Bawaan: username = admin | password = admin123
insert into public.admin (username, password, full_name)
values ('admin', 'admin123', 'Admin ETHERUM_BIRDS')
on conflict (username) do update
  set password = excluded.password;

-- ---------------------------------------------------------------------------
-- 2. TABEL USERS (Berisi Username & Password User Pelanggan)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  username   text unique not null,
  password   text not null,
  full_name  text not null default '',
  phone      text not null default '',
  address    text not null default '',
  created_at timestamptz not null default now()
);

-- Contoh Akun User Bawaan: username = user1 | password = user123
insert into public.users (username, password, full_name, phone, address)
values ('user1', 'user123', 'Pelanggan ETHERUM_BIRDS', '081234567890', 'Jakarta')
on conflict (username) do nothing;

-- ---------------------------------------------------------------------------
-- 3. TABEL STOK (Katalog & Stok Burung Terintegrasi Website + Dashboard Admin)
-- ---------------------------------------------------------------------------
create table if not exists public.stok (
  id             text primary key default ('sb-' || substr(gen_random_uuid()::text, 1, 8)),
  name           text not null,
  category       text not null default 'Burung Kicau',
  tags           text[] not null default '{}',
  price          integer not null default 0 check (price >= 0),
  stock          integer not null default 0 check (stock >= 0),
  sold           integer not null default 0 check (sold >= 0),
  is_featured    boolean not null default true,
  image          text,
  age_info       text default 'Dewasa / Siap Rawat',
  condition_info text default 'Sehat & terawat',
  description    text default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Data Awal Tabel Stok Burung
insert into public.stok
  (id, name, category, tags, price, stock, sold, is_featured, created_at, image, age_info, condition_info, description)
values
  ('sb-001', 'Jongkangan Coklat Ori Jabar', 'Burung Hutan',
   '{"Burung Kicau","Burung Hutan","Burung Lokal","Burung Dewasa"}', 150000, 3, 0, true, '2026-10-01',
   'https://images.unsplash.com/photo-1544923408-75c5cef46f14?auto=format&fit=crop&w=700&q=80',
   'Dewasa mapan', 'Sehat & terawat - Pantau langsung di kios atau minta video via WhatsApp',
   'Jongkangan Coklat Ori Jabar. Karakter burung hutan dengan suara khas.'),
  ('sb-002', 'Kepodang Damer', 'Burung Lokal',
   '{"Burung Kicau","Burung Lokal","Burung Dewasa"}', 350000, 2, 0, true, '2026-10-03',
   'https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=700&q=80',
   'Dewasa mapan', 'Sehat & mulus - Silakan hubungi penjual untuk cek kondisi terkini',
   'Kepodang Damer. Memiliki warna bulu kontras yang elegan serta siulan khas.'),
  ('sb-003', 'Kepodang Sungu', 'Burung Kicau',
   '{"Burung Kicau","Burung Lokal","Burung Dewasa"}', 400000, 1, 0, true, '2026-10-05',
   'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=700&q=80',
   'Dewasa mapan', 'Sehat & rajin bunyi - Silakan hubungi penjual untuk cek kondisi terkini',
   'Kepodang Sungu. Salah satu primadona burung kicau berpostur tegap.'),
  ('sb-004', 'Blue Robin', 'Burung Impor',
   '{"Burung Kicau","Burung Impor","Burung Dewasa"}', 850000, 2, 0, true, '2026-10-08',
   'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=700&q=80',
   'Dewasa', 'Sehat & aktif - Silakan hubungi penjual untuk cek kondisi terkini',
   'Blue Robin. Burung eksotis dengan warna bulu biru menawan dan kicauan kristal.'),
  ('sb-005', 'Pleci Dakun Jabar', 'Burung Kicau',
   '{"Burung Kicau","Burung Lokal","Burung Muda"}', 120000, 5, 0, false, '2026-10-10',
   'https://images.unsplash.com/photo-1480044965905-02098d419e96?auto=format&fit=crop&w=700&q=80',
   'Muda prospek', 'Sehat & lincah - Silakan hubungi penjual untuk cek kondisi terkini',
   'Pleci Dakun Jabar. Burung mungil yang digemari para penghobi karena karakter suara ngalas.'),
  ('sb-006', 'Cendet Matahari', 'Burung Lokal',
   '{"Burung Kicau","Burung Lokal","Burung Muda"}', 200000, 0, 1, false, '2026-10-12',
   'https://images.unsplash.com/photo-1518992028580-6d57bd80f2dd?auto=format&fit=crop&w=700&q=80',
   'Muda', 'Stok Habis',
   'Cendet Matahari. Burung cerdas dengan kemampuan menirukan berbagai suara masteran.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. TABEL PENJUALAN (Monitor Penjualan Burung untuk Dashboard Admin & User)
-- ---------------------------------------------------------------------------
create table if not exists public.penjualan (
  id            uuid primary key default gen_random_uuid(),
  username      text default '',
  customer_name text not null default 'Pelanggan',
  items         jsonb not null default '[]'::jsonb,
  total_amount  integer not null default 0 check (total_amount >= 0),
  status        text not null default 'Selesai / Terjual',
  created_at    timestamptz not null default now()
);

create index if not exists penjualan_created_idx on public.penjualan (created_at desc);

-- ---------------------------------------------------------------------------
-- 5. IZIN AKSES (Row Level Security Policies agar Website & Dashboard Terintegrasi)
-- ---------------------------------------------------------------------------
alter table public.admin     enable row level security;
alter table public.users     enable row level security;
alter table public.stok      enable row level security;
alter table public.penjualan enable row level security;

-- Kebijakan Tabel admin
drop policy if exists "Akses tabel admin" on public.admin;
create policy "Akses tabel admin"
  on public.admin for all
  to anon, authenticated
  using (true)
  with check (true);

-- Kebijakan Tabel users
drop policy if exists "Akses tabel users" on public.users;
create policy "Akses tabel users"
  on public.users for all
  to anon, authenticated
  using (true)
  with check (true);

-- Kebijakan Tabel stok
drop policy if exists "Akses penuh tabel stok" on public.stok;
create policy "Akses penuh tabel stok"
  on public.stok for all
  to anon, authenticated
  using (true)
  with check (true);

-- Kebijakan Tabel penjualan
drop policy if exists "Akses penuh tabel penjualan" on public.penjualan;
create policy "Akses penuh tabel penjualan"
  on public.penjualan for all
  to anon, authenticated
  using (true)
  with check (true);
