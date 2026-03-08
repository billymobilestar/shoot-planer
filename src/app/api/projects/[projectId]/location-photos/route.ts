import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();

  // Get all locations for this project (including hero photos)
  const { data: locations } = await supabase
    .from("locations")
    .select("id, photo_url")
    .eq("project_id", projectId);

  if (!locations?.length) return NextResponse.json([]);

  const locationIds = locations.map((l) => l.id);

  // Fetch gallery photos
  const { data: galleryPhotos, error } = await supabase
    .from("location_photos")
    .select("*")
    .in("location_id", locationIds)
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also include each location's hero photo as a virtual entry
  const heroPhotos = locations
    .filter((l) => l.photo_url)
    .map((l) => ({
      id: `hero-${l.id}`,
      location_id: l.id,
      image_url: l.photo_url,
      caption: null,
      position: -1,
      created_at: "",
    }));

  return NextResponse.json([...heroPhotos, ...(galleryPhotos || [])]);
}
