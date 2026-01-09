-- src/db/migrations/001_create_users.sql
-- Creates the users table (Postgres replacement for src/models/User.js)

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),

  username text not null,
  email text not null,
  password_hash text not null,

  full_name text not null,
  location text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  phone_number text not null default '',
  bio text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_username_unique unique (username),
  constraint users_email_unique unique (email)
);

-- Helpful indexes
create index if not exists idx_users_username on users (username);
create index if not exists idx_users_email on users (email);
