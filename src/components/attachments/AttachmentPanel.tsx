"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  Trash,
  UploadSimple,
  DownloadSimple,
  PencilSimple,
  Check,
  X,
  FileText,
  CircleNotch,
  DotsSixVertical,
} from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { prepend_path } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAttachmentsData, type Attachment } from "@/hooks/useAttachmentData";
import {
  uploadAndAttach,
  updateAttachmentField,
  reorderAttachments,
  handleDeleteAttachment,
} from "@/utils/handlers/attachmentHandlers";
import { toast } from "sonner";

const fileUrl = (fileId: string) => `${prepend_path}/api/files/${fileId}`;

interface AttachmentPanelProps {
  targetType: string;
  targetId: string;
  title?: string;
  description?: string;
  /** category stamped on files uploaded through this panel */
  defaultCategory?: string;
  accept?: string;
  className?: string;
}

export function AttachmentPanel({
  targetType,
  targetId,
  title = "Attachments",
  description = "Files linked to this record",
  defaultCategory = "gallery",
  accept,
  className,
}: AttachmentPanelProps) {
  const { currentUser } = useCurrentUser();
  const { attachmentsData, attachmentsError, mutateAttachments } = useAttachmentsData({
    targetType,
    targetId,
  });

  const [items, setItems] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (attachmentsData) setItems(attachmentsData);
  }, [attachmentsData]);

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!currentUser?._id) {
      toast.error("Sign in again to upload");
      return;
    }
    setUploading(true);
    try {
      let ok = 0;
      for (const file of Array.from(fileList)) {
        const id = await uploadAndAttach(file, {
          targetType,
          targetId,
          category: defaultCategory,
          responsible: currentUser._id,
        });
        if (id) ok += 1;
      }
      if (ok) toast.success(`Attached ${ok} file${ok > 1 ? "s" : ""}`);
      await mutateAttachments();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onReorder = (next: Attachment[]) => {
    setItems(next);
  };

  const persistOrder = async () => {
    await reorderAttachments(items.map((a) => a._id));
    mutateAttachments();
  };

  const onDelete = async (id: string) => {
    setItems((prev) => prev.filter((a) => a._id !== id));
    try {
      await handleDeleteAttachment(id);
    } finally {
      mutateAttachments();
    }
  };

  const onCaption = async (id: string, caption: string) => {
    setItems((prev) => prev.map((a) => (a._id === id ? { ...a, caption } : a)));
    await updateAttachmentField(id, "caption", caption);
    mutateAttachments();
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <CircleNotch className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <UploadSimple className="mr-1 h-4 w-4" />
          )}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </CardHeader>
      <CardContent>
        {attachmentsError ? (
          <p className="text-sm text-destructive">Could not load attachments.</p>
        ) : !attachmentsData ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Use Upload to add images, documents, video or audio.
          </p>
        ) : (
          <Reorder.Group axis="y" values={items} onReorder={onReorder} className="space-y-3">
            {items.map((attachment) => (
              <AttachmentRow
                key={attachment._id}
                attachment={attachment}
                onDragEnd={persistOrder}
                onOpenImage={() => setPreview(attachment.fileId)}
                onDelete={() => onDelete(attachment._id)}
                onCaption={(caption) => onCaption(attachment._id, caption)}
              />
            ))}
          </Reorder.Group>
        )}
      </CardContent>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="h-[90vh] w-full max-w-7xl p-0">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="flex h-full w-full items-center justify-center">
            {preview && (
              <img src={fileUrl(preview)} alt="Full size" className="max-h-full max-w-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface AttachmentRowProps {
  attachment: Attachment;
  onDragEnd: () => void;
  onOpenImage: () => void;
  onDelete: () => void;
  onCaption: (caption: string) => void;
}

function AttachmentRow({ attachment, onDragEnd, onOpenImage, onDelete, onCaption }: AttachmentRowProps) {
  const controls = useDragControls();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(attachment.caption ?? "");

  useEffect(() => {
    setDraft(attachment.caption ?? "");
  }, [attachment.caption]);

  const src = fileUrl(attachment.fileId);

  return (
    <Reorder.Item
      value={attachment}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="rounded-lg border bg-card"
    >
      <div className="flex gap-3 p-3">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="cursor-grab touch-none self-center text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <DotsSixVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          {attachment.kind === "image" && (
            <img
              src={src}
              alt={attachment.caption || "Attachment"}
              className="max-h-64 cursor-pointer rounded-md object-contain"
              onClick={onOpenImage}
            />
          )}
          {attachment.kind === "video" && (
            <video src={src} controls className="max-h-64 w-full rounded-md" />
          )}
          {attachment.kind === "audio" && <audio src={src} controls className="w-full" />}
          {(attachment.kind === "document" || attachment.kind === "data") && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              {attachment.caption || attachment.contentType || "Open file"}
            </a>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">{attachment.category}</Badge>
            {editing ? (
              <>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Caption"
                  className="h-7 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onCaption(draft.trim());
                      setEditing(false);
                    }
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    onCaption(draft.trim());
                    setEditing(false);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate text-sm text-muted-foreground">
                  {attachment.caption || "No caption"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditing(true)}
                  aria-label="Edit caption"
                >
                  <PencilSimple className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" asChild aria-label="Download">
              <a href={`${prepend_path}/api/download?id=${attachment.fileId}`}>
                <DownloadSimple className="h-4 w-4" />
              </a>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Delete">
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete attachment</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the link and, if nothing else points at the file, the file itself.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Reorder.Item>
  );
}
