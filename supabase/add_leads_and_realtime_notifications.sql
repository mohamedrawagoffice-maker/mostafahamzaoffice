-- تشغيل مرة واحدة في Supabase SQL Editor

-- ---------- طلبات تأسيس الشركات (اللي بتتسجل من مساعد ترشيح نوع الشركة في صفحة الدخول) ----------
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

alter table company_wizard_leads enable row level security;

-- أي حد (حتى زائر مش مسجل دخول) يقدر يضيف طلب، لأن الصفحة دي عامة
create policy "company_wizard_leads_insert" on company_wizard_leads for insert with check (true);
-- بس المدير/الأدمن يقدروا يشوفوا الطلبات
create policy "company_wizard_leads_select" on company_wizard_leads for select using (my_role() in ('مدير','أدمن'));
create policy "company_wizard_leads_delete" on company_wizard_leads for delete using (my_role() in ('مدير','أدمن'));

-- ---------- إشعارات داخل الموقع (لحظية عن طريق Realtime) ----------
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

alter table notifications enable row level security;

create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_insert" on notifications for insert with check (auth.role() = 'authenticated');
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid());
create policy "notifications_delete_own" on notifications for delete using (user_id = auth.uid());

-- لازم عشان الإشعارات تبقى لحظية (Realtime) بدل ما تحتاج تحديث الصفحة
alter publication supabase_realtime add table notifications;
