-- src/db/migrations/003_create_receipts.sql
-- Creates the receipts table (Postgres replacement for src/models/Receipt.js)
-- Uses object_key (R2 key) instead of Mongo/GridFS storedFileId.

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  original_filename text not null,
  object_key text not null unique,

  file_type text not null default '',
  file_size bigint not null default 0 check (file_size >= 0),

  -- Raw OCR text
  ocr_text text not null default '',

  -- Receipt purchase date
  date timestamptz null,

  -- Auto-filled date when added
  date_added timestamptz not null default now(),

  -- Store/vendor/source
  source text not null default '',

  sub_amount numeric(12,2) not null default 0 check (sub_amount >= 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),

  pay_method text not null default 'Other' check (
    pay_method in ('Cash','Check','Credit Card','Debit Card','Gift Card','Multiple','Other')
  ),

  -- Itemized list (JSON array of {name, price})
  items jsonb not null default '[]'::jsonb,

  -- Raw AI parsed output
  parsed_data jsonb not null default '{}'::jsonb,

  -- Auto-linked record
  linked_record_id uuid null references records(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_receipts_user_id on receipts (user_id);
create index if not exists idx_receipts_user_created on receipts (user_id, created_at desc);
create index if not exists idx_receipts_linked_record on receipts (linked_record_id);
