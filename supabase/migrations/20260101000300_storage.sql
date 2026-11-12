-- ════════════════════════════════════════════════════════════════════════════
-- HPE — PATRICK PERSONAL · Buckets de armazenamento
-- ════════════════════════════════════════════════════════════════════════════

-- public-assets  → logo, foto do Patrick, imagens de exercícios (público)
-- avatars        → fotos de perfil de alunos (público, URL não enumerável)
-- progress-photos→ fotos de evolução (PRIVADO, acesso via signed URL)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-assets', 'public-assets', true,  5242880,
   array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('avatars', 'avatars', true, 2097152,
   array['image/png','image/jpeg','image/webp']),
  ('progress-photos', 'progress-photos', false, 10485760,
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- ─── public-assets ──────────────────────────────────────────────────────────
create policy "public-assets: leitura pública"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-assets');

create policy "public-assets: só o personal escreve"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and public.is_admin());

create policy "public-assets: só o personal atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and public.is_admin());

create policy "public-assets: só o personal remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_admin());

-- ─── avatars ────────────────────────────────────────────────────────────────
create policy "avatars: leitura pública"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

-- Caminho: avatars/<auth.uid()>/arquivo.jpg
create policy "avatars: dono ou personal escreve"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatars: dono ou personal atualiza"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatars: dono ou personal remove"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ─── progress-photos · privado ──────────────────────────────────────────────
-- Caminho: progress-photos/<student_id>/arquivo.jpg
-- Visível apenas ao personal e ao próprio aluno.
create policy "progress-photos: personal e dono leem"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_student_id()::text
    )
  );

create policy "progress-photos: personal e dono escrevem"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_student_id()::text
    )
  );

create policy "progress-photos: personal e dono removem"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'progress-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_student_id()::text
    )
  );
