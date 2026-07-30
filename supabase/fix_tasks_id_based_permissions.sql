-- شغّل الكود ده كامل مرة واحدة في SQL Editor
-- ده إصلاح جذري ونهائي لمشكلة "المحاسب مش شايف المهام المرسلة له":
-- السبب الحقيقي إن الصلاحيات كانت بتقارن نص الاسم الظاهر حرف بحرف، ولو فيه أي فرق بسيط
-- (مسافة زيادة، أو الاسم اتكتب مختلف شوية وقت إنشاء الحساب يدويًا) الصلاحية كانت بترفض.
-- الحل الجذري: المقارنة بقت بمعرف المستخدم الحقيقي (ID) مش بالاسم النصي، وده مينفعش يغلط أبدًا.

-- 1) أعمدة جديدة تخزن الـ ID الحقيقي لصاحب المهمة والشخص الموجهة له
alter table tasks add column if not exists from_user_id uuid references profiles(id);
alter table tasks add column if not exists to_user_id uuid references profiles(id);

-- 2) تعبئة الأعمدة الجديدة للمهام الموجودة حاليًا (أفضل محاولة مطابقة بالاسم القديم)
update tasks set from_user_id = profiles.id
  from profiles where tasks.from_user = profiles.display_name and tasks.from_user_id is null;
update tasks set to_user_id = profiles.id
  from profiles where tasks.to_user = profiles.display_name and tasks.to_user_id is null;

-- 3) استبدال صلاحيات القراءة والتعديل عشان تعتمد على الـ ID مش على النص
drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks for select using (
  my_role() in ('مدير','أدمن') or from_user_id = auth.uid() or to_user_id = auth.uid()
);

drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks for update using (
  my_role() in ('مدير','أدمن') or from_user_id = auth.uid() or to_user_id = auth.uid()
);
