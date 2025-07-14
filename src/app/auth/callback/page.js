'use client';

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Inner component that handles the authentication logic
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      router.push(`/auth/error?error=${error}`);
    } else {
      router.push("/"); // Redirect to home on successful callback
    }
  }, [error, router]);

  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold">Processing signin...</h1>
      <p className="text-muted-foreground">Please wait while we complete the authentication.</p>
    </div>
  );
}

// Main component with Suspense boundary
export default function CallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Loading...</h1>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}