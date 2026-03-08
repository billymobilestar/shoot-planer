"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Copy, Check, Trash2, Plus, Users } from "lucide-react";
import { ProjectMember, InviteLink, MemberRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import MemberRow from "./MemberRow";

interface Props {
  projectId: string;
  canEdit: boolean;
  isOwner: boolean;
}

export default function TeamView({ projectId, canEdit, isOwner }: Props) {
  const [members, setMembers] = useState<(ProjectMember & { isOwner?: boolean })[]>([]);
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState<MemberRole>("viewer");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [membersRes, invitesRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/members`),
      fetch(`/api/projects/${projectId}/invite`),
    ]);
    if (membersRes.ok) setMembers(await membersRes.json());
    if (invitesRes.ok) setInvites(await invitesRes.json());
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function generateInvite() {
    setGeneratingInvite(true);
    const res = await fetch(`/api/projects/${projectId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInvites((prev) => [invite, ...prev]);
      copyToClipboard(invite.token, invite.id);
    }
    setGeneratingInvite(false);
  }

  function copyToClipboard(token: string, id: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function deleteInvite(id: string) {
    // Delete by removing from state (could add a delete API)
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) {
    return <div className="bg-bg-card border border-border rounded-xl p-6 animate-pulse h-64" />;
  }

  return (
    <div className="space-y-8">
      {/* Team Members */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Team Members
        </h3>
        <div className="divide-y divide-border">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={isOwner}
              projectId={projectId}
              onUpdate={fetchData}
            />
          ))}
        </div>
        {members.length === 0 && (
          <p className="text-text-muted text-sm py-4 text-center">No team members yet. Generate an invite link below.</p>
        )}
      </div>

      {/* Invite Section */}
      {canEdit && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent" />
            Invite People
          </h3>

          {/* Generate Link */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={generateInvite}
              disabled={generatingInvite}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {generatingInvite ? "Generating..." : "Generate Invite Link"}
            </button>
          </div>

          {/* Active Invite Links */}
          {invites.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-secondary">Active Links</h4>
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-muted font-mono truncate">
                      {window.location.origin}/invite/{invite.token}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        invite.role === "admin" ? "bg-accent-muted text-accent" : "bg-bg-card-hover text-text-secondary"
                      }`}>
                        {invite.role}
                      </span>
                      <span className="text-xs text-text-muted">{invite.use_count} uses</span>
                      <span className="text-xs text-text-muted">{formatDate(invite.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(invite.token, invite.id)}
                    className="text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {copiedId === invite.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteInvite(invite.id)}
                    className="text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
