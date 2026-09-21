import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchSession, getUserOrganizations } from "@/server/functions/auth";

/**
 * Publish a site. Runs server-side so it can act with the user's session: when
 * the visitor is signed in it forwards their access token and target workspace,
 * letting keystone-api deploy a hosted site (a per-site Arbor repo built by
 * Fractal) owned by that workspace. Anonymous visitors get the read-only
 * preview. keystone-api makes the final call on hosted vs preview based on the
 * workspace's entitlement; this only supplies identity.
 */

/** Server-side base for keystone-api: internal cluster DNS in prod, public otherwise. */
const apiBase = (): string =>
  process.env.API_INTERNAL_URL ??
  process.env.VITE_API_BASE_URL ??
  "https://api.keystone.omni.dev";

export interface PublishResult {
  url: string;
  hosted: boolean;
  customDomainRecords?: {
    name: string;
    recordType: string;
    value: string;
    purpose: string;
  }[];
}

const publishSchema = z.object({
  siteId: z.string().min(1),
  customDomain: z.string().optional(),
  // Chosen workspace to publish under; defaults to the user's first when unset.
  organizationId: z.string().optional(),
});

export const publishSite = createServerFn({ method: "POST" })
  .inputValidator((data) => publishSchema.parse(data))
  .handler(async ({ data }): Promise<PublishResult> => {
    const { session } = await fetchSession();
    const accessToken = session?.accessToken;

    // Target workspace: the one the user chose, else their first org claim
    // (personal-as-special-org guarantees at least one). Only the user's own
    // workspaces are eligible, so an unknown id falls back to the first.
    const orgs = accessToken ? await getUserOrganizations() : [];
    const workspace = orgs.find((o) => o.id === data.organizationId) ?? orgs[0];

    const res = await fetch(`${apiBase()}/publish`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        siteId: data.siteId,
        customDomain: data.customDomain,
        ...(workspace
          ? { owner: workspace.slug, organizationId: workspace.id }
          : {}),
      }),
    });

    if (!res.ok) throw new Error("publish failed");

    return (await res.json()) as PublishResult;
  });
