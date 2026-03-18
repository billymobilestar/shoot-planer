export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  cover_image_url: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRole extends Project {
  role: "owner" | "admin" | "viewer";
  day_count?: number;
}

export interface ShootDay {
  id: string;
  project_id: string;
  day_number: number;
  title: string | null;
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
  prep_minutes: number;
  shoot_minutes: number;
  wrap_minutes: number;
  break_after_minutes: number;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Shot {
  id: string;
  project_id: string;
  location_id: string | null;
  scene_id: string | null;
  title: string;
  description: string | null;
  shot_type: string | null;
  image_url: string | null;
  status: "planned" | "in_progress" | "completed" | "cancelled";
  position: number;
  notes: string | null;
  created_at: string;
}

export interface Scene {
  id: string;
  location_id: string | null;
  project_id: string;
  title: string | null;
  scene_text: string | null;
  scene_file_url: string | null;
  scene_file_name: string | null;
  duration_minutes: number;
  position: number;
  created_at: string;
}

export interface ShootReference {
  id: string;
  project_id: string;
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

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  email: string | null;
  role: "viewer" | "admin";
  invited_at: string;
  accepted_at: string | null;
}
