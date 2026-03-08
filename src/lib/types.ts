export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberRole = "viewer" | "admin";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  email: string | null;
  role: MemberRole;
  invited_at: string;
  accepted_at: string | null;
}

export interface ShootDay {
  id: string;
  project_id: string;
  day_number: number;
  title: string | null;
  date: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  shoot_day_id: string;
  project_id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  drive_time_from_previous: string | null;
  drive_distance_from_previous: string | null;
  position: number;
  notes: string | null;
  created_at: string;
}

export interface LocationNote {
  id: string;
  location_id: string;
  user_id: string;
  user_name: string | null;
  content: string;
  created_at: string;
}

export interface ShootReference {
  id: string;
  project_id: string;
  location_id: string | null;
  title: string | null;
  description: string | null;
  image_url: string;
  link_url: string | null;
  category: string | null;
  board: string | null;
  tags: string[];
  colors: string[];
  notes: string | null;
  location_ids: string[];
  position: number;
  created_at: string;
}

export type ShotStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface Shot {
  id: string;
  project_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  shot_type: string | null;
  image_url: string | null;
  status: ShotStatus;
  position: number;
  notes: string | null;
  created_at: string;
}

export interface InviteLink {
  id: string;
  project_id: string;
  token: string;
  role: MemberRole;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

export interface LocationPhoto {
  id: string;
  location_id: string;
  image_url: string;
  caption: string | null;
  position: number;
  created_at: string;
}

export interface LocationLink {
  id: string;
  location_id: string;
  url: string;
  title: string | null;
  platform: string | null;
  thumbnail_url: string | null;
  position: number;
  created_at: string;
}

export interface ReferenceReaction {
  id: string;
  reference_id: string;
  user_id: string;
  user_name: string | null;
  emoji: string;
  created_at: string;
}

export interface ReferenceComment {
  id: string;
  reference_id: string;
  user_id: string;
  user_name: string | null;
  content: string;
  created_at: string;
}

export interface ShootDayWithLocations extends ShootDay {
  locations: Location[];
}
