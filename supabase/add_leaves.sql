-- تشغيل مرة واحدة في Supabase SQL Editor
-- جدول رصيد/سجل الأجازات: كل صف = يوم أجازة واحد لشخص معين

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

alter table leaves enable row level security;

-- كل شخص يشوف أجازاته هو بس، والمدير/الأدمن يشوفوا أجازات الجميع
create policy "leaves_select_own_or_admin" on leaves for select using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);

-- التسجيل والتعديل والحذف مقصور على المدير والأدمن فقط
create policy "leaves_admin_write" on leaves for insert with check (my_role() in ('مدير','أدمن'));
create policy "leaves_admin_update" on leaves for update using (my_role() in ('مدير','أدمن'));
create policy "leaves_admin_delete" on leaves for delete using (my_role() in ('مدير','أدمن'));
