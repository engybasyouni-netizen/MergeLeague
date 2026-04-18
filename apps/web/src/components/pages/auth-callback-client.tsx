"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredToken } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finalizing sign-in...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setMessage("No token was returned from GitHub sign-in.");
      return;
    }

    setStoredToken(token);
    setMessage("Signed in. Redirecting to your dashboard...");
    const timeout = window.setTimeout(() => router.replace("/dashboard"), 900);
    return () => window.clearTimeout(timeout);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center pb-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>GitHub authentication</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          MergeLeague stores the API token in your browser so the dashboard can call protected endpoints.
        </CardContent>
      </Card>
    </main>
  );
}

