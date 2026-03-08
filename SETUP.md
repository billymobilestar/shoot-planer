# ShootPlanner - Setup Guide

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS)
- **Auth:** Clerk
- **Database:** Supabase (Postgres)
- **Storage:** Supabase Storage (image uploads)
- **Drag & Drop:** dnd-kit
- **Icons:** lucide-react

## Features

### 1. Shoot Itinerary Planner
- Day-by-day location planning with drag-and-drop reordering
- Move locations between days by dragging
- Photo uploads per location
- Drive time connectors between locations
- Google Maps route link generation from coordinates
- Collaborative notes/comments per location

### 2. Shot References / Moodboard
- Masonry grid image layout
- Filter by category (Moodboard / Location Reference)
- Assign references to specific locations
- Click-to-enlarge lightbox

### 3. Shot List
- Card-based shot management with status tracking (Planned / In Progress / Completed / Cancelled)
- Shot type classification (Wide, Close-up, Aerial, Tracking, etc.)
- Location assignment per shot
- Image upload per shot

### 4. Team Collaboration
- Shareable invite links with role selection (Viewer / Admin)
- Invite acceptance page for new members
- Role-based permissions (Owner > Admin > Viewer)
- Member management (promote, demote, remove)

---

## Getting Started

### 1. Clerk Setup
1. Go to [clerk.com](https://clerk.com) and create a new application
2. Copy your **Publishable Key** and **Secret Key**
3. Update `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
   CLERK_SECRET_KEY=sk_test_YOUR_KEY
   ```

### 2. Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL**, **Anon Key**, and **Service Role Key** (Settings > API)
3. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```
4. Go to **SQL Editor** in Supabase Dashboard and run the contents of `supabase-schema.sql`
5. Go to **Storage** and create a new bucket called `shoot-planner` (set it to **Public**)

### 3. Run the App
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
  app/
    page.tsx                          # Landing page
    layout.tsx                        # Root layout (ClerkProvider)
    sign-in/[[...sign-in]]/page.tsx   # Clerk sign-in
    sign-up/[[...sign-up]]/page.tsx   # Clerk sign-up
    (dashboard)/
      layout.tsx                      # Dashboard nav with UserButton
      dashboard/page.tsx              # Project list grid
      project/[projectId]/page.tsx    # Project page with tabs
      invite/[token]/page.tsx         # Invite acceptance page
    api/
      projects/                       # CRUD for projects
      projects/[projectId]/days/      # Shoot days
      projects/[projectId]/locations/ # Locations + reorder + notes
      projects/[projectId]/references/# Moodboard references
      projects/[projectId]/shots/     # Shot list
      projects/[projectId]/members/   # Team members
      projects/[projectId]/invite/    # Invite link generation
      invite/[token]/                 # Public invite validation
      upload/                         # File upload to Supabase Storage
  components/
    CreateProjectModal.tsx
    itinerary/
      ItineraryView.tsx               # Main itinerary container + dnd context
      DayColumn.tsx                   # Single day with droppable zone
      LocationCard.tsx                # Draggable location card
      DriveConnector.tsx              # Drive time visual connector
      AddLocationModal.tsx            # Add location form
      LocationNotes.tsx               # Comments per location
    references/
      ReferencesView.tsx              # Moodboard grid + filters
      ReferenceCard.tsx               # Single reference card
      AddReferenceModal.tsx           # Upload reference modal
      PhotoLightbox.tsx               # Full-screen image viewer
    shots/
      ShotListView.tsx                # Shot grid + filters
      ShotCard.tsx                    # Single shot card
      AddShotModal.tsx                # Add shot form
    team/
      TeamView.tsx                    # Members + invite links
      MemberRow.tsx                   # Single member row
  lib/
    supabase.ts                       # Supabase client + admin
    types.ts                          # TypeScript interfaces
    utils.ts                          # Google Maps URL, formatters, cn()
  middleware.ts                       # Clerk auth middleware
```

## Database Schema
See `supabase-schema.sql` for the full schema. Tables:
- `projects` - Shoot projects
- `project_members` - Team membership + roles
- `shoot_days` - Days within a project
- `locations` - Shoot locations within days
- `location_notes` - Comments on locations
- `shoot_references` - Moodboard / reference images
- `shots` - Shot list items
- `invite_links` - Shareable invite tokens
