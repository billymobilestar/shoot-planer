"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ProjectMember, MemberRole } from "@/lib/types";

interface Props {
  member: ProjectMember & { isOwner?: boolean; displayName?: string; avatarUrl?: string | null };
  canManage: boolean;
  projectId: string;
  onUpdate: () => void;
}

export default function MemberRow({ member, canManage, projectId, onUpdate }: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function changeRole(role: MemberRole) {
    await fetch(`/api/projects/${projectId}/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    onUpdate();
  }

  async function removeMember() {
    await fetch(`/api/projects/${projectId}/members/${member.id}`, { method: "DELETE" });
    onUpdate();
  }

  return (
    <div className="flex items-center gap-4 py-3">
      {member.avatarUrl ? (
        <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
          <span className="text-accent text-sm font-medium">
            {(member.displayName || member.email || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">
          {member.displayName || member.email || member.user_id}
        </p>
        {member.email && member.displayName && member.displayName !== member.email && (
          <p className="text-xs text-text-muted truncate">{member.email}</p>
        )}
      </div>

      {member.isOwner ? (
        <span className="text-xs px-2.5 py-1 rounded-full bg-accent-muted text-accent font-medium">
          Owner
        </span>
      ) : canManage ? (
        <select
          value={member.role}
          onChange={(e) => changeRole(e.target.value as MemberRole)}
          className="bg-bg-input border border-border rounded-lg px-2.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent"
        >
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      ) : (
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          member.role === "admin" ? "bg-accent-muted text-accent" : "bg-bg-card-hover text-text-secondary"
        }`}>
          {member.role === "admin" ? "Admin" : "Viewer"}
        </span>
      )}

      {canManage && !member.isOwner && (
        confirmRemove ? (
          <div className="flex items-center gap-2 text-xs">
            <button onClick={removeMember} className="text-danger font-medium">Remove</button>
            <button onClick={() => setConfirmRemove(false)} className="text-text-secondary">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmRemove(true)} className="text-text-muted hover:text-danger transition-colors">
            <X className="w-4 h-4" />
          </button>
        )
      )}
    </div>
  );
}
