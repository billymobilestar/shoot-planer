-- ============================================
-- Shoot Planner - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROJECTS
-- ============================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id text not null, -- Clerk user ID
  cover_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROJECT MEMBERS (sharing & collaboration)
-- ============================================
create type member_role as enum ('viewer', 'admin');

create table project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id text not null, -- Clerk user ID
  email text,
  role member_role default 'viewer',
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(project_id, user_id)
);

-- ============================================
-- SHOOT DAYS
-- ============================================
create table shoot_days (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  day_number integer not null,
  title text, -- e.g. "The Southern Desert"
  date date,
  created_at timestamptz default now(),
  unique(project_id, day_number)
);

-- ============================================
-- LOCATIONS (within shoot days)
-- ============================================
create table locations (
  id uuid primary key default uuid_generate_v4(),
  shoot_day_id uuid references shoot_days(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  photo_url text,
  drive_time_from_previous text, -- e.g. "1h 45m"
  drive_distance_from_previous text, -- e.g. "120 mi"
  position integer not null default 0, -- order within day
  notes text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- LOCATION NOTES (collaborative comments)
-- ============================================
create table location_notes (
  id uuid primary key default uuid_generate_v4(),
  location_id uuid references locations(id) on delete cascade not null,
  user_id text not null,
  user_name text,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================
-- REFERENCES / MOODBOARD
-- ============================================
create table shoot_references (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  location_id uuid references locations(id) on delete set null,
  title text,
  description text,
  image_url text not null default '',
  link_url text,
  category text default 'moodboard', -- 'moodboard' only now
  board text, -- custom board/section name for grouping
  tags text[] default '{}', -- e.g. {'lighting', 'wardrobe', 'color palette'}
  colors text[] default '{}', -- extracted dominant hex colors
  notes text, -- annotation notes
  location_ids uuid[] default '{}', -- multiple location assignments
  position integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================
-- SHOT LIST
-- ============================================
create type shot_status as enum ('planned', 'in_progress', 'completed', 'cancelled');

create table shots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  location_id uuid references locations(id) on delete set null,
  scene_id uuid references scenes(id) on delete set null,
  title text not null,
  description text,
  shot_type text, -- 'wide', 'close-up', 'aerial', 'tracking', etc.
  image_url text,
  status shot_status default 'planned',
  position integer not null default 0,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- INVITE LINKS
-- ============================================
create table invite_links (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  token text unique not null,
  role member_role default 'viewer',
  created_by text not null,
  expires_at timestamptz,
  max_uses integer,
  use_count integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- LOCATION PHOTOS (additional gallery images)
-- ============================================
create table location_photos (
  id uuid primary key default uuid_generate_v4(),
  location_id uuid references locations(id) on delete cascade not null,
  image_url text not null,
  caption text,
  position integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================
-- LOCATION LINKS (TikTok, Instagram, YouTube, etc.)
-- ============================================
create table location_links (
  id uuid primary key default uuid_generate_v4(),
  location_id uuid references locations(id) on delete cascade not null,
  url text not null,
  title text,
  platform text, -- 'tiktok', 'instagram', 'youtube', 'other'
  thumbnail_url text,
  position integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table projects enable row level security;
alter table project_members enable row level security;
alter table shoot_days enable row level security;
alter table locations enable row level security;
alter table location_notes enable row level security;
alter table shoot_references enable row level security;
alter table shots enable row level security;
alter table invite_links enable row level security;

-- Helper function: check if user is owner or member
create or replace function is_project_member(p_id uuid, u_id text)
returns boolean as $$
begin
  return exists (
    select 1 from projects where id = p_id and owner_id = u_id
  ) or exists (
    select 1 from project_members where project_id = p_id and user_id = u_id
  );
end;
$$ language plpgsql security definer;

-- Helper: check if user is owner or admin
create or replace function is_project_admin(p_id uuid, u_id text)
returns boolean as $$
begin
  return exists (
    select 1 from projects where id = p_id and owner_id = u_id
  ) or exists (
    select 1 from project_members where project_id = p_id and user_id = u_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Projects: owner and members can read; owner can write
create policy "projects_select" on projects for select using (
  owner_id = auth.uid()::text or is_project_member(id, auth.uid()::text)
);
create policy "projects_insert" on projects for insert with check (owner_id = auth.uid()::text);
create policy "projects_update" on projects for update using (is_project_admin(id, auth.uid()::text));
create policy "projects_delete" on projects for delete using (owner_id = auth.uid()::text);

-- For the rest of the tables, we use service role key in API routes
-- so RLS policies are permissive (auth is handled at the API level via Clerk)

-- Simple permissive policies for service-role access
-- In production, you'd want tighter RLS or use Supabase Auth
create policy "allow_all_shoot_days" on shoot_days for all using (true) with check (true);
create policy "allow_all_locations" on locations for all using (true) with check (true);
create policy "allow_all_location_notes" on location_notes for all using (true) with check (true);
create policy "allow_all_shoot_references" on shoot_references for all using (true) with check (true);
create policy "allow_all_shots" on shots for all using (true) with check (true);
create policy "allow_all_project_members" on project_members for all using (true) with check (true);
create policy "allow_all_invite_links" on invite_links for all using (true) with check (true);

alter table location_photos enable row level security;
alter table location_links enable row level security;
create policy "allow_all_location_photos" on location_photos for all using (true) with check (true);
create policy "allow_all_location_links" on location_links for all using (true) with check (true);

-- ============================================
-- REFERENCE REACTIONS (emoji reactions on moodboard)
-- ============================================
create table reference_reactions (
  id uuid primary key default uuid_generate_v4(),
  reference_id uuid references shoot_references(id) on delete cascade not null,
  user_id text not null,
  user_name text,
  emoji text not null, -- e.g. '🔥', '❤️', '👍', '⭐', '👀'
  created_at timestamptz default now(),
  unique(reference_id, user_id, emoji) -- one reaction per type per user
);

-- ============================================
-- REFERENCE COMMENTS (comments on moodboard images)
-- ============================================
create table reference_comments (
  id uuid primary key default uuid_generate_v4(),
  reference_id uuid references shoot_references(id) on delete cascade not null,
  user_id text not null,
  user_name text,
  content text not null,
  created_at timestamptz default now()
);

alter table reference_reactions enable row level security;
alter table reference_comments enable row level security;
create policy "allow_all_reference_reactions" on reference_reactions for all using (true) with check (true);
create policy "allow_all_reference_comments" on reference_comments for all using (true) with check (true);

-- ============================================
-- SUBSCRIPTIONS (Stripe billing)
-- ============================================
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id text unique not null, -- Clerk user ID
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free', -- 'free', 'pro'
  billing_interval text, -- 'month', 'year'
  status text not null default 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;
create policy "allow_all_subscriptions" on subscriptions for all using (true) with check (true);

-- ============================================
-- NOTIFICATIONS
-- ============================================
create type notification_type as enum (
  'reference_reaction',
  'reference_comment',
  'location_comment',
  'location_added'
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  project_name text,
  recipient_user_id text not null,
  actor_user_id text not null,
  actor_name text,
  type notification_type not null,
  title text not null,
  body text,
  resource_id text not null,
  deep_link text not null,
  read boolean default false,
  email_sent boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_recipient on notifications(recipient_user_id, read, created_at desc);
create index idx_notifications_project on notifications(project_id);

alter table notifications enable row level security;
create policy "allow_all_notifications" on notifications for all using (true) with check (true);

-- ============================================
-- PROJECT MESSAGES (Group Chat)
-- ============================================
create table project_messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id text not null,
  user_name text,
  user_avatar_url text,
  content text not null,
  created_at timestamptz default now()
);

create index idx_messages_project on project_messages(project_id, created_at desc);

alter table project_messages enable row level security;
create policy "allow_all_messages" on project_messages for all using (true) with check (true);

-- Add chat_message to notification_type enum (run if you already have the enum):
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'chat_message';

-- ============================================
-- STORAGE BUCKET for images
-- ============================================
-- Run these in Supabase Dashboard > Storage:
-- 1. Create a bucket called "shoot-planner" (public)
-- 2. Or run:
-- insert into storage.buckets (id, name, public) values ('shoot-planner', 'shoot-planner', true);
