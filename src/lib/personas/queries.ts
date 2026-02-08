import { createClient } from "@/lib/supabase/server";
import type { Persona, CreatePersonaInput, UpdatePersonaInput } from "./types";
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

export async function createPersona(tenantId: string, input: CreatePersonaInput): Promise<Persona> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personas")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description || null,
      filters: input.filters,
      is_starter: false
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

export async function seedStarterPersonas(tenantId: string): Promise<void> {
  const supabase = await createClient();

  const personasToInsert = STARTER_PERSONAS.map(persona => ({
    tenant_id: tenantId,
    name: persona.name,
    description: persona.description || null,
    filters: persona.filters,
    is_starter: true
  }));

  const { error } = await supabase
    .from("personas")
    .upsert(personasToInsert, {
      onConflict: "tenant_id,name",
      ignoreDuplicates: true
    });

  if (error) {
    throw new Error(`Failed to seed starter personas: ${error.message}`);
  }
}
