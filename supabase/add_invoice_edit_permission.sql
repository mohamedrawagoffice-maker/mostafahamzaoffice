-- شغّل الكود ده كامل مرة واحدة في SQL Editor
-- بيقصر تعديل الفواتير على المدير والأدمن بس (الإضافة والحذف والعرض تفضل متاحة للكل زي الأول)

drop policy if exists "invoices_all" on invoices;
create policy "invoices_select" on invoices for select using (auth.role() = 'authenticated');
create policy "invoices_insert" on invoices for insert with check (auth.role() = 'authenticated');
create policy "invoices_update" on invoices for update using (my_role() in ('مدير','أدمن'));
create policy "invoices_delete" on invoices for delete using (auth.role() = 'authenticated');
