'use client';

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

const getErrorMessage = (error) => {
  switch (error) {
    case "Configuration":
      return "There is a problem with the server configuration.";
    case "AccessDenied":
      return "Access was denied to this resource.";
    case "Verification":
      return "The verification token has expired or has already been used.";
    default:
      return "An error occurred during authentication.";
  }
};

// Create an inner component that uses searchParams
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = getErrorMessage(error);

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-4 text-2xl font-bold text-red-600">Authentication Error</h1>
      <p className="mb-8 text-muted-foreground">{errorMessage}</p>
      <Button asChild>
        <Link href="/auth/signin">Try Again</Link>
      </Button>
    </div>
  );
}

// Main component with Suspense boundary
export default function ErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}