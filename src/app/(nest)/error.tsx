"use client";

import { useEffect } from "react";
import Link from "next/link";
import { WarningCircle, ArrowClockwise, House } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Catches render/runtime errors anywhere under the (nest) route group, so a
 * crash (e.g. a bad SWR response, see #188) shows a recoverable screen
 * instead of Next's raw "Application error".
 */
export default function NestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <WarningCircle className="mb-2 size-10 text-destructive" />
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.message || "An unexpected error occurred while loading this page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button onClick={() => reset()} variant="default">
            <ArrowClockwise /> Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/home">
              <House /> Go home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
