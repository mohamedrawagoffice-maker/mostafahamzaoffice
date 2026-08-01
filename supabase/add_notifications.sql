-- تشغيل مرة واحدة في Supabase SQL Editor
-- بنية الإشعارات: إيميل حقيقي لكل شخص + اشتراكات Push لكل جهاز

alter table profiles add column if not exists notify_email text;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- كل شخص يشوف/يضيف/يمسح اشتراكاته هو بس، والمدير/الأدمن يشوفوا/يمسحوا اشتراكات الكل
create policy "push_subscriptions_select" on push_subscriptions for select using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);
create policy "push_subscriptions_insert" on push_subscriptions for insert with check (user_id = auth.uid());
create policy "push_subscriptions_update" on push_subscriptions for update using (user_id = auth.uid());
create policy "push_subscriptions_delete" on push_subscriptions for delete using (
  user_id = auth.uid() or my_role() in ('مدير','أدمن')
);

-- كل شخص يقدر يعدّل إيميل الإشعارات بتاعه هو بس، والمدير/الأدمن يعدّلوا لأي حد
-- (الجدول أصلاً عليه سياسة عامة select/update، فبنضيف تقييد إضافي للتحديث بس هنا لو مش موجود)
drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin" on profiles for update using (
  id = auth.uid() or my_role() in ('مدير','أدمن')
);
