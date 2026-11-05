import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import gatekeeperOrg from "@/lib/config/gatekeeper";
import { authMiddleware } from "@/server/middleware";

// Org/team membership (invite, roles, remove) is managed centrally at the
// account hub (backed by Gatekeeper), not per product, so this template ships
// no member-management server functions. See
// plans/2026-09-02-org-membership-central-hub-adr.md.
//
// Workspace creation and handle-availability checks are likewise funneled to
// the account hub (account.omni.dev/workspaces), the single ecosystem surface
// that owns them, so this app no longer exposes its own create/check server
// functions. Only the read paths below remain, used to resolve a workspace by
// slug.

const getOrganizationBySlugSchema = z.object({
  slug: z.string().min(1),
});

/**
 * Get an organization by slug.
 * Used when JWT claims are stale and don't include a newly created org
 */
export const getOrganizationBySlug = createServerFn({ method: "POST" })
  .inputValidator((data) => getOrganizationBySlugSchema.parse(data))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const accessToken = context.session.accessToken;

    if (!accessToken) {
      return null;
    }

    return gatekeeperOrg.getOrganizationBySlug(data.slug, accessToken);
  });

/**
 * Fetch an organization by slug without authentication.
 * Used for public access when no JWT is available
 */
export const fetchOrganizationBySlug = createServerFn({ method: "POST" })
  .inputValidator((data) => getOrganizationBySlugSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      return await gatekeeperOrg.fetchOrganizationBySlug(data.slug);
    } catch (error) {
      console.error("Error fetching organization by slug:", error);
      return null;
    }
  });
