import useSWR from "swr";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { prepend_path } from "@/lib/utils";
import type { FetchError } from "@/lib/swr-fetcher";
import type { PivotResult } from "@/lib/analysis/pivot";
import { parseAnalysisState, serialiseAnalysisState, type AnalysisUrlState } from "@/lib/analysis/url-state";

import type { Source } from "@/lib/analysis/url-state";

export type { Source, AnalysisUrlState };

export type DimensionOption = { id: string; label: string; values: string[] };
export type QuantityOption = { value: string; label: string; unit: string | null; count: number; units: string[] };

export type AnalysisOptions = { source: Source; dimensions: DimensionOption[]; quantities: QuantityOption[] };

export type AnalysisRequest = {
  source: Source;
  rows: string[];
  column: string | null;
  quantity?: string;
  filters: Record<string, string[]>;
};

export type AnalysisResult = PivotResult & {
  source: Source;
  quantity: string | null;
  unit: string;
  rowDimensions: string[];
  column: string | null;
  metadata: { total: number; matched: number; processingTime: string };
};

export function useAnalysisOptions(source: Source) {
  const { data, error } = useSWR<AnalysisOptions>(`${prepend_path}/api/analysis?source=${source}`);
  return { options: data, optionsError: error as FetchError | undefined };
}

const postFetcher = async ([url, body]: [string, string]): Promise<AnalysisResult> => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  if (!res.ok) {
    const error: FetchError = new Error("Could not run the analysis.");
    error.status = res.status;
    error.info = await res.json().catch(() => undefined);
    throw error;
  }
  return res.json();
};

export function useAnalysisResult(request: AnalysisRequest | null) {
  const key = request ? ([`${prepend_path}/api/analysis`, JSON.stringify(request)] as [string, string]) : null;
  const { data, error, isLoading } = useSWR<AnalysisResult>(key, postFetcher, { keepPreviousData: true });
  return { result: data, resultError: error as FetchError | undefined, loading: isLoading };
}

/** Kept in the URL so that a view can be bookmarked and shared. */
export function useAnalysisUrlState(defaults: Partial<AnalysisUrlState>) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
   
  const state = useMemo(() => parseAnalysisState(new URLSearchParams(params.toString()), defaults), [params]);
  const update = useCallback(
    (patch: Partial<AnalysisUrlState>) => {
      router.replace(`${pathname}?${serialiseAnalysisState({ ...state, ...patch })}`, { scroll: false });
    },
    [router, pathname, state],
  );
  return [state, update] as const;
}
