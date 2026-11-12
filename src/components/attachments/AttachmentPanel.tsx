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
  LinkSimple,
  MagnifyingGlass,
  CloudArrowDown,
  CaretLeft,
  CaretRight,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { prepend_path } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAttachmentsData, type Attachment } from "@/hooks/useAttachmentData";
import {
  uploadAndAttach,
  updateAttachmentField,
  reorderAttachments,
  handleDeleteAttachment,
  linkExternalAndAttach,
  checkFileLink,
  updateFilePath,
  importExternalFile,
} from "@/utils/handlers/attachmentHandlers";
import { toast } from "sonner";

const IMAGE_CAP = 6;
const FILE_CAP = 4;

const fileUrl = (fileId: string) => `${prepend_path}/api/files/${fileId}`;

interface AttachmentPanelProps {
  targetType: string;
  targetId: string;
  title?: string;
  description?: string;
  /** "compact": thumbnail grid + manage dialog. "full": the editable list, for use inside a dialog. */
  variant?: "compact" | "full";
  /** category stamped on files uploaded through this panel */
  defaultCategory?: string;
  accept?: string;
  className?: string;
}

export function AttachmentPanel({
  targetType,
  targetId,
  title = "Attachments",
  description,
  variant = "compact",
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [externalPath, setExternalPath] = useState("");
  const [externalContext, setExternalContext] = useState("");
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
        const id = await uploadAndAttach(
          file,
          { targetType, targetId, category: defaultCategory, responsible: currentUser._id },
          "attachments",
          { quiet: true },
        );
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

  const onLinkExternal = async () => {
    const path = externalPath.trim();
    if (!path) return;
    if (!currentUser?._id) {
      toast.error("Sign in again to link a file");
      return;
    }
    setUploading(true);
    try {
      const id = await linkExternalAndAttach(
        path,
        { targetType, targetId, category: defaultCategory, responsible: currentUser._id },
        externalContext.trim() ? { context: externalContext.trim() } : {},
      );
      if (id) {
        toast.success("External file linked");
        setExternalOpen(false);
        setExternalPath("");
        setExternalContext("");
        await mutateAttachments();
      }
    } finally {
      setUploading(false);
    }
  };

  const images = items.filter((a) => a.kind === "image");
  const files = items.filter((a) => a.kind !== "image");
  const compact = variant === "compact";

  const list = (
    <Reorder.Group axis="y" values={items} onReorder={onReorder} className="space-y-3">
      {items.map((attachment) => (
        <AttachmentRow
          key={attachment._id}
          attachment={attachment}
          onDragEnd={persistOrder}
          onOpenImage={() =>
            setPreviewIndex(images.findIndex((a) => a._id === attachment._id))
          }
          onDelete={() => onDelete(attachment._id)}
          onCaption={(caption) => onCaption(attachment._id, caption)}
          onChanged={mutateAttachments}
        />
      ))}
    </Reorder.Group>
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {compact && items.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setManageOpen(true)}>
              Manage
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={uploading}>
                {uploading ? (
                  <CircleNotch className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UploadSimple className="mr-1 h-4 w-4" />
                )}
                Add file
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
                <UploadSimple className="mr-2 h-4 w-4" />
                Load into the NEST
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setExternalOpen(true)}>
                <LinkSimple className="mr-2 h-4 w-4" />
                External link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : !compact ? (
          list
        ) : (
          <div className="space-y-3">
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.slice(0, IMAGE_CAP).map((image, i) => {
                  const hidden = images.length - IMAGE_CAP + 1;
                  const overflow = images.length > IMAGE_CAP && i === IMAGE_CAP - 1;
                  return (
                    <button
                      key={image._id}
                      type="button"
                      className="relative aspect-square overflow-hidden rounded-md"
                      onClick={() => (overflow ? setManageOpen(true) : setPreviewIndex(i))}
                      aria-label={overflow ? `Show ${hidden} more` : image.caption || "Open image"}
                    >
                      <img
                        src={fileUrl(image.fileId)}
                        alt={image.caption || "Attachment"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {overflow && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-medium text-white">
                          +{hidden}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.slice(0, FILE_CAP).map((file) => (
                  <li key={file._id}>
                    <a
                      href={fileUrl(file.fileId)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm hover:underline"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {file.caption || file.contentType || "Open file"}
                      </span>
                      {file.file?.backend === "external" && (
                        <LinkSimple className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </a>
                  </li>
                ))}
                {files.length > FILE_CAP && (
                  <li>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:underline"
                      onClick={() => setManageOpen(true)}
                    >
                      +{files.length - FILE_CAP} more
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">Edit, reorder or remove attachments</DialogDescription>
          </DialogHeader>
          {list}
        </DialogContent>
      </Dialog>

      <Dialog open={externalOpen} onOpenChange={setExternalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link an external file</DialogTitle>
            <DialogDescription>
              The file is not copied into the NEST.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={externalPath}
              onChange={(e) => setExternalPath(e.target.value)}
              placeholder="/mnt/instrument-pc/run-2026-09/scan.tif"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onLinkExternal();
              }}
            />
            <Input
              value={externalContext}
              onChange={(e) => setExternalContext(e.target.value)}
              placeholder="Where it lives (optional) — e.g. Confocal NAS"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExternalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onLinkExternal} disabled={!externalPath.trim() || uploading}>
              Link file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Lightbox images={images} index={previewIndex} onIndex={setPreviewIndex} />
    </Card>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
}: {
  images: Attachment[];
  index: number | null;
  onIndex: (i: number | null) => void;
}) {
  const open = index !== null && index >= 0 && index < images.length;
  const step = (delta: number) =>
    onIndex(((index ?? 0) + delta + images.length) % images.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const current = open ? images[index!] : null;
  return (
    <Dialog open={open} onOpenChange={() => onIndex(null)}>
      <DialogContent className="h-[90vh] w-full max-w-7xl p-0">
        <DialogTitle className="sr-only">Image</DialogTitle>
        <DialogDescription className="sr-only">Full size image</DialogDescription>
        <DialogClose className="absolute right-4 top-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        {current && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
            <img
              src={fileUrl(current.fileId)}
              alt={current.caption || "Full size"}
              className="min-h-0 max-w-full flex-1 object-contain"
            />
            {current.caption && <p className="text-sm text-muted-foreground">{current.caption}</p>}
          </div>
        )}
        {images.length > 1 && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-2 top-1/2 -translate-y-1/2"
              aria-label="Previous image"
              onClick={() => step(-1)}
            >
              <CaretLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              aria-label="Next image"
              onClick={() => step(1)}
            >
              <CaretRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface AttachmentRowProps {
  attachment: Attachment;
  onDragEnd: () => void;
  onOpenImage: () => void;
  onDelete: () => void;
  onCaption: (caption: string) => void;
  onChanged: () => void;
}

function AttachmentRow({
  attachment,
  onDragEnd,
  onOpenImage,
  onDelete,
  onCaption,
  onChanged,
}: AttachmentRowProps) {
  const controls = useDragControls();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(attachment.caption ?? "");

  useEffect(() => {
    setDraft(attachment.caption ?? "");
  }, [attachment.caption]);

  const isExternal = attachment.file?.backend === "external";
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

          {isExternal && (
            <ExternalControls attachment={attachment} onChanged={onChanged} />
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
                    Removes the attachment, and the file if nothing else uses it. This cannot
                    be undone.
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

const STATUS_LABEL: Record<string, string> = {
  ok: "reachable",
  missing: "missing",
  unknown: "outside server roots",
};

const STATUS_STYLE: Record<string, string> = {
  ok: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  missing: "border-transparent bg-destructive/15 text-destructive",
  unknown: "border-transparent bg-muted text-muted-foreground",
};

function ExternalControls({
  attachment,
  onChanged,
}: {
  attachment: Attachment;
  onChanged: () => void;
}) {
  const file = attachment.file!;
  const [path, setPath] = useState(file.path ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = path.trim() !== (file.path ?? "");

  useEffect(() => {
    setPath(file.path ?? "");
  }, [file.path]);

  const status = file.lastCheckedStatus;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-dashed p-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant="outline" className="gap-1">
          <LinkSimple className="h-3 w-3" />
          external
        </Badge>
        {status && (
          <Badge
            variant="outline"
            className={STATUS_STYLE[status]}
            title={status === "unknown" ? "The server may only read paths under EXTERNAL_FILE_ROOTS" : undefined}
          >
            {STATUS_LABEL[status]}
          </Badge>
        )}
        {file.lastCheckedAt && (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            checked {new Date(file.lastCheckedAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="h-7 flex-1 font-mono text-xs"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter" && dirty) run(() => updateFilePath(attachment.fileId, path.trim()));
          }}
        />
        {dirty && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={busy}
            aria-label="Save path"
            onClick={() => run(() => updateFilePath(attachment.fileId, path.trim()))}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          disabled={busy}
          onClick={() => run(() => checkFileLink(attachment.fileId))}
        >
          <MagnifyingGlass className="mr-1 h-3.5 w-3.5" />
          Check link integrity
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          disabled={busy}
          onClick={() => run(() => importExternalFile(attachment.fileId))}
        >
          <CloudArrowDown className="mr-1 h-3.5 w-3.5" />
          Load into the NEST
        </Button>
      </div>
    </div>
  );
}
