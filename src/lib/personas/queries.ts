import { createClient } from "@/lib/supabase/server";
import type { Visibility } from "@/types/visibility";
import type { Persona, PersonaWithCreator, CreatePersonaInput, UpdatePersonaInput } from "./types";
import { STARTER_PERSONAS } from "./seed-data";

export async function getPersonas(tenantId: string): Promise<Persona[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("is_starter", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch personas: ${error.message}`);
  }

  return data as Persona[];
}

export async function getPersonaById(id: string, tenantId: string): Promise<Persona | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch persona: ${error.message}`);
  }

  return data as Persona;
}

export async function createPersona(tenantId: string, userId: string, input: CreatePersonaInput): Promise<Persona> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personas")
    .insert({
      tenant_id: tenantId,
      created_by: userId,
      name: input.name,
      description: input.description || null,
      filters: input.filters,
      is_starter: false,
      visibility: input.visibility ?? 'team_shared',  // NEW — D-08
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create persona: ${error.message}`);
  }

  return data as Persona;
}

export async function updatePersona(id: string, tenantId: string, input: UpdatePersonaInput): Promise<Persona> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.filters !== undefined) updateData.filters = input.filters;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;  // NEW

  const { data, error } = await supabase
    .from("personas")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("is_starter", false)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update persona: ${error.message}`);
  }

  return data as Persona;
}

export async function deletePersona(id: string, tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("personas")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .eq("is_starter", false);

  if (error) {
    throw new Error(`Failed to delete persona: ${error.message}`);
  }
}

export async function updatePersonaLastUsed(id: string, tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("personas")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to update persona last used: ${error.message}`);
  }
}

export async function seedStarterPersonas(tenantId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Check which starter personas already exist for this tenant
  const { data: existing, error: fetchError } = await supabase
    .from("personas")
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("is_starter", true);

  if (fetchError) {
    throw new Error(`Failed to check existing starter personas: ${fetchError.message}`);
  }

  const existingNames = new Set((existing ?? []).map(p => p.name));

  const personasToInsert = STARTER_PERSONAS
    .filter(persona => !existingNames.has(persona.name))
    .map(persona => ({
      tenant_id: tenantId,
      created_by: userId,
      name: persona.name,
      description: persona.description || null,
      filters: persona.filters,
      is_starter: true,
      visibility: 'team_shared' as const,  // NEW — Pitfall 7 belt-and-braces
    }));

  if (personasToInsert.length === 0) {
    return; // All starter personas already exist
  }

  const { error } = await supabase
    .from("personas")
    .insert(personasToInsert);

  if (error) {
    throw new Error(`Failed to seed starter personas: ${error.message}`);
  }
}

/**
 * Updates a persona's visibility. Creator/admin gating enforced by RLS
 * UPDATE USING clause (D-09) — no parallel JS permission check.
 * A non-creator non-admin caller silently updates zero rows.
 */
export async function updatePersonaVisibility(
  id: string,
  tenantId: string,
  visibility: Visibility
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("personas")
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to update persona visibility: ${error.message}`);
  }
}

/**
 * Admin-workspace fetcher: personas with creator (full_name + email) joined from users.
 * No visibility filter — relies on RLS admin role clause to yield all rows.
 * Callers are already admin-gated at the page level (D-12).
 */
export async function getAllPersonasWithCreators(tenantId: string): Promise<PersonaWithCreator[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personas")
    .select(`
      *,
      creator:users!created_by (
        id,
        full_name,
        email
      )
    `)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch all personas with creators: ${error.message}`);
  }

  return data as unknown as PersonaWithCreator[];
}
