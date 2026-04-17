"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import {
  createList,
  deleteList,
  updateListVisibility,
  updateMemberStatus,
  updateMemberNotes,
  removeFromList,
  addProspectToList
} from "@/lib/lists/queries";
import type { ListMemberStatus } from "@/lib/lists/types";
import type { Visibility } from "@/types/visibility";
import { isVisibility } from "@/types/visibility";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    throw new Error("No tenant ID found in session");
  }

  // Server-side role guard — phase 42. Per 42-01-PLAN.md Pattern A.
  // assistant is rejected here (redirect → navigation); agent,
  // tenant_admin, super_admin all pass. Placed AFTER auth/tenant
  // resolution, BEFORE any DB write in the 6 calling actions.
  await requireRole("agent");

  return { userId: user.id, tenantId };
}

export async function createListAction(formData: FormData) {
  try {
    const { userId, tenantId } = await getAuthenticatedUser();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;

    // NEW (Phase 44 D-09): read + validate visibility from formData.
    // Default to 'team_shared' when unset. Invalid values reject
    // BEFORE any DB call to prevent Postgres enum errors from
    // surfacing as opaque 500s.
    const visibilityRaw = formData.get("visibility") as string | null;
    let visibility: Visibility = "team_shared";
    if (visibilityRaw != null && visibilityRaw !== "") {
      if (!isVisibility(visibilityRaw)) {
        throw new Error("Invalid visibility value");
      }
      visibility = visibilityRaw;
    }

    if (!name || name.trim().length === 0) {
      throw new Error("List name is required");
    }

    const list = await createList(tenantId, userId, {
      name: name.trim(),
      description: description?.trim() || undefined,
      visibility
    });

    revalidatePath(`/[orgId]/lists`, "page");

    return { success: true, list };
  } catch (error) {
    console.error("Failed to create list:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create list"
    };
  }
}

export async function deleteListAction(listId: string) {
  try {
    const { tenantId } = await getAuthenticatedUser();

    await deleteList(listId, tenantId);

    revalidatePath(`/[orgId]/lists`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete list:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete list"
    };
  }
}

export async function updateMemberStatusAction(memberId: string, status: ListMemberStatus) {
  try {
    const { tenantId } = await getAuthenticatedUser();

    await updateMemberStatus(memberId, status, tenantId);

    revalidatePath(`/[orgId]/lists/[listId]`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to update member status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status"
    };
  }
}

export async function updateMemberNotesAction(memberId: string, notes: string) {
  try {
    const { tenantId } = await getAuthenticatedUser();

    await updateMemberNotes(memberId, notes, tenantId);

    revalidatePath(`/[orgId]/lists/[listId]`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to update member notes:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update notes"
    };
  }
}

export async function removeFromListAction(memberId: string) {
  try {
    const { tenantId } = await getAuthenticatedUser();

    await removeFromList(memberId, tenantId);

    revalidatePath(`/[orgId]/lists/[listId]`, "page");
    revalidatePath(`/[orgId]/lists`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to remove from list:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove from list"
    };
  }
}

export async function addToListAction(listId: string, prospectId: string) {
  try {
    const { userId, tenantId } = await getAuthenticatedUser();

    await addProspectToList(listId, prospectId, tenantId, userId);

    revalidatePath(`/[orgId]/lists/[listId]`, "page");
    revalidatePath(`/[orgId]/lists`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to add to list:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add to list"
    };
  }
}

/**
 * Updates a list's visibility. Phase 44 D-09.
 *
 * Trust boundary: RLS is the authorization gate. The UPDATE USING clause
 * on `lists` enforces `created_by = auth.uid() OR role IN (tenant_admin, super_admin)`
 * (D-05). NO parallel JS permission check — a compromised client that POSTs
 * this action bypassing the UI gate silently updates zero rows (safe).
 *
 * Input validation (isVisibility) runs here to reject garbage BEFORE the
 * query layer sees it — Postgres enum violation would otherwise surface
 * as an opaque 500.
 */
export async function updateListVisibilityAction(
  listId: string,
  visibility: Visibility
) {
  try {
    const { tenantId } = await getAuthenticatedUser();

    if (!isVisibility(visibility)) {
      throw new Error("Invalid visibility value");
    }

    await updateListVisibility(listId, tenantId, visibility);

    revalidatePath(`/[orgId]/lists`, "page");
    revalidatePath(`/[orgId]/lists/[listId]`, "page");

    return { success: true };
  } catch (error) {
    console.error("Failed to update list visibility:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update list visibility"
    };
  }
}
