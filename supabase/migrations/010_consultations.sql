-- =============================================================
-- 工单式咨询（建议三 · UX 优化 + 治疗师精准参与）
-- 家长提交结构化问题，治疗师文字回复；自动附带最近 3 天训练数据。
-- 原始录音永不进此表，仅存脱敏结构化指标摘要。
-- =============================================================

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('method','uncooperative','result','other')),
  description text not null,
  attached_data jsonb default '{}'::jsonb,   -- 最近 3 天训练数据摘要（脱敏）
  status text not null default 'pending' check (status in ('pending','replied','closed')),
  therapist_reply text,
  therapist_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  replied_at timestamptz
);

create index if not exists consultations_user_idx on public.consultations (user_id);
create index if not exists consultations_status_idx on public.consultations (status, created_at desc);

alter table public.consultations enable row level security;

drop policy if exists "consult_owner_insert" on public.consultations;
create policy "consult_owner_insert" on public.consultations
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "consult_owner_select" on public.consultations;
create policy "consult_owner_select" on public.consultations
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "consult_owner_update" on public.consultations;
create policy "consult_owner_update" on public.consultations
  for update to authenticated
  using (auth.uid() = user_id);

-- 治疗师端：演示阶段用 anon 可读全部（真实环境应改为 therapist 角色策略）
drop policy if exists "consult_therapist_select" on public.consultations;
create policy "consult_therapist_select" on public.consultations
  for select to anon, authenticated
  using (true);

drop policy if exists "consult_therapist_reply" on public.consultations;
create policy "consult_therapist_reply" on public.consultations
  for update to authenticated
  using (true)
  with check (true);
