-- ============================================================
-- مكتب الأستاذ مصطفى حمزة — Supabase schema (النسخة الكاملة والنهائية)
-- شغّل هذا الملف كامل داخل Supabase Dashboard > SQL Editor
-- في مشروع Supabase جديد تمامًا، وده كل اللي محتاجه (+ ملف indexes.sql بعده)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- profiles (يمثل كل مستخدم من الـ 8) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  role text not null check (role in ('مدير','أدمن','محاسب','متدرب')),
  notify_email text,
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
  status text default 'معلقة' check (status in ('معلقة','مدفوعة')),
  payment_method text check (payment_method in ('عهدة شخصية', 'كارت مصطفى مباشر')),
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
  office_info jsonb default '{"name":"مكتب الأستاذ مصطفى حمزة","phone":"","address":""}'::jsonb,
  public_page jsonb default '{}'::jsonb
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------- leaves (رصيد/سجل الأجازات: كل صف = يوم أجازة واحد لشخص معين) ----------
create table if not exists leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  user_name text not null,
  date date not null,
  note text default '',
  created_by text,
  created_at timestamptz default now()
);
create index if not exists leaves_user_id_idx on leaves(user_id);
create index if not exists leaves_date_idx on leaves(date);

-- ---------- custody (العهدة: رصيد مستمر لكل شخص، ومربوطة بالعملاء والفواتير) ----------
create table if not exists custody (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  user_name text not null,
  type text not null check (type in ('إضافة', 'دفع', 'تسوية', 'تحصيل من عميل')),
  amount numeric not null default 0,
  date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  client_name_manual text,
  note text default '',
  created_by text,
  invoice_id uuid references invoices(id) on delete cascade,
  created_at timestamptz default now()
);
create index if not exists custody_user_id_idx on custody(user_id);
create index if not exists custody_date_idx on custody(date);
create index if not exists custody_invoice_id_idx on custody(invoice_id);

-- ---------- push_subscriptions (اشتراكات إشعارات Push لكل جهاز) ----------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

-- ---------- notifications (إشعارات داخل الموقع، لحظية عن طريق Realtime) ----------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  body text,
  url text,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_id_idx on notifications(user_id, created_at desc);

-- ---------- company_wizard_leads (طلبات مساعد ترشيح نوع الشركة من صفحة الدخول العامة) ----------
create table if not exists company_wizard_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  activity text,
  governorate text,
  phone text,
  recommended_type text,
  answers_summary text,
  created_at timestamptz default now()
);

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
alter table leaves enable row level security;
alter table custody enable row level security;
alter table push_subscriptions enable row level security;
alter table notifications enable row level security;
alter table company_wizard_leads enable row level security;

-- profiles: أي مستخدم مسجل دخول يقدر يشوف كل البروفايلات، وكل شخص يعدّل بياناته هو بس (والمدير/الأدمن يعدّلوا لأي حد)
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_all" on profiles for select using (auth.role() = 'authenticated');
drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin" on profiles for update using (
  id = auth.uid() or my_role() in ('مدير','أدمن')
);

-- clients / declaration_status: كل الأدوار تقدر تشوف وتضيف وتعدل
drop policy if exists "clients_all" on clients;
create policy "clients_all" on clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "declaration_status_all" on declaration_status;
create policy "declaration_status_all" on declaration_status for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- invoices: الإضافة/الحذف/العرض للكل، التعديل للمدير والأدمن بس
drop policy if exists "invoices_select" on invoices;
create policy "invoices_select" on invoices for select using (auth.role() = 'authenticated');
drop policy if exists "invoices_insert" on invoices;
create policy "invoices_insert" on invoices for insert with check (auth.role() = 'authenticated');
drop policy if exists "invoices_update" on invoices;
create policy "invoices_update" on invoices for update using (my_role() in ('مدير','أدمن'));
drop policy if exists "invoices_delete" on invoices;
create policy "invoices_delete" on invoices for delete using (auth.role() = 'authenticated');

-- expenses: المدير والأدمن فقط
drop policy if exists "expenses_admin_only" on expenses;
create policy "expenses_admin_only" on expenses for all
  using (my_role() in ('مدير','أدمن')) with check (my_role() in ('مدير','أدمن'));

-- settings: أي حد حتى قبل تسجيل الدخول يقدر يقرأ (لازم تظهر في صفحة الدخول العامة)، والتعديل للمدير والأدمن بس
drop policy if exists "settings_select_all" on settings;
create policy "settings_select_all" on settings for select using (true);
drop policy if exists "settings_admin_write" on settings;
create policy "settings_admin_write" on settings for update using (my_role() in ('مدير','أدمن'));

-- tasks: المدير/الأدمن يشوفوا الكل، والباقي يشوفوا اللي منه أو ليه بس (بالـ ID الحقيقي مش بالاسم النصي)
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

