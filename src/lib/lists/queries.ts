import { createClient } from "@/lib/supabase/server";
import type { List, ListMember, CreateListInput, ListMemberStatus } from "./types";

export async function getLists(tenantId: string): Promise<List[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lists")
    .select(`
      id,
      tenant_id,
      name,
      description,
      member_count,
      created_at,
      updated_at
    `)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch lists: ${error.message}`);
  }

  return data as List[];
}

export async function getListById(id: string, tenantId: string): Promise<List | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lists")
    .select(`
      id,
      tenant_id,
      name,
      description,
      member_count,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch list: ${error.message}`);
  }

  return data as List;
}

export async function createList(
  tenantId: string,
  userId: string,
  input: CreateListInput
): Promise<List> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lists")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description || null,
      created_by: userId,
      member_count: 0
    })
    .select(`
      id,
      tenant_id,
      name,
      description,
      member_count,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw new Error(`Failed to create list: ${error.message}`);
  }

  return data as List;
}

export async function deleteList(id: string, tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("lists")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to delete list: ${error.message}`);
  }
}

export async function getListMembers(listId: string, tenantId: string): Promise<ListMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("list_members")
    .select(`
      id,
      list_id,
      prospect_id,
      status,
      notes,
      created_at,
      updated_at,
      prospects (
        id,
        name,
        title,
        company,
        location,
        email,
        email_status,
        phone,
        linkedin_url
      )
    `)
    .eq("list_id", listId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch list members: ${error.message}`);
  }

  // Map the response to match ListMember interface
  type RawListMember = {
    id: string;
    list_id: string;
    prospect_id: string;
    status: ListMemberStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
    prospects: Array<{
      id: string;
      name: string;
      title: string | null;
      company: string | null;
      location: string | null;
      email: string | null;
      email_status: string | null;
      phone: string | null;
      linkedin_url: string | null;
    }> | {
      id: string;
      name: string;
      title: string | null;
      company: string | null;
      location: string | null;
      email: string | null;
      email_status: string | null;
      phone: string | null;
      linkedin_url: string | null;
    };
  };

  return (data || []).map((item: RawListMember) => {
    const prospects = Array.isArray(item.prospects) ? item.prospects[0] : item.prospects;
    return {
      id: item.id,
      list_id: item.list_id,
      prospect_id: item.prospect_id,
      status: item.status,
      notes: item.notes,
      added_at: item.created_at,
      updated_at: item.updated_at,
      prospect: prospects
    };
  }) as ListMember[];
}

export async function addProspectToList(
  listId: string,
  prospectId: string,
  tenantId: string,
  userId: string
): Promise<ListMember> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("list_members")
    .insert({
      list_id: listId,
      prospect_id: prospectId,
      tenant_id: tenantId,
      added_by: userId,
      status: "new"
    })
    .select(`
      id,
      list_id,
      prospect_id,
      status,
      notes,
      created_at,
      updated_at,
      prospects (
        id,
        name,
        title,
        company,
        location,
        email,
        email_status,
        phone,
        linkedin_url
      )
    `)
    .single();

  if (error) {
    // Ignore duplicate entries
    if (error.code === "23505") {
      throw new Error("Prospect already in list");
    }
    throw new Error(`Failed to add prospect to list: ${error.message}`);
  }

  // Map the response to match ListMember interface
  type RawInsertData = {
    id: string;
    list_id: string;
    prospect_id: string;
    status: ListMemberStatus;
    notes: string | null;
    created_at: string;
    updated_at: string;
    prospects: Array<{
      id: string;
      name: string;
      title: string | null;
      company: string | null;
      location: string | null;
      email: string | null;
      email_status: string | null;
      phone: string | null;
      linkedin_url: string | null;
    }> | {
      id: string;
      name: string;
      title: string | null;
      company: string | null;
      location: string | null;
      email: string | null;
      email_status: string | null;
      phone: string | null;
      linkedin_url: string | null;
    };
  };

  const typedData = data as unknown as RawInsertData;
  const prospects = Array.isArray(typedData.prospects) ? typedData.prospects[0] : typedData.prospects;
  return {
    id: typedData.id,
    list_id: typedData.list_id,
    prospect_id: typedData.prospect_id,
    status: typedData.status,
    notes: typedData.notes,
    added_at: typedData.created_at,
    updated_at: typedData.updated_at,
    prospect: prospects
  } as ListMember;
}

export async function removeFromList(memberId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("list_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to remove from list: ${error.message}`);
  }
}

export async function updateMemberStatus(
  memberId: string,
  status: ListMemberStatus
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("list_members")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to update member status: ${error.message}`);
  }
}

export async function updateMemberNotes(memberId: string, notes: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("list_members")
    .update({
      notes,
      updated_at: new Date().toISOString()
    })
    .eq("id", memberId);

  if (error) {
    throw new Error(`Failed to update member notes: ${error.message}`);
  }
}

export async function getListsForProspect(
  prospectId: string,
  tenantId: string
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("list_members")
    .select(`
      list:lists (
        id,
        name
      )
    `)
    .eq("prospect_id", prospectId)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to fetch lists for prospect: ${error.message}`);
  }

  type RawListData = {
    lists: Array<{ id: string; name: string }> | null;
  };

  return (data || [])
    .map((item) => {
      const typedItem = item as unknown as RawListData;
      return Array.isArray(typedItem.lists) && typedItem.lists.length > 0
        ? typedItem.lists[0]
        : null;
    })
    .filter((list): list is { id: string; name: string } => list !== null);
}
