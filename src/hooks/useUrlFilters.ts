"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const RESERVED_PARAMS = new Set(["page", "pageSize", "sort", "order"]);

function matchesFilter(cellValue: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return cellValue.toLowerCase() === pattern.toLowerCase();
  }

  const regexStr =
    "^" +
    pattern
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*") +
    "$";

  return new RegExp(regexStr, "i").test(cellValue);
}

function compareDateCell(
  cellValue: string,
  threshold: string,
  op: "gte" | "lte"
): boolean {
  const cellDate = cellValue.slice(0, 10);
  return op === "gte" ? cellDate >= threshold : cellDate <= threshold;
}

export interface ActiveFilter {
  key: string;
  values: string[];
}

export function useUrlFilters() {
  const searchParams = useSearchParams();

  const filters = useMemo((): ActiveFilter[] => {
    const result: ActiveFilter[] = [];

    searchParams.forEach((value, key) => {
      if (!RESERVED_PARAMS.has(key)) {
        const values = value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

        if (values.length) {
          result.push({ key, values });
        }
      }
    });

    return result;
  }, [searchParams]);

  const filterData = useCallback(
    (data: Record<string, unknown>[]): Record<string, unknown>[] => {
      if (!data.length || !filters.length) {
        return data;
      }

      const dataKeys = new Set(Object.keys(data[0]));

      return data.filter((row) =>
        filters.every(({ key, values }) => {
          if (key.endsWith("_gte")) {
            const baseKey = key.slice(0, -4);
            if (!dataKeys.has(baseKey)) {
              return true;
            }

            return values.some((v) =>
              compareDateCell(String(row[baseKey] ?? ""), v, "gte")
            );
          }

          if (key.endsWith("_lte")) {
            const baseKey = key.slice(0, -4);
            if (!dataKeys.has(baseKey)) {
              return true;
            }

            return values.some((v) =>
              compareDateCell(String(row[baseKey] ?? ""), v, "lte")
            );
          }

          if (!dataKeys.has(key)) {
            return true;
          }

          return values.some((v) => matchesFilter(String(row[key] ?? ""), v));
        })
      );
    },
    [filters]
  );

  const buildUrlWithoutFilter = useCallback(
    (key: string, pathname: string): string => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      const str = params.toString();
      return str ? `${pathname}?${str}` : pathname;
    },
    [searchParams]
  );

  return {
    filters,
    filterData,
    hasFilters: filters.length > 0,
    buildUrlWithoutFilter,
  };
}
