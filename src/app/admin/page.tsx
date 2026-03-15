import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Users, FolderOpen, MapPin, ListChecks, Camera, ArrowLeft, ExternalLink } from "lucide-react";

const SUPERADMIN_EMAIL = "diljotgarcha@gmail.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (email !== SUPERADMIN_EMAIL) redirect("/dashboard");

  // Fetch all stats in parallel
  const [
    { count: totalProjects },
    { count: totalLocations },
    { count: totalShots },
    { count: totalReferences },
    { count: totalMembers },
    { data: projects },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase.from("locations").select("*", { count: "exact", head: true }),
    supabase.from("shots").select("*", { count: "exact", head: true }),
    supabase.from("shoot_references").select("*", { count: "exact", head: true }),
    supabase.from("project_members").select("*", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id, name, description, owner_id, created_at, cover_image_url")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Get member counts per project
  const projectIds = (projects || []).map((p) => p.id);
  const { data: memberRows } = await supabase
    .from("project_members")
    .select("project_id")
    .in("project_id", projectIds);

  const memberCountMap: Record<string, number> = {};
  for (const row of memberRows || []) {
    memberCountMap[row.project_id] = (memberCountMap[row.project_id] || 0) + 1;
  }

  const stats = [
    { label: "Total Projects", value: totalProjects ?? 0, icon: FolderOpen, color: "text-accent" },
    { label: "Total Locations", value: totalLocations ?? 0, icon: MapPin, color: "text-green-400" },
    { label: "Total Shots", value: totalShots ?? 0, icon: ListChecks, color: "text-purple-400" },
    { label: "Total References", value: totalReferences ?? 0, icon: Camera, color: "text-pink-400" },
    { label: "Project Members", value: totalMembers ?? 0, icon: Users, color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-border px-6 py-3 flex items-center justify-between bg-bg-card sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-lg font-bold text-text-primary">Admin</span>
          <span className="text-xs bg-danger/15 text-danger border border-danger/20 px-2 py-0.5 rounded-full font-medium">
            Superadmin
          </span>
        </div>
        <span className="text-xs text-text-muted">{email}</span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg-card border border-border rounded-xl p-5">
              <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
              <p className="text-2xl font-bold text-text-primary">{s.value.toLocaleString()}</p>
              <p className="text-xs text-text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Projects Table */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">All Projects</h2>
            <span className="text-xs text-text-muted">{(projects || []).length} projects</span>
          </div>
          <div className="divide-y divide-border">
            {(projects || []).map((project) => (
              <div key={project.id} className="flex items-center gap-4 px-5 py-3 hover:bg-bg-card-hover transition-colors">
                {/* Cover thumbnail */}
                <div className="w-10 h-10 rounded-lg bg-bg-primary border border-border overflow-hidden shrink-0">
                  {project.cover_image_url ? (
                    <img src={project.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{project.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    owner: <span className="font-mono">{project.owner_id.slice(0, 16)}…</span>
                  </p>
                </div>

                {/* Members badge */}
                <div className="flex items-center gap-1 text-xs text-text-muted shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  {(memberCountMap[project.id] || 0) + 1}
                </div>

                {/* View link */}
                <Link
                  href={`/project/${project.id}`}
                  className="shrink-0 text-accent hover:text-accent-hover transition-colors"
                  title="Open project"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}

            {(projects || []).length === 0 && (
              <div className="px-5 py-10 text-center text-text-muted text-sm">No projects yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
