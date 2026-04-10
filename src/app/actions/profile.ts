"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    full_name: formData.get("full_name"),
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const { full_name } = parsed.data;

  const { error: updateError } = await supabase
    .from("users")
    .update({ full_name })
    .eq("id", user.id);

  if (updateError) {
    console.error("[updateProfile] Failed to update profile:", updateError);
    return { error: "Failed to update profile" };
  }

  return { success: true };
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const raw = {
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const { new_password } = parsed.data;

  // Re-authenticate with current password to verify it before allowing change
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: raw.current_password as string,
  });

  if (signInError) {
    return { error: "Current password is incorrect" };
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: new_password,
  });

  if (passwordError) {
    console.error("[changePassword] Failed to update password:", passwordError);
    return { error: "Failed to update password" };
  }

  return { success: true };
}