-- activity_log: الكل يقدر يسجل، المدير والأدمن بس يقدروا يقرأوا السجل كامل ويمسحوه
drop policy if exists "activity_log_insert" on activity_log;
create policy "activity_log_insert" on activity_log for insert with check (auth.role() = 'authenticated');
drop policy if exists "activity_log_select" on activity_log;
create policy "activity_log_select" on activity_log for select using (my_role() in ('مدير','أدمن'));
drop policy if exists "activity_log_delete" on activity_log;
create policy "activity_log_delete" on activity_log for delete using (my_role() in ('مدير','أدمن'));

-- leaves: كل شخص يشوف أجازاته هو بس (والمدير/الأدمن يشوفوا الكل)، والتسجيل/التعديل/الحذف للمدير والأدمن بس
drop policy if exists "leaves_select_own_or_admin" on leaves;
create policy "leaves_select_own_or_admin" on leaves for select using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);
drop policy if exists "leaves_admin_write" on leaves;
create policy "leaves_admin_write" on leaves for insert with check (my_role() in ('مدير','أدمن'));
drop policy if exists "leaves_admin_update" on leaves;
create policy "leaves_admin_update" on leaves for update using (my_role() in ('مدير','أدمن'));
drop policy if exists "leaves_admin_delete" on leaves;
create policy "leaves_admin_delete" on leaves for delete using (my_role() in ('مدير','أدمن'));

-- custody: كل شخص يشوف عهدته هو بس (والمدير/الأدمن يشوفوا الكل)
drop policy if exists "custody_select_own_or_admin" on custody;
create policy "custody_select_own_or_admin" on custody for select using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);
-- الإضافة: المدير/الأدمن يقدروا يسجلوا أي نوع لأي حد، والمحاسب يسجل "دفع"/"تحصيل من عميل" لنفسه بس،
-- أو "دفع" مرتبطة بفاتورة (زي دفع "كارت مصطفى مباشر" اللي بيسجله محاسب تاني)
drop policy if exists "custody_insert" on custody;
create policy "custody_insert" on custody for insert with check (
  my_role() in ('مدير','أدمن')
  or (type = 'دفع' and user_id = auth.uid())
  or (type = 'دفع' and invoice_id is not null)
  or (type = 'تحصيل من عميل' and user_id = auth.uid())
);
drop policy if exists "custody_update" on custody;
create policy "custody_update" on custody for update using (my_role() in ('مدير','أدمن'));
drop policy if exists "custody_delete" on custody;
create policy "custody_delete" on custody for delete using (my_role() in ('مدير','أدمن'));

-- push_subscriptions: كل شخص يدير اشتراكاته هو بس (والمدير/الأدمن يشوفوا/يمسحوا اشتراكات الكل)
drop policy if exists "push_subscriptions_select" on push_subscriptions;
create policy "push_subscriptions_select" on push_subscriptions for select using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);
drop policy if exists "push_subscriptions_insert" on push_subscriptions;
create policy "push_subscriptions_insert" on push_subscriptions for insert with check (user_id = auth.uid());
drop policy if exists "push_subscriptions_update" on push_subscriptions;
create policy "push_subscriptions_update" on push_subscriptions for update using (user_id = auth.uid());
drop policy if exists "push_subscriptions_delete" on push_subscriptions;
create policy "push_subscriptions_delete" on push_subscriptions for delete using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);

-- notifications: كل شخص يشوف/يعدّل/يمسح إشعاراته هو بس، وأي مستخدم مسجل دخول يقدر يبعت إشعار لغيره
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
drop policy if exists "notifications_insert" on notifications;
create policy "notifications_insert" on notifications for insert with check (auth.role() = 'authenticated');
drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid());
drop policy if exists "notifications_delete_own" on notifications;
create policy "notifications_delete_own" on notifications for delete using (user_id = auth.uid());

-- company_wizard_leads: أي زائر (حتى غير مسجل دخول) يضيف طلب، والمدير/الأدمن بس يشوفوا/يمسحوا
drop policy if exists "company_wizard_leads_insert" on company_wizard_leads;
create policy "company_wizard_leads_insert" on company_wizard_leads for insert with check (true);
drop policy if exists "company_wizard_leads_select" on company_wizard_leads;
create policy "company_wizard_leads_select" on company_wizard_leads for select using (my_role() in ('مدير','أدمن'));
drop policy if exists "company_wizard_leads_delete" on company_wizard_leads;
create policy "company_wizard_leads_delete" on company_wizard_leads for delete using (my_role() in ('مدير','أدمن'));

-- لازم عشان إشعارات الموقع تبقى لحظية (Realtime) بدل ما تحتاج تحديث الصفحة
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
