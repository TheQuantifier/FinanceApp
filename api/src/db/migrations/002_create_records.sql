-- src/db/migrations/002_create_records.sql
-- Creates the records table (Postgres replacement for src/models/Record.js)

create table if not exists records (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount >= 0),

  category text not null,
  date timestamptz not null,

  note text not null default '',

  -- If auto-created from a receipt
  linked_receipt_id uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_records_user_id on records (user_id);
create index if not exists idx_records_user_date on records (user_id, date desc);
create index if not exists idx_records_linked_receipt on records (linked_receipt_id);
