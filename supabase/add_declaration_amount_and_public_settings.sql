-- شغّل الكود ده كامل مرة واحدة في SQL Editor

-- 1) عمود "قيمة الإقرار" الإجمالية (منفصل عن المبلغ المدفوع)
alter table declaration_status add column if not exists amount numeric;

-- 2) السماح لأي حد (حتى قبل تسجيل الدخول) بقراءة بيانات المكتب، عشان تظهر في صفحة الدخول
drop policy if exists "settings_select_all" on settings;
create policy "settings_select_all" on settings for select using (true);
