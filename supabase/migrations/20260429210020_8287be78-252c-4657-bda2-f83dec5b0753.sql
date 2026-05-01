-- Enums
create type public.user_role      as enum ('admin','entity_user','firm_user');
create type public.entity_type    as enum ('local_government','nonprofit','school_district','charter_school','community_college','housing_authority','transit_authority','other');
create type public.audit_type     as enum ('yellow_book','single_audit','financial_statement','agreed_upon_procedures','performance','forensic');
create type public.rfp_status     as enum ('draft','open','closing_soon','under_review','awarded','cancelled');
create type public.bid_status     as enum ('submitted','under_review','shortlisted','awarded','rejected','withdrawn');
create type public.contract_status as enum ('draft','pending_govt_sig','pending_firm_sig','fully_executed','active','expired','terminated');
create type public.invoice_status  as enum ('draft','sent','paid','overdue','void');

-- Profiles
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Roles (separate table to avoid privilege escalation)
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       public.user_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Security definer to check roles without RLS recursion
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Helper to fetch current user's primary role
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid() limit 1
$$;

-- Entities
create table public.entities (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid references public.profiles(id) on delete set null,
  name                 text not null,
  entity_type          public.entity_type not null,
  ein                  text,
  state                char(2) not null,
  city                 text,
  address              text,
  zip                  text,
  website              text,
  phone                text,
  contact_name         text,
  contact_email        text,
  contact_title        text,
  fiscal_year_end      text default '12/31',
  annual_expenditures  bigint,
  receives_federal     boolean not null default false,
  federal_expenditures bigint,
  verified             boolean not null default false,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Firms
create table public.firms (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references public.profiles(id) on delete set null,
  name                text not null,
  ein                 text,
  website             text,
  phone               text,
  address             text,
  city                text,
  state               char(2),
  zip                 text,
  contact_name        text,
  contact_email       text,
  contact_title       text,
  bio                 text,
  staff_count         int,
  founded_year        int,
  aicpa_gaqc_member   boolean not null default false,
  verified            boolean not null default false,
  stripe_customer_id  text unique,
  suspended           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.firm_licenses (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references public.firms(id) on delete cascade,
  state       char(2) not null,
  license_num text not null,
  verified    boolean not null default false,
  expires_at  date,
  created_at  timestamptz not null default now(),
  unique(firm_id, state)
);

create table public.firm_entity_types (
  firm_id     uuid not null references public.firms(id) on delete cascade,
  entity_type public.entity_type not null,
  primary key (firm_id, entity_type)
);

create table public.firm_audit_types (
  firm_id    uuid not null references public.firms(id) on delete cascade,
  audit_type public.audit_type not null,
  primary key (firm_id, audit_type)
);

-- RFPs
create table public.rfps (
  id                   uuid primary key default gen_random_uuid(),
  entity_id            uuid not null references public.entities(id) on delete cascade,
  title                text not null,
  description          text,
  audit_type           public.audit_type not null,
  fiscal_years         text[] not null default '{}',
  fiscal_year_end      text,
  contract_term_years  int not null default 3,
  renewal_option_years int default 0,
  budget_min           bigint,
  budget_max           bigint,
  requires_single_audit boolean not null default false,
  special_requirements text,
  state                char(2) not null,
  status               public.rfp_status not null default 'open',
  bid_deadline         timestamptz,
  awarded_bid_id       uuid,
  views                int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Bids
create table public.bids (
  id                uuid primary key default gen_random_uuid(),
  rfp_id            uuid not null references public.rfps(id) on delete cascade,
  firm_id           uuid not null references public.firms(id) on delete cascade,
  annual_fee        bigint not null,
  estimated_hours   int,
  proposed_timeline text,
  cover_letter      text,
  qualifications    text,
  references_text   text,
  status            public.bid_status not null default 'submitted',
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(rfp_id, firm_id)
);

-- Contracts
create table public.contracts (
  id                    uuid primary key default gen_random_uuid(),
  rfp_id                uuid not null references public.rfps(id),
  bid_id                uuid not null references public.bids(id),
  entity_id             uuid not null references public.entities(id),
  firm_id               uuid not null references public.firms(id),
  annual_fee_cents      bigint not null,
  contract_term_years   int not null,
  total_value_cents     bigint not null,
  platform_fee_cents    bigint not null,
  platform_fee_pct      numeric(5,2) not null default 5.00,
  fiscal_years          text[],
  fiscal_year_end       text,
  renewal_option_years  int default 0,
  scope_of_work         text,
  deliverable_deadline  text,
  special_requirements  text,
  status                public.contract_status not null default 'draft',
  govt_signed_at        timestamptz,
  govt_signer_name      text,
  govt_signer_ip        text,
  firm_signed_at        timestamptz,
  firm_signer_name      text,
  firm_signer_ip        text,
  fully_executed_at     timestamptz,
  docuseal_submission_id text,
  signed_pdf_url        text,
  effective_date        date,
  expiration_date       date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Invoices
create table public.invoices (
  id                    uuid primary key default gen_random_uuid(),
  contract_id           uuid not null references public.contracts(id),
  firm_id               uuid not null references public.firms(id),
  stripe_invoice_id     text unique,
  stripe_payment_intent text,
  amount_cents          bigint not null,
  status                public.invoice_status not null default 'draft',
  due_date              timestamptz,
  paid_at               timestamptz,
  pdf_url               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Indexes
create index idx_rfps_state          on public.rfps(state);
create index idx_rfps_status         on public.rfps(status);
create index idx_rfps_entity_id      on public.rfps(entity_id);
create index idx_bids_rfp_id         on public.bids(rfp_id);
create index idx_bids_firm_id        on public.bids(firm_id);
create index idx_contracts_entity_id on public.contracts(entity_id);
create index idx_contracts_firm_id   on public.contracts(firm_id);
create index idx_invoices_firm_id    on public.invoices(firm_id);
create index idx_firm_licenses_state on public.firm_licenses(state);

-- updated_at trigger
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated_at  before update on public.profiles  for each row execute function public.update_updated_at();
create trigger trg_entities_updated_at  before update on public.entities  for each row execute function public.update_updated_at();
create trigger trg_firms_updated_at     before update on public.firms     for each row execute function public.update_updated_at();
create trigger trg_rfps_updated_at      before update on public.rfps      for each row execute function public.update_updated_at();
create trigger trg_bids_updated_at      before update on public.bids      for each row execute function public.update_updated_at();
create trigger trg_contracts_updated_at before update on public.contracts for each row execute function public.update_updated_at();
create trigger trg_invoices_updated_at  before update on public.invoices  for each row execute function public.update_updated_at();

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  desired_role public.user_role;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');

  desired_role := coalesce(
    nullif(new.raw_user_meta_data->>'role','')::public.user_role,
    'entity_user'
  );
  insert into public.user_roles (user_id, role) values (new.id, desired_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.entities          enable row level security;
alter table public.firms             enable row level security;
alter table public.firm_licenses     enable row level security;
alter table public.firm_entity_types enable row level security;
alter table public.firm_audit_types  enable row level security;
alter table public.rfps              enable row level security;
alter table public.bids              enable row level security;
alter table public.contracts         enable row level security;
alter table public.invoices          enable row level security;

-- profiles
create policy "Users can view own profile"   on public.profiles for select using (id = auth.uid());
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid());
create policy "Admins view all profiles"     on public.profiles for select using (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "Users view own roles"         on public.user_roles for select using (user_id = auth.uid());
create policy "Admins manage all roles"      on public.user_roles for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- entities
create policy "Owners manage own entity"     on public.entities for all    using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Anyone can view entities"     on public.entities for select using (true);
create policy "Admins manage all entities"   on public.entities for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- firms
create policy "Owners manage own firm"       on public.firms for all    using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Anyone can view firms"        on public.firms for select using (true);
create policy "Admins manage all firms"      on public.firms for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- firm_licenses
create policy "Firm owners manage licenses"  on public.firm_licenses for all    using (firm_id in (select id from public.firms where owner_id = auth.uid())) with check (firm_id in (select id from public.firms where owner_id = auth.uid()));
create policy "Anyone can view licenses"     on public.firm_licenses for select using (true);
create policy "Admins manage all licenses"   on public.firm_licenses for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- firm specializations
create policy "Firm owners manage entity types" on public.firm_entity_types for all using (firm_id in (select id from public.firms where owner_id = auth.uid())) with check (firm_id in (select id from public.firms where owner_id = auth.uid()));
create policy "Anyone can view entity types"    on public.firm_entity_types for select using (true);
create policy "Firm owners manage audit types"  on public.firm_audit_types for all using (firm_id in (select id from public.firms where owner_id = auth.uid())) with check (firm_id in (select id from public.firms where owner_id = auth.uid()));
create policy "Anyone can view audit types"     on public.firm_audit_types for select using (true);

-- rfps
create policy "Entity owners manage rfps"   on public.rfps for all    using (entity_id in (select id from public.entities where owner_id = auth.uid())) with check (entity_id in (select id from public.entities where owner_id = auth.uid()));
create policy "Anyone can view open rfps"   on public.rfps for select using (status in ('open','closing_soon','awarded'));
create policy "Admins manage all rfps"      on public.rfps for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- bids
create policy "Firm owners manage bids"     on public.bids for all    using (firm_id in (select id from public.firms where owner_id = auth.uid())) with check (firm_id in (select id from public.firms where owner_id = auth.uid()));
create policy "Entity owners view bids on their rfps" on public.bids for select using (rfp_id in (select id from public.rfps where entity_id in (select id from public.entities where owner_id = auth.uid())));
create policy "Admins manage all bids"      on public.bids for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- contracts
create policy "Entity owners view contracts" on public.contracts for select using (entity_id in (select id from public.entities where owner_id = auth.uid()));
create policy "Firm owners view contracts"   on public.contracts for select using (firm_id   in (select id from public.firms    where owner_id = auth.uid()));
create policy "Admins manage all contracts"  on public.contracts for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- invoices
create policy "Firm owners view invoices"   on public.invoices for select using (firm_id in (select id from public.firms where owner_id = auth.uid()));
create policy "Admins manage all invoices"  on public.invoices for all    using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));