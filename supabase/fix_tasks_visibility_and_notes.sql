-- شغّل الكود ده كامل مرة واحدة في SQL Editor
-- بيصلح مشكلة إن المحاسبين ما كانوش شايفين المهام المرسلة ليهم أو منهم
-- (كانت الصلاحيات بتقارن بـ username بدل الاسم الظاهر المستخدم فعليًا في المهام)
-- وبيضيف عمود "ملاحظة" لكل مهمة

-- 1) دالة جديدة تجيب الاسم الظاهر (display_name) للمستخدم الحالي
create or replace function my_display_name() returns text
language sql stable security definer as $$
  select display_name from profiles where id = auth.uid();
$$;

-- 2) استبدال صلاحيات القراءة والتعديل على جدول tasks عشان تقارن بالاسم الظاهر صح
drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks for select using (
  my_role() in ('مدير','أدمن') or from_user = my_display_name() or to_user = my_display_name()
);

drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks for update using (
  my_role() in ('مدير','أدمن') or from_user = my_display_name() or to_user = my_display_name()
);

-- 3) عمود الملاحظة على كل مهمة
alter table tasks add column if not exists note text;
