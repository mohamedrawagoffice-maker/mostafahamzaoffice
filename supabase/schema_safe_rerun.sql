-- ============================================================
-- مكتب الأستاذ مصطفى حمزة — Supabase schema (نسخة آمنة تُشغّل على قاعدة بيانات موجودة بالفعل)
-- الكود ده آمن تمامًا تشغّله على قاعدة بيانات فيها بيانات وصلاحيات اتعملت من قبل،
-- وآمن كمان لو شغّلته أكتر من مرة بالغلط — مش هيدّي أي خطأ "already exists"
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- الجداول (safe: مش بتتلمس لو موجودة بالفعل) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('مدير','أدمن','محاسب','متدرب')),
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_number text,
  national_id text,
  entity_type text default 'فردي' check (entity_type in ('فردي','شركة')),
  vat_status text default 'لا' check (vat_status in ('لا','نعم','ربع سنوي')),
  reg_date date,
  card_expiry_date date,
  username text,
  password text,
  phone text,
  email text,
  einvoice_email text,
  einvoice_password text,
  important_dates jsonb default '[]'::jsonb,
  notes text,
  attachments jsonb default '[]'::jsonb,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  amount numeric not null default 0,
  status text default 'معلقة' check (status in ('معلقة','جزئي','مدفوعة')),
  description text,
  date date default current_date,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  amount numeric not null default 0,
  client_id uuid references clients(id) on delete set null,
  description text,
  date date default current_date,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  priority text default 'عادي' check (priority in ('عادي','عاجل','معلومة')),
  from_user text not null,
  to_user text not null,
  status text default 'جديد' check (status in ('جديد','تم العلم','معتمد التنفيذ')),
  created_at timestamptz default now(),
  ack_at timestamptz,
  approved_at timestamptz
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text,
  entity text,
  details text,
  "timestamp" timestamptz default now()
);

create table if not exists declaration_status (
  key text primary key,
  client_id uuid references clients(id) on delete cascade,
  completed boolean default false,
  completed_by text,
  completed_at timestamptz,
  paid_amount numeric,
  fully_paid text
);

create table if not exists settings (
  id int primary key default 1,
  expense_categories jsonb default '["إنترنت","كهرباء","أجور","إيجار مكتب","مستلزمات مكتبية","صيانة","ضيافة","مواصلات","أخرى"]'::jsonb,
  office_info jsonb default '{"name":"مكتب الأستاذ مصطفى حمزة","phone":"","address":""}'::jsonb
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------- أعمدة جديدة تمت إضافتها لاحقًا (safe: بتتضاف بس لو مش موجودة) ----------
alter table tasks add column if not exists from_user_id uuid references profiles(id);
alter table tasks add column if not exists to_user_id uuid references profiles(id);
alter table tasks add column if not exists note text;
alter table declaration_status add column if not exists amount numeric;

-- تعبئة الأعمدة الجديدة للمهام الموجودة حاليًا (أفضل محاولة مطابقة بالاسم القديم)
update tasks set from_user_id = profiles.id
  from profiles where tasks.from_user = profiles.display_name and tasks.from_user_id is null;
update tasks set to_user_id = profiles.id
  from profiles where tasks.to_user = profiles.display_name and tasks.to_user_id is null;

-- ============================================================
-- Helper functions (safe: create or replace)
-- ============================================================
create or replace function my_role() returns text
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_username() returns text
language sql stable security definer as $$
  select username from profiles where id = auth.uid();
$$;

create or replace function my_display_name() returns text
language sql stable security definer as $$
  select display_name from profiles where id = auth.uid();
$$;

-- ============================================================
-- Row Level Security (safe: بيمسح الصلاحية القديمة لو موجودة وبعدين يعملها من جديد)
-- ============================================================
alter table profiles enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table tasks enable row level security;
alter table activity_log enable row level security;
alter table declaration_status enable row level security;
alter table settings enable row level security;

drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');

drop policy if exists "clients_all" on clients;
create policy "clients_all" on clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "invoices_all" on invoices;
create policy "invoices_all" on invoices for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "declaration_status_all" on declaration_status;
create policy "declaration_status_all" on declaration_status for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "expenses_admin_only" on expenses;
create policy "expenses_admin_only" on expenses for all
  using (my_role() in ('مدير','أدمن')) with check (my_role() in ('مدير','أدمن'));

drop policy if exists "settings_select_all" on settings;
create policy "settings_select_all" on settings for select using (true);

drop policy if exists "settings_admin_write" on settings;
create policy "settings_admin_write" on settings for update using (my_role() in ('مدير','أدمن'));

drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks for select using (
  my_role() in ('مدير','أدمن') or from_user_id = auth.uid() or to_user_id = auth.uid()
);

drop policy if exists "tasks_insert" on tasks;
create policy "tasks_insert" on tasks for insert with check (auth.role() = 'authenticated');

drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks for update using (
  my_role() in ('مدير','أدمن') or from_user_id = auth.uid() or to_user_id = auth.uid()
);

drop policy if exists "tasks_delete" on tasks;
create policy "tasks_delete" on tasks for delete using (my_role() = 'أدمن');

drop policy if exists "activity_log_insert" on activity_log;
create policy "activity_log_insert" on activity_log for insert with check (auth.role() = 'authenticated');

drop policy if exists "activity_log_select" on activity_log;
create policy "activity_log_select" on activity_log for select using (my_role() in ('مدير','أدمن'));

drop policy if exists "activity_log_delete" on activity_log;
create policy "activity_log_delete" on activity_log for delete using (my_role() in ('مدير','أدمن'));
