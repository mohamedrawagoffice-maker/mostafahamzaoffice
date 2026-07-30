-- شغّل السطر ده مرة واحدة بس في SQL Editor (مش محتاج تعيد schema.sql كامل)
-- بيسمح للمدير والأدمن بس بمسح سجل النشاط (زرار "امسح السجل" الجديد في صفحة الإعدادات)

create policy "activity_log_delete" on activity_log for delete using (my_role() in ('مدير','أدمن'));
