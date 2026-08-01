-- تشغيل مرة واحدة في Supabase SQL Editor
-- إضافة نوع حركة جديد "تحصيل من عميل": تسجيل استرداد مبلغ من العميل بعد ما اتصرف عليه من العهدة،
-- عشان "المستحق على العميل" يبقى صافي (مدفوعات العهدة - المحصّل منه) مش مجموع خام بس.

alter table custody drop constraint if exists custody_type_check;
alter table custody add constraint custody_type_check check (type in ('إضافة', 'دفع', 'تسوية', 'تحصيل من عميل'));

drop policy if exists "custody_insert" on custody;
create policy "custody_insert" on custody for insert with check (
  my_role() in ('مدير','أدمن')
  or (type = 'دفع' and user_id = auth.uid())
  or (type = 'دفع' and invoice_id is not null)
  or (type = 'تحصيل من عميل' and user_id = auth.uid())
);
