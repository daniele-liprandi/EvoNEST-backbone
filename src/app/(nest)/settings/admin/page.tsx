"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useUserData } from "@/hooks/useUserData"
import { prepend_path } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Role {
  value: string
  label: string
  description?: string
}
interface Permission {
  value: string
  roles: string[]
}
interface Capability {
  value: string
  label: string
}

function post(method: string, data: unknown) {
  return fetch(`${prepend_path}/api/config/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, data }),
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || "Request failed")
    return body
  })
}

function RolesEditor({ roles, onSaved }: { roles: Role[]; onSaved: () => void }) {
  const [draft, setDraft] = useState<Role[]>(roles)
  const [saving, setSaving] = useState(false)
  useEffect(() => setDraft(roles), [roles])

  const set = (i: number, patch: Partial<Role>) =>
    setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const save = async () => {
    setSaving(true)
    try {
      await post("setRoles", draft.filter((r) => r.value.trim()))
      toast.success("Roles saved")
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save roles")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <CardDescription>
          The roles a person can hold. <code>admin</code> always has full access and cannot be removed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft.map((role, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              className="w-32 font-mono text-sm"
              value={role.value}
              disabled={role.value === "admin"}
              onChange={(e) => set(i, { value: e.target.value.replace(/\s/g, "") })}
              placeholder="value"
            />
            <Input
              className="w-40"
              value={role.label}
              onChange={(e) => set(i, { label: e.target.value })}
              placeholder="Label"
            />
            <Input
              className="min-w-[16rem] flex-1"
              value={role.description ?? ""}
              onChange={(e) => set(i, { description: e.target.value })}
              placeholder="Description"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove role"
              disabled={role.value === "admin"}
              onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDraft((d) => [...d, { value: "", label: "", description: "" }])}
          >
            Add role
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            Save roles
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PermissionsMatrix({
  roles,
  permissions,
  capabilities,
  onSaved,
}: {
  roles: Role[]
  permissions: Permission[]
  capabilities: Capability[]
  onSaved: () => void
}) {
  const editableRoles = useMemo(() => roles.filter((r) => r.value !== "admin"), [roles])
  const [draft, setDraft] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const next: Record<string, Set<string>> = {}
    for (const cap of capabilities) {
      const entry = permissions.find((p) => p.value === cap.value)
      next[cap.value] = new Set(entry?.roles ?? [])
    }
    setDraft(next)
  }, [permissions, capabilities])

  const toggle = (cap: string, role: string) =>
    setDraft((d) => {
      const set = new Set(d[cap])
      set.has(role) ? set.delete(role) : set.add(role)
      return { ...d, [cap]: set }
    })

  const save = async () => {
    setSaving(true)
    try {
      const data = capabilities.map((cap) => ({
        value: cap.value,
        roles: [...(draft[cap.value] ?? [])],
      }))
      await post("setPermissions", data)
      toast.success("Permissions saved")
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save permissions")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>Which roles may perform each action. Admin holds every one.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[16rem]">Action</TableHead>
                <TableHead className="text-center">admin</TableHead>
                {editableRoles.map((r) => (
                  <TableHead key={r.value} className="text-center">
                    {r.label || r.value}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {capabilities.map((cap) => (
                <TableRow key={cap.value}>
                  <TableCell>{cap.label}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox checked disabled aria-label="admin always allowed" />
                  </TableCell>
                  {editableRoles.map((r) => (
                    <TableCell key={r.value} className="text-center">
                      <Checkbox
                        checked={draft[cap.value]?.has(r.value) ?? false}
                        onCheckedChange={() => toggle(cap.value, r.value)}
                        aria-label={`${r.label} can ${cap.label}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button size="sm" className="mt-3" onClick={save} disabled={saving}>
          Save permissions
        </Button>
      </CardContent>
    </Card>
  )
}

function PeopleRoles({ roles }: { roles: Role[] }) {
  const { usersData } = useUserData(prepend_path, undefined, true)
  const [busy, setBusy] = useState<string | null>(null)

  const changeRole = async (id: string, role: string) => {
    setBusy(id)
    try {
      const res = await fetch(`${prepend_path}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "update", id, role }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      toast.success("Role updated")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the role")
    } finally {
      setBusy(null)
    }
  }

  if (!usersData) return <Skeleton className="h-48 w-full rounded-xl" />

  const users: any[] = Array.isArray(usersData) ? usersData : []

  return (
    <Card>
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>Assign a role to each person in the NEST.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-48">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: any) => (
              <TableRow key={user._id}>
                <TableCell>{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Select
                    defaultValue={user.role ?? undefined}
                    disabled={busy === user._id}
                    onValueChange={(role) => changeRole(user._id, role)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label || r.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function AdminSettingsPage() {
  const { isAdmin, isUserLoading } = useCurrentUser()
  const { data, mutate } = useSWR<{
    roles: Role[]
    permissions: Permission[]
    capabilities: Capability[]
  }>(isAdmin ? `${prepend_path}/api/config/roles` : null, fetcher)

  if (isUserLoading) {
    return <Skeleton className="m-6 h-96 w-full max-w-3xl rounded-xl" />
  }

  if (!isAdmin) {
    return <p className="p-6 text-sm text-muted-foreground">Only administrators can manage roles.</p>
  }

  return (
    <section className="w-full py-8 md:py-12">
      <div className="container grid max-w-4xl gap-6 px-4 md:px-6">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Administration</h1>
          <p className="text-muted-foreground">Roles, permissions and who holds them.</p>
        </div>

        {!data ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <>
            <RolesEditor roles={data.roles} onSaved={() => mutate()} />
            <PermissionsMatrix
              roles={data.roles}
              permissions={data.permissions}
              capabilities={data.capabilities}
              onSaved={() => mutate()}
            />
            <PeopleRoles roles={data.roles} />
          </>
        )}
      </div>
    </section>
  )
}
