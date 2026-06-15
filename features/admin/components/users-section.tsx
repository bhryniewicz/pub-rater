"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useUsers } from "@/features/admin/api/get-users";
import { useUpdateUserRole, useBanUser, useDeleteUser } from "@/features/admin/api/update-user";

const ROLES = ["user", "owner", "admin"] as const;
type UserRole = (typeof ROLES)[number];

type PendingAction =
  | { kind: "ban"; userId: string; currentlyBanned: boolean }
  | { kind: "delete"; userId: string }
  | null;

function ConfirmDialog({
  action,
  onConfirm,
  onCancel,
  isPending,
}: {
  action: PendingAction;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  if (!action) return null;
  const isBan = action.kind === "ban";
  const label = isBan
    ? action.currentlyBanned
      ? t("unban")
      : t("ban")
    : tCommon("delete");
  const confirmClass = isBan
    ? "bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
    : "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-card border border-border rounded-xl px-6 py-5 shadow-xl flex flex-col items-center gap-4 min-w-[260px]">
        <p className="text-sm font-medium text-foreground text-center">
          Are you sure you want to {label} this user?
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`text-sm px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${confirmClass}`}
          >
            {isPending ? "…" : label}
          </button>
          <button
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
          >
            {tCommon("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UsersSection({ currentUserId }: { currentUserId: string | null }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const { data: users } = useUsers();
  const roleMutation = useUpdateUserRole();
  const banMutation = useBanUser();
  const deleteMutation = useDeleteUser();

  function initials(email: string) {
    const local = email.split("@")[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }

  const isMutating = banMutation.isPending || deleteMutation.isPending;

  function handleConfirm() {
    if (!pendingAction) return;
    if (pendingAction.kind === "ban") {
      banMutation.mutate(
        { id: pendingAction.userId, banned: !pendingAction.currentlyBanned },
        { onSuccess: () => setPendingAction(null) },
      );
    } else {
      deleteMutation.mutate(pendingAction.userId, {
        onSuccess: () => setPendingAction(null),
      });
    }
  }

  return (
    <>
      <ConfirmDialog
        action={pendingAction}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
        isPending={isMutating}
      />
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <h1 className="text-lg font-semibold text-foreground mb-1">{t("users")}</h1>
        <p className="text-xs text-muted-foreground mb-6">{t("usersSubtitle")}</p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  {[t("userCol"), t("roleCol"), t("joinedCol"), t("actionsCol")].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      {t("noUsers")}
                    </td>
                  </tr>
                ) : (
                  [...users]
                    .sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : 0))
                    .map((u) => {
                      const isSelf = u.id === currentUserId;
                      return (
                        <tr key={u.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                {initials(u.email)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-foreground whitespace-nowrap">
                                    {u.email}
                                  </p>
                                  {isSelf && (
                                    <span className="text-xs text-muted-foreground">{t("you")}</span>
                                  )}
                                  {u.banned && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                                      {t("banned")}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {u.is_onboarded ? t("onboarded") : t("notOnboarded")}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              disabled={isSelf || roleMutation.isPending}
                              value={u.role}
                              onChange={(e) =>
                                roleMutation.mutate({ id: u.id, role: e.target.value as UserRole })
                              }
                              className="text-xs px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString("en-GB", {
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setPendingAction({
                                      kind: "ban",
                                      userId: u.id,
                                      currentlyBanned: u.banned,
                                    })
                                  }
                                  className={`text-xs border border-border px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                                    u.banned
                                      ? "text-muted-foreground hover:text-green-400"
                                      : "text-muted-foreground hover:text-amber-400"
                                  }`}
                                >
                                  {u.banned ? t("unban") : t("ban")}
                                </button>
                                <button
                                  onClick={() =>
                                    setPendingAction({ kind: "delete", userId: u.id })
                                  }
                                  className="text-xs text-muted-foreground hover:text-red-400 transition-colors border border-border px-2.5 py-1 rounded-lg whitespace-nowrap"
                                >
                                  {tCommon("delete")}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
