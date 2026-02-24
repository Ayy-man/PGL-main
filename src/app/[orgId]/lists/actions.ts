"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createList,
  deleteList,
  updateMemberStatus,
  updateMemberNotes,
  removeFromList,
  addProspectToList
} from "@/lib/lists/queries";
import type { ListMemberStatus } from "@/lib/lists/types";

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

  return { userId: user.id, tenantId };
}

export async function createListAction(formData: FormData) {
  try {
    const { userId, tenantId } = await getAuthenticatedUser();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;

    if (!name || name.trim().length === 0) {
      throw new Error("List name is required");
    }

    const list = await createList(tenantId, userId, {
      name: name.trim(),
      description: description?.trim() || undefined
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
