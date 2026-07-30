-- تشغيل مرة واحدة في Supabase SQL Editor
-- جدول العهدة: رصيد مستمر لكل محاسب/متدرب، بتتغذى من:
--   إضافة  = المدير/الأدمن بيدّي عهدة (تزود الرصيد)
--   دفع    = المحاسب بيسجل مبلغ صرفه (بيقلل الرصيد)
--   تسوية  = المدير/الأدمن بيستلم فلوس فعليًا من المحاسب آخر اليوم (بتقلل الرصيد)

create table if not exists custody (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  user_name text not null,
  type text not null check (type in ('إضافة', 'دفع', 'تسوية')),
  amount numeric not null default 0,
  date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  client_name_manual text,
  note text default '',
  created_by text,
  created_at timestamptz default now()
);

create index if not exists custody_user_id_idx on custody(user_id);
create index if not exists custody_date_idx on custody(date);

alter table custody enable row level security;

-- كل شخص يشوف عهدته هو بس، والمدير/الأدمن يشوفوا عهدة الجميع
create policy "custody_select_own_or_admin" on custody for select using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);

-- المحاسب/المتدرب يقدر يسجل "دفع" لنفسه بس
-- المدير/الأدمن يقدروا يسجلوا أي نوع (إضافة عهدة، دفع، تسوية) لأي حد
create policy "custody_insert" on custody for insert with check (
  my_role() in ('مدير','أدمن')
  or (type = 'دفع' and user_id = auth.uid())
);

-- التعديل والحذف مقصورين على المدير والأدمن (تصحيح الأخطاء)
create policy "custody_update" on custody for update using (my_role() in ('مدير','أدمن'));
create policy "custody_delete" on custody for delete using (my_role() in ('مدير','أدمن'));
