-- =====================================================================
-- Toko Gitar AYRI: database layanan servis, nota, dan artikel
--
-- Cara pakai: Supabase > SQL Editor > New query > tempel seluruh isi
-- file ini > Run. Aman dijalankan ulang (tidak menghapus data).
--
-- Prinsip keamanan:
--  * Semua tabel memakai Row Level Security (RLS). Tanpa login admin,
--    tabel servis TIDAK BISA dibaca sama sekali.
--  * Pelanggan hanya bisa melihat SATU servis lewat fungsi cek_servis()
--    dengan kode servis + 4 digit terakhir no. HP yang cocok.
--  * Artikel hanya bisa dibaca publik kalau statusnya 'terbit'.
-- =====================================================================

-- ---------- Admin ----------
create table if not exists public.admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- sengaja tanpa policy: daftar admin tidak bisa dibaca lewat API

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.hari_ini()
returns date
language sql stable
as $$
    select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- ---------- Servis ----------
create table if not exists public.servis (
    id uuid primary key default gen_random_uuid(),
    kode text not null unique,
    nama text not null,
    hp text not null,
    hp4 text generated always as (right(regexp_replace(hp, '[^0-9]', '', 'g'), 4)) stored,
    tgl_masuk date not null default public.hari_ini(),
    gitar_jenis text not null default '',
    gitar_merk text not null default '',
    keluhan text not null default '',
    status text not null default 'menunggu_dp'
        check (status in ('menunggu_dp', 'antri', 'dikerjakan', 'selesai', 'diambil', 'batal')),
    estimasi date,
    tgl_selesai date,
    tgl_diambil date,
    diskon integer not null default 0 check (diskon >= 0),
    saran text not null default '',
    catatan_publik text not null default '',
    catatan_admin text not null default '',
    izin_publikasi boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists servis_status_idx on public.servis (status);
create index if not exists servis_dibuat_idx on public.servis (created_at desc);

-- jasa dan part (garansi: '7h' = 7 hari, '1b' = 1 bulan, '6b' = 6 bulan, kosong = tanpa garansi)
create table if not exists public.servis_item (
    id uuid primary key default gen_random_uuid(),
    servis_id uuid not null references public.servis (id) on delete cascade,
    jenis text not null default 'jasa' check (jenis in ('jasa', 'part')),
    nama text not null,
    harga integer not null default 0 check (harga >= 0),
    qty integer not null default 1 check (qty > 0),
    garansi text not null default '' check (garansi ~ '^([0-9]+[hb])?$'),
    garansi_syarat text not null default '',
    urut integer not null default 0,
    created_at timestamptz not null default now()
);
create index if not exists servis_item_servis_idx on public.servis_item (servis_id);

create table if not exists public.servis_bayar (
    id uuid primary key default gen_random_uuid(),
    servis_id uuid not null references public.servis (id) on delete cascade,
    tgl date not null default public.hari_ini(),
    jumlah integer not null check (jumlah > 0),
    jenis text not null default 'dp' check (jenis in ('dp', 'pelunasan', 'tambahan')),
    metode text not null default 'tunai' check (metode in ('tunai', 'transfer', 'qris')),
    catatan text not null default '',
    created_at timestamptz not null default now()
);
create index if not exists servis_bayar_servis_idx on public.servis_bayar (servis_id);

-- foto disimpan di Storage (bucket 'servis'); tabel ini mencatat alamat dan siapa yang boleh melihat
create table if not exists public.servis_foto (
    id uuid primary key default gen_random_uuid(),
    servis_id uuid not null references public.servis (id) on delete cascade,
    tahap text not null default 'sebelum' check (tahap in ('sebelum', 'kerusakan', 'sesudah')),
    path text not null,
    url text not null,
    thumb_path text not null default '',
    thumb_url text not null default '',
    keterangan text not null default '',
    tampil boolean not null default true,
    created_at timestamptz not null default now()
);
create index if not exists servis_foto_servis_idx on public.servis_foto (servis_id);

-- ---------- Artikel ----------
create table if not exists public.artikel (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    judul text not null,
    ringkasan text not null default '',
    isi text not null default '',
    tag text not null default 'Hasil Servis',
    foto jsonb not null default '[]'::jsonb,
    status text not null default 'draf' check (status in ('draf', 'terbit')),
    servis_id uuid references public.servis (id) on delete set null,
    terbit_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ---------- Pemicu otomatis ----------
create or replace function public.servis_sebelum_ubah()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    if new.status = 'selesai' and new.tgl_selesai is null then new.tgl_selesai := public.hari_ini(); end if;
    if new.status = 'diambil' then
        if new.tgl_selesai is null then new.tgl_selesai := public.hari_ini(); end if;
        if new.tgl_diambil is null then new.tgl_diambil := public.hari_ini(); end if;
    end if;
    return new;
end;
$$;
drop trigger if exists servis_sebelum_ubah on public.servis;
create trigger servis_sebelum_ubah before insert or update on public.servis
    for each row execute function public.servis_sebelum_ubah();

create or replace function public.artikel_sebelum_ubah()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    if new.status = 'terbit' and new.terbit_at is null then new.terbit_at := now(); end if;
    return new;
end;
$$;
drop trigger if exists artikel_sebelum_ubah on public.artikel;
create trigger artikel_sebelum_ubah before insert or update on public.artikel
    for each row execute function public.artikel_sebelum_ubah();

-- ---------- Hak akses (RLS) ----------
alter table public.servis enable row level security;
alter table public.servis_item enable row level security;
alter table public.servis_bayar enable row level security;
alter table public.servis_foto enable row level security;
alter table public.artikel enable row level security;

-- pengunjung tanpa login tidak punya hak apa pun atas data servis
revoke all on public.admins, public.servis, public.servis_item, public.servis_bayar, public.servis_foto from anon;
grant select, insert, update, delete on public.servis, public.servis_item, public.servis_bayar, public.servis_foto, public.artikel to authenticated;
grant select on public.artikel to anon;

drop policy if exists "admin kelola servis" on public.servis;
create policy "admin kelola servis" on public.servis for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin kelola item" on public.servis_item;
create policy "admin kelola item" on public.servis_item for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin kelola bayar" on public.servis_bayar;
create policy "admin kelola bayar" on public.servis_bayar for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin kelola foto" on public.servis_foto;
create policy "admin kelola foto" on public.servis_foto for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin kelola artikel" on public.artikel;
create policy "admin kelola artikel" on public.artikel for all to authenticated
    using (public.is_admin()) with check (public.is_admin());
drop policy if exists "publik baca artikel terbit" on public.artikel;
create policy "publik baca artikel terbit" on public.artikel for select to anon, authenticated
    using (status = 'terbit');

-- ---------- Cek status untuk pelanggan ----------
-- Mengembalikan satu servis HANYA jika kode dan 4 digit terakhir HP cocok.
-- No. HP tidak pernah dikirim utuh; catatan admin dan foto yang disembunyikan tidak ikut.
create or replace function public.cek_servis(p_kode text, p_hp4 text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
    s public.servis;
    beres boolean;
begin
    select * into s from public.servis
        where kode = upper(btrim(p_kode)) and hp4 = btrim(p_hp4) and status <> 'batal';
    if not found then
        perform pg_sleep(0.4); -- memperlambat tebak-tebakan kode
        return null;
    end if;
    beres := s.status in ('selesai', 'diambil');
    return jsonb_build_object(
        'kode', s.kode,
        'nama', s.nama,
        'hp_samar', '••••' || s.hp4,
        'tgl_masuk', s.tgl_masuk,
        'gitar_jenis', s.gitar_jenis,
        'gitar_merk', s.gitar_merk,
        'keluhan', s.keluhan,
        'status', s.status,
        'estimasi', s.estimasi,
        'tgl_selesai', s.tgl_selesai,
        'tgl_diambil', s.tgl_diambil,
        'diskon', s.diskon,
        'catatan_publik', s.catatan_publik,
        'saran', case when beres then s.saran else '' end,
        'items', coalesce((select jsonb_agg(jsonb_build_object('jenis', i.jenis, 'nama', i.nama, 'harga', i.harga, 'qty', i.qty,
                'garansi', i.garansi, 'garansi_syarat', i.garansi_syarat) order by i.urut, i.created_at)
            from public.servis_item i where i.servis_id = s.id), '[]'::jsonb),
        'bayar', coalesce((select jsonb_agg(jsonb_build_object('tgl', b.tgl, 'jumlah', b.jumlah, 'jenis', b.jenis, 'metode', b.metode)
                order by b.tgl, b.created_at)
            from public.servis_bayar b where b.servis_id = s.id), '[]'::jsonb),
        'foto', coalesce((select jsonb_agg(jsonb_build_object('tahap', f.tahap, 'url', f.url, 'thumb_url', f.thumb_url, 'keterangan', f.keterangan)
                order by f.created_at)
            from public.servis_foto f
            where f.servis_id = s.id and f.tampil and (f.tahap <> 'sesudah' or beres)), '[]'::jsonb)
    );
end;
$$;
revoke all on function public.cek_servis(text, text) from public;
grant execute on function public.cek_servis(text, text) to anon, authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- Penyimpanan foto ----------
-- Bucket publik: foto bisa dibuka lewat alamatnya (nama file acak, tidak bisa ditebak),
-- tapi daftar isi bucket tidak bisa dilihat, dan hanya admin yang bisa mengunggah/menghapus.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('servis', 'servis', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin unggah foto" on storage.objects;
create policy "admin unggah foto" on storage.objects for insert to authenticated
    with check (bucket_id = 'servis' and public.is_admin());
drop policy if exists "admin lihat foto" on storage.objects;
create policy "admin lihat foto" on storage.objects for select to authenticated
    using (bucket_id = 'servis' and public.is_admin());
drop policy if exists "admin ubah foto" on storage.objects;
create policy "admin ubah foto" on storage.objects for update to authenticated
    using (bucket_id = 'servis' and public.is_admin());
drop policy if exists "admin hapus foto" on storage.objects;
create policy "admin hapus foto" on storage.objects for delete to authenticated
    using (bucket_id = 'servis' and public.is_admin());
