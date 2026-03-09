"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ActivityLogViewer } from "@/components/activity/activity-log-viewer";

export default function ActivityLogPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const role = user.app_metadata?.role;
      if (role !== "tenant_admin" && role !== "super_admin") {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
    }
    checkAccess();
  }, [router]);

  if (!authorized) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Activity Log
        </h1>
        <p className="mt-1 text-muted-foreground">
          Browse all team activity
        </p>
      </div>
      <ActivityLogViewer />
    </div>
  );
}
