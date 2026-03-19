# Shoot Planner - Native iOS App

## Project Overview
Native SwiftUI iOS app for Shoot Planner — a collaborative shoot planning tool for film/photo productions. This is the iOS companion to the Next.js web app in the parent directory.

## Build & Run
```bash
cd /Users/diljotgarcha/Documents/shoot-planner/ios-app
xcodegen generate  # Regenerate .xcodeproj from project.yml
xcodebuild -project ShootPlanner.xcodeproj -scheme ShootPlanner -destination 'id=2D45397D-5CA8-47B6-8837-F97463E93D66' -configuration Debug build
# Install & launch:
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/ShootPlanner-*/Build/Products/Debug-iphonesimulator -name "ShootPlanner.app" -maxdepth 1 | head -1)
xcrun simctl install 2D45397D-5CA8-47B6-8837-F97463E93D66 "$APP_PATH"
xcrun simctl launch 2D45397D-5CA8-47B6-8837-F97463E93D66 com.shootplanner.app
```

## Architecture
- **Pure SwiftUI** — no React Native, no CocoaPods, no SPM dependencies yet
- **Xcodegen** — project.yml generates the .xcodeproj (don't edit .xcodeproj manually)
- **Deployment target**: iOS 16.0
- **Swift version**: 5.10 (set in project.yml, NOT Swift 6 — avoids strict concurrency issues)
- **Bundle ID**: com.shootplanner.app
- **URL Scheme**: `shootplanner://` (for OAuth callbacks)

## Directory Structure
```
ios-app/
├── project.yml                  # Xcodegen project definition
├── ShootPlanner.xcodeproj/      # Generated — do not edit
└── ShootPlanner/
    ├── Info.plist
    ├── App/
    │   ├── ShootPlannerApp.swift # @main entry point
    │   └── ContentView.swift     # Root view (auth gate)
    ├── Models/
    │   └── Models.swift          # All Codable data models
    ├── Services/
    │   ├── Config.swift          # API keys and URLs
    │   ├── AuthService.swift     # Clerk auth (OAuth + email/password)
    │   └── APIService.swift      # Supabase REST API client
    ├── Theme/
    │   └── Theme.swift           # Colors and design tokens
    └── Views/
        ├── Auth/
        │   ├── SignInView.swift
        │   └── SignUpView.swift
        ├── Dashboard/
        │   └── DashboardView.swift  # Project list
        └── Project/
            ├── ProjectDetailView.swift  # Tabbed project view
            ├── ItineraryView.swift       # Days + locations
            └── ShotListView.swift        # Shot cards with status
```

## IMPORTANT: Naming Conflicts
- The database table is called `scenes` but the Swift model is `ShootScene` (not `Scene`) because `Scene` conflicts with SwiftUI's `Scene` protocol. Always use `ShootScene` in Swift code.

## Backend / API

### Authentication — Clerk
- **Publishable key**: `pk_test_bWludC1oYW1zdGVyLTYuY2xlcmsuYWNjb3VudHMuZGV2JA`
- **Clerk domain**: `mint-hamster-6.clerk.accounts.dev` (decoded from publishable key)
- **OAuth providers**: Google
- **Auth flow**: Clerk Frontend API → ASWebAuthenticationSession for Google OAuth
- **Token storage**: iOS Keychain (via KeychainHelper)
- **Session**: JWT token included as `Authorization: Bearer {token}` header

### Database — Supabase
- **URL**: `https://unqgbljcbgqodzdljxdp.supabase.co`
- **Anon key**: in Config.swift
- **API pattern**: Direct REST calls to `/rest/v1/{table}` with `apikey` and `Authorization` headers
- **Storage bucket**: `shoot-planner` (public)

### Supabase Tables & Columns

**projects**: id (uuid PK), name (text), description (text), owner_id (text, Clerk user ID), cover_image_url (text), created_at (timestamptz), updated_at (timestamptz)

**project_members**: id (uuid PK), project_id (uuid FK→projects), user_id (text), email (text), role (enum: viewer/admin), invited_at (timestamptz), accepted_at (timestamptz). Unique on (project_id, user_id).

**shoot_days**: id (uuid PK), project_id (uuid FK→projects), day_number (int), title (text), date (date), created_at (timestamptz). Unique on (project_id, day_number).

**locations**: id (uuid PK), shoot_day_id (uuid FK→shoot_days), project_id (uuid FK→projects), name (text), description (text), address (text), latitude (double), longitude (double), photo_url (text), drive_time_from_previous (text), drive_distance_from_previous (text), position (int), notes (text), completed (bool), created_at (timestamptz)

**location_notes**: id (uuid PK), location_id (uuid FK→locations), user_id (text), user_name (text), content (text), created_at (timestamptz)

**location_photos**: id (uuid PK), location_id (uuid FK→locations), image_url (text), caption (text), position (int), created_at (timestamptz)

**location_links**: id (uuid PK), location_id (uuid FK→locations), url (text), title (text), platform (text: tiktok/instagram/youtube/other), thumbnail_url (text), position (int), created_at (timestamptz)

**shoot_references** (moodboard): id (uuid PK), project_id (uuid FK→projects), location_id (uuid FK→locations nullable), title (text), description (text), image_url (text), link_url (text), category (text), board (text), tags (text[]), colors (text[]), notes (text), location_ids (uuid[]), position (int), created_at (timestamptz)

**reference_reactions**: id (uuid PK), reference_id (uuid FK→shoot_references), user_id (text), user_name (text), emoji (text), created_at (timestamptz). Unique on (reference_id, user_id, emoji).

**reference_comments**: id (uuid PK), reference_id (uuid FK→shoot_references), user_id (text), user_name (text), content (text), created_at (timestamptz)

**shots**: id (uuid PK), project_id (uuid FK→projects), location_id (uuid FK→locations nullable), scene_id (uuid FK→scenes nullable), title (text), description (text), shot_type (text), image_url (text), status (enum: planned/in_progress/completed/cancelled), position (int), notes (text), created_at (timestamptz)

**scenes**: id (uuid PK), location_id (uuid FK→locations), project_id (uuid FK→projects), title (text), scene_text (text), scene_file_url (text), scene_file_name (text), duration_minutes (int), position (int)

**invite_links**: id (uuid PK), project_id (uuid FK→projects), token (text unique), role (enum: viewer/admin), created_by (text), expires_at (timestamptz), max_uses (int), use_count (int), created_at (timestamptz)

**project_messages** (group chat): id (uuid PK), project_id (uuid FK→projects), user_id (text), user_name (text), user_avatar_url (text), content (text), created_at (timestamptz)

**notifications**: id (uuid PK), project_id (uuid FK→projects), project_name (text), recipient_user_id (text), actor_user_id (text), actor_name (text), type (enum: reference_reaction/reference_comment/location_comment/location_added), title (text), body (text), resource_id (text), deep_link (text), read (bool), email_sent (bool), created_at (timestamptz)

**subscriptions**: id (uuid PK), user_id (text unique), stripe_customer_id (text), stripe_subscription_id (text), plan (text: free/pro), billing_interval (text: month/year), status (text: active/canceled/past_due/trialing), current_period_end (timestamptz), created_at (timestamptz), updated_at (timestamptz)

### Entity Relationships
```
Project (owner_id → Clerk user)
├── ShootDays (ordered by day_number)
│   └── Locations (ordered by position)
│       ├── Scenes (ordered by position)
│       ├── LocationNotes
│       ├── LocationPhotos
│       └── LocationLinks
├── Shots (linked to location_id + scene_id)
├── ShootReferences (moodboard, location_ids[] for multi-assignment)
│   ├── ReferenceReactions
│   └── ReferenceComments
├── ProjectMembers (role: viewer/admin)
├── ProjectMessages (group chat)
├── InviteLinks
└── Notifications
```

### Web App API Routes (Next.js)
The web app at `../` has 44+ API routes under `src/app/api/`. The mobile app currently calls Supabase directly, but could also proxy through the web API at `http://localhost:3000/api/...` for operations that need server-side logic (e.g., Clerk user info enrichment, Google Maps distance calculations, Stripe).

## Design System
- **Primary accent**: #c87040 (burnt orange)
- **Background**: #1a1a1a (dark)
- **Card background**: #252525
- **Text primary**: #e8e4df
- **Text secondary**: #9a928a
- **Text muted**: #6b6560
- **Border**: #373533
- **Corner radius**: 12pt
- **Dark mode only** (preferredColorScheme(.dark))

## Current Status
- ✅ Auth screens (sign-in, sign-up with email/password + Google OAuth)
- ✅ Dashboard (project list, create project)
- ✅ Project detail with 5 tabs (Itinerary, Shots, Scenes, Refs, Team)
- ✅ Itinerary view (days, locations, completion toggle)
- ✅ Shot list (CRUD, status management)
- 🔲 Scenes tab (placeholder)
- 🔲 References/Moodboard tab (placeholder)
- 🔲 Team tab (placeholder)
- 🔲 Google OAuth callback handling needs testing/fixing
- 🔲 Real-time subscriptions (Supabase Realtime)
- 🔲 Image upload
- 🔲 Push notifications
