-- ============================================================
-- مكتب الأستاذ مصطفى حمزة — Supabase schema
-- شغّل هذا الملف كامل داخل Supabase Dashboard > SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles (يمثل كل مستخدم من الـ 8) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('مدير','أدمن','محاسب','متدرب')),
  created_at timestamptz default now()
);

-- ---------- clients ----------
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

-- ---------- invoices ----------
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

-- ---------- expenses ----------
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

-- ---------- tasks ----------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  priority text default 'عادي' check (priority in ('عادي','عاجل','معلومة')),
  from_user text not null,
  to_user text not null,
  from_user_id uuid references profiles(id),
  to_user_id uuid references profiles(id),
  status text default 'جديد' check (status in ('جديد','تم العلم','معتمد التنفيذ')),
  created_at timestamptz default now(),
  ack_at timestamptz,
  approved_at timestamptz,
  note text
);

-- ---------- activity_log ----------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  actor text,
  action text,
  entity text,
  details text,
  "timestamp" timestamptz default now()
);

-- ---------- declaration_status (حالة كل إقرار، الإقرارات نفسها تتولد تلقائيًا في التطبيق) ----------
create table if not exists declaration_status (
  key text primary key,
  client_id uuid references clients(id) on delete cascade,
  completed boolean default false,
  completed_by text,
  completed_at timestamptz,
  amount numeric,
  paid_amount numeric,
  fully_paid text
);

-- ---------- settings (صف واحد فقط) ----------
create table if not exists settings (
  id int primary key default 1,
  expense_categories jsonb default '["إنترنت","كهرباء","أجور","إيجار مكتب","مستلزمات مكتبية","صيانة","ضيافة","مواصلات","أخرى"]'::jsonb,
  office_info jsonb default '{"name":"مكتب الأستاذ مصطفى حمزة","phone":"","address":""}'::jsonb
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- Helper functions
-- ============================================================
create or replace function my_role() returns text
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_username() returns text
language sql stable security definer as $$
  select username from profiles where id = auth.uid();
$$;

-- عمود from_user/to_user في جدول tasks بيخزن display_name مش username، فمحتاجين الدالة دي عشان الصلاحيات تتقارن صح
create or replace function my_display_name() returns text
language sql stable security definer as $$
  select display_name from profiles where id = auth.uid();
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table expenses enable row level security;
alter table tasks enable row level security;
alter table activity_log enable row level security;
alter table declaration_status enable row level security;
alter table settings enable row level security;

-- profiles: أي مستخدم مسجل دخول يقدر يشوف كل البروفايلات (أسماء وأدوار فقط، لا كلمات مرور)
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');

-- clients / invoices / declaration_status: كل الأدوار تقدر تشوف وتضيف وتعدل
create policy "clients_all" on clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "invoices_select" on invoices for select using (auth.role() = 'authenticated');
create policy "invoices_insert" on invoices for insert with check (auth.role() = 'authenticated');
create policy "invoices_update" on invoices for update using (my_role() in ('مدير','أدمن'));
create policy "invoices_delete" on invoices for delete using (auth.role() = 'authenticated');
create policy "declaration_status_all" on declaration_status for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- expenses: المدير والأدمن فقط
create policy "expenses_admin_only" on expenses for all
  using (my_role() in ('مدير','أدمن')) with check (my_role() in ('مدير','أدمن'));

-- settings: أي حد حتى قبل تسجيل الدخول يقدر يقرأ (اسم/تليفون/عنوان المكتب لازم يظهروا في صفحة الدخول)، والتعديل للمدير والأدمن بس
create policy "settings_select_all" on settings for select using (true);
create policy "settings_admin_write" on settings for update using (my_role() in ('مدير','أدمن'));

-- tasks: المدير/الأدمن يشوفوا الكل، والباقي يشوفوا اللي منه أو ليه بس
-- (المقارنة بالـ ID الحقيقي auth.uid() مش بالاسم النصي، عشان تفادي أي فرق بسيط في كتابة الاسم)
create policy "tasks_select" on tasks for select using (
  my_role() in ('مدير','أدمن') or from_user_id = auth.uid() or to_user_id = auth.uid()
);
create policy "tasks_insert" on tasks for insert with check (auth.role() = 'authenticated');
create policy "tasks_update" on tasks for update using (
  my_role() in ('مدير','أدمن') or from_user_id = auth.uid() or to_user_id = auth.uid()
);
-- الحذف مقصور على دور "أدمن" فقط (مش المدير، بناءً على طلب صاحب المكتب)
create policy "tasks_delete" on tasks for delete using (my_role() = 'أدمن');

-- activity_log: الكل يقدر يسجل، المدير والأدمن بس يقدروا يقرأوا السجل كامل ويمسحوه
create policy "activity_log_insert" on activity_log for insert with check (auth.role() = 'authenticated');
create policy "activity_log_select" on activity_log for select using (my_role() in ('مدير','أدمن'));
create policy "activity_log_delete" on activity_log for delete using (my_role() in ('مدير','أدمن'));
