import useSWR from "swr";
import { prepend_path } from "@/lib/utils";

export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  databases: string[];
}

interface ApiKeysResponse {
  apiKeys: ApiKey[];
  totalKeys: number;
  activeKeys: number;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`api-keys request failed: ${res.status}`);
    return res.json() as Promise<ApiKeysResponse>;
  });

export function useApiKeys() {
  const { data, error, isLoading, mutate } = useSWR(
    `${prepend_path}/api/user/api-keys`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    apiKeys: data?.apiKeys ?? [],
    activeCount: data?.activeKeys ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
