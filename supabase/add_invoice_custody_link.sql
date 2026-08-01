-- تشغيل مرة واحدة في Supabase SQL Editor
-- ربط الفواتير بالعهدة: عمود طريقة الدفع في الفاتورة، وعمود يربط حركة العهدة بالفاتورة اللي ولّدتها

alter table invoices add column if not exists payment_method text
  check (payment_method in ('عهدة شخصية', 'كارت مصطفى مباشر'));

alter table custody add column if not exists invoice_id uuid references invoices(id) on delete cascade;
create index if not exists custody_invoice_id_idx on custody(invoice_id);

-- توسيع صلاحية إضافة حركة "دفع" في العهدة عشان تسمح بحركة مرتبطة بفاتورة
-- حتى لو كانت الحركة دي منسوبة لشخص تاني (زي "كارت مصطفى مباشر") مش اللي بيسجل الفاتورة نفسه،
-- طالما الحركة مرتبطة فعليًا بفاتورة (invoice_id) — يعني مش حركة عشوائية حرة.
drop policy if exists "custody_insert" on custody;
create policy "custody_insert" on custody for insert with check (
  my_role() in ('مدير','أدمن')
  or (type = 'دفع' and user_id = auth.uid())
  or (type = 'دفع' and invoice_id is not null)
);
