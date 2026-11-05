import { workspacesUrl } from "@omnidotdev/providers/react";
import { Button, buttonVariants } from "@omnidotdev/thornberry/button";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";

import { ACCOUNT_URL } from "@/lib/config/env.config";
import { getUserOrganizations } from "@/server/functions/auth";

export const Route = createFileRoute("/_auth/organizations/")({
  // Re-hydrate organizations live so a workspace just created in the account
  // portal shows on arrival. getUserOrganizations re-reads the IDP claims on
  // every call, so invalidating the route picks up new memberships.
  loader: async () => {
    const organizations = await getUserOrganizations();
    return { organizations };
  },
  component: WorkspacesPage,
});

/**
 * Workspaces list page.
 *
 * Shows all workspaces the user is a member of. Workspace creation and
 * management is funneled to the account hub (account.omni.dev/workspaces), the
 * single ecosystem surface that owns it, so this page lists and links out
 * rather than embedding its own creation flow.
 */
function WorkspacesPage() {
  const router = useRouter();
  const { organizations: workspaces } = Route.useLoaderData();

  // The account hub owns workspace creation; link out to it. Rendered only when
  // the hub URL is configured (optional env), so a missing config degrades to
  // no button rather than a dead link.
  const newWorkspaceHref = workspacesUrl(ACCOUNT_URL);
  const NewWorkspaceLink = newWorkspaceHref
    ? ({ className }: { className?: string }) => (
        <a href={newWorkspaceHref} className={buttonVariants({ className })}>
          <Plus className="size-4" />
          New workspace
        </a>
      )
    : () => null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-bold text-2xl">Workspaces</h1>

        {workspaces.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Refresh workspaces"
              title="Refresh workspaces"
              onClick={() => router.invalidate()}
            >
              <RefreshCw className="size-4" />
            </Button>
            <NewWorkspaceLink />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((org) => (
          <Link
            key={org.id}
            to="/@{$workspaceSlug}"
            params={{ workspaceSlug: org.slug }}
            className="block rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{org.slug}</h2>
              {org.type === "personal" && (
                <span className="rounded bg-muted px-2 py-1 text-xs">
                  Personal
                </span>
              )}
            </div>
            <p className="mt-1 text-muted-foreground text-sm">
              {org.roles.join(", ")}
            </p>
            {org.teams.length > 0 && (
              <p className="mt-2 text-muted-foreground text-xs">
                Teams: {org.teams.map((t) => t.name).join(", ")}
              </p>
            )}
          </Link>
        ))}
      </div>

      {workspaces.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground text-sm">
            No workspaces yet. Create one in your Omni account to get started.
          </p>
          <NewWorkspaceLink />
        </div>
      )}
    </div>
  );
}
