'use client';

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuth({ required = true } = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    if (required && !isLoading && !isAuthenticated) {
      // Redirect to login if not authenticated
      router.push("/auth/signin");
    }
  }, [required, isLoading, isAuthenticated, router]);

  return {
    session,
    isLoading,
    isAuthenticated,
  };
}