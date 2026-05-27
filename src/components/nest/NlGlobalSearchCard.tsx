"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prepend_path } from "@/lib/utils";

interface RouteInfo {
  label: string;
  path: string;
  columns: string[];
}

interface NlGlobalSearchCardProps {
  compact?: boolean;
  className?: string;
}

export function NlGlobalSearchCard({
  compact = false,
  className,
}: NlGlobalSearchCardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);

  useEffect(() => {
    fetch(`${prepend_path}/api/schema`)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes) {
          setRoutes(data.routes);
        }
      })
      .catch(() => {
        // no-op
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !routes.length) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${prepend_path}/api/nlfilter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), routes }),
      });

      const data = await res.json();

      if (!res.ok || !data.route) {
        setError(data.error ?? "Could not determine destination");
        return;
      }

      const urlParams = new URLSearchParams(data.params ?? {}).toString();
      router.push(urlParams ? `${data.route}?${urlParams}` : data.route);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={className}>
      {!compact && (
        <CardHeader>
          <CardTitle>Search the NEST</CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "pt-4 pb-3" : "pb-3"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {compact && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Search the NEST</span>
              <Sparkles className="h-3 w-3" />
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                compact
                  ? 'e.g. "silk samples in box pw01"'
                  : 'e.g. "show me all silk samples of type dragline in box pw01"'
              }
              className="h-9 text-sm"
              disabled={loading}
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-9 shrink-0"
              disabled={loading || !query.trim() || !routes.length}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
