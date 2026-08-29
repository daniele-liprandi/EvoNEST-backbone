"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prepend_path } from "@/lib/utils";

interface NlFilterBarProps {
  columns: string[];
}

export function NlFilterBar({ columns }: NlFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${prepend_path}/api/nlfilter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), columns }),
      });

      const data = await res.json();

      if (!res.ok || !data.params) {
        setError(data.error ?? "Could not generate filter");
        return;
      }

      const urlParams = new URLSearchParams(data.params).toString();
      router.push(urlParams ? `${pathname}?${urlParams}` : pathname);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hidden lg:flex flex-col gap-1 mb-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "silk samples in box pw01 with _wlk in the name"'
          className="h-8 text-sm"
          disabled={loading}
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          disabled={loading || !query.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Filter"}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive pl-6">{error}</p>}
    </div>
  );
}
