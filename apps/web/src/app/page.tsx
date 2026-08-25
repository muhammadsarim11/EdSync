"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, isLoading, logout } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
      <h1 className="text-2xl font-semibold">EdSync</h1>

      {isLoading && <p className="text-muted-foreground">Checking session…</p>}

      {!isLoading && !user && (
        <p className="text-muted-foreground">Not logged in.</p>
      )}

      {!isLoading && user && (
        <div className="flex flex-col items-center gap-3">
          <p>
            Signed in as <span className="font-medium">{user.name}</span> (
            {user.role})
          </p>
          <Button onClick={() => logout()}>Log out</Button>
        </div>
      )}
    </main>
  );
}
