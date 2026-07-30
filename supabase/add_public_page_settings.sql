-- تشغيل مرة واحدة في Supabase SQL Editor
-- بيضيف عمود لتخزين محتوى صفحة الدخول العامة (الرئيسية / أنواع الشركات / عن المكتب / تواصل معنا)
-- عشان يبقى قابل للتعديل من صفحة الإعدادات بدل ما يكون ثابت في الكود.

alter table settings add column if not exists public_page jsonb default '{}'::jsonb;
