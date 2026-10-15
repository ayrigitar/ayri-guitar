-- =====================================================================
-- Jalankan SETELAH membuat akun admin di Authentication > Users.
-- Ganti EMAIL_ADMIN_ANDA dengan email akun admin tersebut, lalu Run.
-- Hasil yang benar: "Success. 1 row" (kalau 0 row, emailnya salah ketik).
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where email = lower('EMAIL_ADMIN_ANDA')
on conflict do nothing
returning user_id;
