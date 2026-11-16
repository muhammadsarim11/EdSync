"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
      <h1 className="text-2xl font-semibold">EdSync</h1>

      {(isLoading || user) && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && !user && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-muted-foreground">Not logged in.</p>
          <div className="flex gap-2">
            <Link href="/login" className={cn(buttonVariants())}>
              Log in
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Create an institute
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
