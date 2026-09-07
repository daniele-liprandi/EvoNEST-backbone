// Uses the global SWRConfig fetcher (src/lib/swr-fetcher.ts), which throws on a
// non-OK response so `attachmentsError` reflects a failed request instead of
// resolving with the error body as data.
import useSWR, { type SWRConfiguration } from "swr";
import { prepend_path } from "@/lib/utils";

export interface AttachmentQuery {
  targetType?: string;
  targetId?: string;
  kind?: string;
  category?: string;
}

export interface Attachment {
  _id: string;
  fileId: string;
  targetType: string;
  targetId: string;
  category: string;
  kind: "image" | "video" | "audio" | "document" | "data";
  contentType: string | null;
  caption: string | null;
  order: number | null;
  stepKey: string | null;
  responsible: string | null;
  date: string;
  createdAt: string;
  [key: string]: unknown;
}

const buildUrl = (query: AttachmentQuery) => {
  const params = new URLSearchParams();
  for (const key of ["targetType", "targetId", "kind", "category"] as const) {
    const value = query[key];
    if (value) params.append(key, value);
  }
  const qs = params.toString();
  return `${prepend_path}/api/attachments${qs ? `?${qs}` : ""}`;
};

/**
 * List attachments, optionally scoped to one target or filtered by kind/category.
 * Passing a query with an empty `targetId` yields `null` so a panel waiting on an
 * id doesn't fetch the whole lab.
 */
export const useAttachmentsData = (query: AttachmentQuery = {}, options?: SWRConfiguration) => {
  const waiting = "targetId" in query && !query.targetId;
  const { data, error, isValidating, isLoading, mutate } = useSWR<Attachment[]>(
    waiting ? null : buildUrl(query),
    options,
  );

  return {
    attachmentsData: data,
    attachmentsError: error,
    isValidating,
    isLoading,
    mutateAttachments: mutate,
  };
};
