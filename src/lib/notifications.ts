import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NotificationType } from "@/lib/types";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface CreateNotificationParams {
  projectId: string;
  actorUserId: string;
  actorName: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  resourceId: string;
  deepLink: string;
}

async function getProjectRecipients(
  projectId: string,
  excludeUserId: string
): Promise<{ userId: string; email: string | null }[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: project }, { data: members }] = await Promise.all([
    supabase.from("projects").select("owner_id").eq("id", projectId).single(),
    supabase.from("project_members").select("user_id").eq("project_id", projectId),
  ]);

  const userIds = new Set<string>();
  if (project?.owner_id) userIds.add(project.owner_id);
  for (const m of members || []) {
    if (m.user_id) userIds.add(m.user_id);
  }
  userIds.delete(excludeUserId);

  if (userIds.size === 0) return [];

  const clerk = await clerkClient();
  const recipients: { userId: string; email: string | null }[] = [];

  const results = await Promise.allSettled(
    [...userIds].map(async (uid) => {
      const user = await clerk.users.getUser(uid);
      return {
        userId: uid,
        email: user.emailAddresses?.[0]?.emailAddress || null,
      };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      recipients.push(result.value);
    }
  }

  return recipients;
}

export async function createNotifications(params: CreateNotificationParams) {
  const { projectId, actorUserId, actorName, type, title, body, resourceId, deepLink } = params;

  try {
    const supabase = getSupabaseAdmin();
    const recipients = await getProjectRecipients(projectId, actorUserId);

    if (recipients.length === 0) return;

    // Get project name for context
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single();

    const projectName = project?.name || "Unknown Project";

    // Insert notifications for all recipients
    const rows = recipients.map((r) => ({
      project_id: projectId,
      project_name: projectName,
      recipient_user_id: r.userId,
      actor_user_id: actorUserId,
      actor_name: actorName,
      type,
      title,
      body,
      resource_id: resourceId,
      deep_link: deepLink,
      read: false,
      email_sent: false,
    }));

    await supabase.from("notifications").insert(rows);

    // Send emails (fire-and-forget)
    if (resend) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const fullLink = `${appUrl}${deepLink}`;

      Promise.allSettled(
        recipients
          .filter((r) => r.email)
          .map((r) =>
            resend.emails.send({
              from: "ShootPlaner <notifications@shootplaner.com>",
              to: r.email!,
              subject: `${projectName}: ${title}`,
              html: buildEmailHtml({
                projectName,
                actorName: actorName || "Someone",
                title,
                body,
                link: fullLink,
              }),
            })
          )
      ).then(async (results) => {
        // Mark emails as sent
        const sentUserIds = recipients
          .filter((r, i) => r.email && results[i]?.status === "fulfilled")
          .map((r) => r.userId);
        if (sentUserIds.length > 0) {
          await supabase
            .from("notifications")
            .update({ email_sent: true })
            .eq("project_id", projectId)
            .eq("resource_id", resourceId)
            .eq("type", type)
            .in("recipient_user_id", sentUserIds);
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.error("Failed to create notifications:", err);
  }
}

function buildEmailHtml(params: {
  projectName: string;
  actorName: string;
  title: string;
  body: string | null;
  link: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="background: #1a1a2e; border-radius: 12px; padding: 24px; color: #e0e0e0;">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
          ${params.projectName}
        </div>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px 0;">
          ${params.title}
        </h2>
        ${params.body ? `<p style="color: #aaa; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">${params.body}</p>` : ""}
        <a href="${params.link}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          View in ShootPlaner
        </a>
      </div>
      <p style="color: #888; font-size: 11px; text-align: center; margin-top: 16px;">
        You received this because you're a member of ${params.projectName} on ShootPlaner.
      </p>
    </div>
  `;
}
