-- تشغيل مرة واحدة في Supabase SQL Editor
-- إلغاء حالة "جزئي" من الفواتير نهائيًا، وتحويل أي فاتورة قديمة كانت "جزئي" إلى "مدفوعة"
-- (عشان لو كانت مربوطة بحركة عهدة، الربط يفضل زي ما هو)

update invoices set status = 'مدفوعة' where status = 'جزئي';

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (status in ('معلقة', 'مدفوعة'));
