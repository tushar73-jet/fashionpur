create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique check (phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'),
  first_name text,
  last_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null check (status in ('active', 'withdrawn')),
  source text not null,
  evidence text not null,
  granted_at timestamptz not null,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  constraint withdrawn_consent_has_timestamp check (
    (status = 'active' and withdrawn_at is null) or
    (status = 'withdrawn' and withdrawn_at is not null)
  )
);

create index if not exists marketing_consents_contact_status_idx
  on public.marketing_consents (contact_id, status, granted_at desc);
