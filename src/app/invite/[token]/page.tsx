import { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase";
import InviteClient from "./InviteClient";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  const { data: invite } = await supabase
    .from("invite_links")
    .select("*, projects(name, description, cover_image_url)")
    .eq("token", token)
    .single();

  if (!invite?.projects) {
    return {
      title: "Join Project | ShootPlaner",
      description: "You've been invited to join a project on ShootPlaner.",
    };
  }

  const project = invite.projects as { name: string; description: string | null; cover_image_url: string | null };
  const title = `Join "${project.name}" | ShootPlaner`;
  const description = project.description || `You've been invited to collaborate on "${project.name}" on ShootPlaner.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "ShootPlaner",
      type: "website",
      ...(project.cover_image_url ? {
        images: [{
          url: project.cover_image_url,
          width: 1200,
          height: 630,
          alt: project.name,
        }],
      } : {}),
    },
    twitter: {
      card: project.cover_image_url ? "summary_large_image" : "summary",
      title,
      description,
      ...(project.cover_image_url ? { images: [project.cover_image_url] } : {}),
    },
  };
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  return <InviteClient token={token} />;
}
