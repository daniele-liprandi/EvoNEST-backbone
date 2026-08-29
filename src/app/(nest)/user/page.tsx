"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Copy, Eye, EyeOff, Trash2, Plus, Key } from "lucide-react";
import { toast } from "sonner";

import { prepend_path } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useApiKeys, type ApiKey } from "@/hooks/useApiKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import UserAuthenticationControl from "@/components/nest/authui/UserAuthenticationControl";

const profileSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const newKeySchema = z.object({
  name: z.string().trim().max(80).optional(),
  expiresInDays: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().max(3650).optional()
  ),
});

function ProfileCard() {
  const { currentUser } = useCurrentUser();
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { email: currentUser?.email ?? "" },
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      const res = await fetch(`${prepend_path}/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "setfield", field: "email", value: email }),
      });
      if (!res.ok) throw new Error("request failed");
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update the profile");
    }
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>My profile</CardTitle>
        <CardDescription>The email address linked to your NEST account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/api/auth/signout">Log out</Link>
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
        <UserAuthenticationControl />
      </CardContent>
    </Card>
  );
}

function GeneratedKeyNotice({ value, onDone }: { value: string; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  return (
    <Alert className="border-primary/40 bg-primary/5">
      <AlertDescription>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Save this key now. It is not shown again.</p>
          <div className="flex items-center gap-2 rounded-md border bg-card p-2">
            <code className="flex-1 break-all font-mono text-xs">
              {shown ? value : "•".repeat(32)}
            </code>
            <Button size="icon-sm" variant="ghost" onClick={() => setShown((s) => !s)}>
              {shown ? <EyeOff /> : <Eye />}
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(value);
                toast.success("Key copied");
              }}
            >
              <Copy />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Send it as <code className="rounded bg-muted px-1">Authorization: Bearer &lt;key&gt;</code>
          </p>
          <Button size="sm" variant="outline" className="self-end" onClick={onDone}>
            Done
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

function KeyRow({
  apiKey,
  onRevoke,
  busy,
}: {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
  busy: boolean;
}) {
  const meta = [
    `Created ${new Date(apiKey.createdAt).toLocaleDateString()}`,
    apiKey.lastUsedAt && `Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`,
    `${apiKey.usageCount} uses`,
    apiKey.expiresAt && `Expires ${new Date(apiKey.expiresAt).toLocaleDateString()}`,
  ].filter(Boolean);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{apiKey.name}</p>
          {!apiKey.isActive && <Badge variant="outline">Revoked</Badge>}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{apiKey.keyPreview}</p>
        <p className="text-xs text-muted-foreground">{meta.join(" · ")}</p>
      </div>
      {apiKey.isActive && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive"
          disabled={busy}
          onClick={() => onRevoke(apiKey.id)}
          aria-label={`Revoke ${apiKey.name}`}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

function ApiKeysCard() {
  const { apiKeys, activeCount, refresh } = useApiKeys();
  const [generated, setGenerated] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<z.infer<typeof newKeySchema>>({
    resolver: zodResolver(newKeySchema),
    defaultValues: { name: "", expiresInDays: 365 },
  });

  const create = form.handleSubmit(async (values) => {
    setBusy(true);
    setGenerated(null);
    try {
      const res = await fetch(`${prepend_path}/api/user/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      setGenerated(data.apiKey);
      form.reset({ name: "", expiresInDays: 365 });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the key");
    } finally {
      setBusy(false);
    }
  });

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${prepend_path}/api/user/api-keys`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id }),
      });
      if (!res.ok) throw new Error("request failed");
      await refresh();
      toast.success("Key revoked");
    } catch {
      toast.error("Could not revoke the key");
    } finally {
      setPendingRevoke(null);
      setBusy(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Key className="size-5" /> API keys
        </CardTitle>
        <CardDescription>
          Read-only keys for exporting your data programmatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={create} className="space-y-4 rounded-md border bg-muted/40 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Python export script" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresInDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires in (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              <Plus /> {busy ? "Generating..." : "Generate key"}
            </Button>
          </form>
        </Form>

        {generated && (
          <GeneratedKeyNotice value={generated} onDone={() => setGenerated(null)} />
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            Your keys ({activeCount} active)
          </h3>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No keys yet. Generate one above.
            </p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <KeyRow key={key.id} apiKey={key} onRevoke={setPendingRevoke} busy={busy} />
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog
        open={!!pendingRevoke}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using it stops working straight away. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !pendingRevoke}
              onClick={() => pendingRevoke && revoke(pendingRevoke)}
            >
              {busy ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default function UserPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <ProfileCard />
        <ApiKeysCard />
      </div>
    </div>
  );
}
