-- ============================================================
-- إندكسات لتسريع الاستعلامات — شغّلها مرة واحدة في SQL Editor
-- (آمن تمامًا، بيضيف فهارس بس ومش بيغيّر أي بيانات موجودة)
-- ============================================================

create index if not exists idx_invoices_client_id on invoices(client_id);
create index if not exists idx_invoices_date on invoices(date);
create index if not exists idx_expenses_client_id on expenses(client_id);
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_declaration_status_client_id on declaration_status(client_id);
create index if not exists idx_tasks_from_user on tasks(from_user);
create index if not exists idx_tasks_to_user on tasks(to_user);
create index if not exists idx_activity_log_timestamp on activity_log("timestamp" desc);
create index if not exists idx_clients_created_at on clients(created_at desc);
