"use client";

import Link from "next/link";
import { Compass, House } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown for any unmatched route under the (nest) route group. */
export default function NestNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <Compass className="mb-2 size-10 text-muted-foreground" />
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            There is nothing here. The page may have moved or the link may be wrong.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="default">
            <Link href="/home">
              <House /> Go home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
