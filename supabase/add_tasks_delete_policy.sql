-- شغّل السطر ده مرة واحدة بس في SQL Editor (مش محتاج تعيد schema.sql كامل)
-- بيسمح لدور "أدمن" فقط (مش المدير) بحذف أي مهمة من صفحة المهام

create policy "tasks_delete" on tasks for delete using (my_role() = 'أدمن');
