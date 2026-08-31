// Default roles and the capability -> roles map. Both are editable at runtime
// (stored in usersdb.config, types "roles" and "permissions"); these are the
// fallback used until an admin changes them.
//
// `admin` is special: it always passes every capability check and cannot be
// removed, so an edit to the permission map can never lock everyone out.

export const DEFAULT_ROLES = [
  { value: "admin", label: "Administrator", description: "Full access, including users, databases and lab configuration" },
  { value: "researcher", label: "Researcher", description: "Creates and edits records, edits the lab configuration" },
  { value: "student", label: "Student", description: "Creates and edits records" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
];

// Every capability the app checks, with a human label for the admin panel.
// `admin` is implied on all of them and is never listed under `roles`.
export const CAPABILITIES = [
  { value: "users.manage", label: "Manage users (create, delete, edit, change their databases)" },
  { value: "databases.manage", label: "Add and configure databases" },
  { value: "config.edit", label: "Edit the lab configuration (sample types, trait types, units)" },
  { value: "config.seed", label: "Reset the lab configuration to defaults" },
  { value: "samples.delete", label: "Delete samples" },
  { value: "traits.delete", label: "Delete traits" },
  { value: "experiments.delete", label: "Delete experiments" },
];

// Defaults chosen to preserve today's behaviour: user/database management is
// admin-only (as now), while config editing and deletions — currently open to
// any signed-in user — are granted to the working roles.
export const DEFAULT_PERMISSIONS = [
  { value: "users.manage", roles: [] },
  { value: "databases.manage", roles: [] },
  { value: "config.edit", roles: ["researcher"] },
  { value: "config.seed", roles: [] },
  { value: "samples.delete", roles: ["researcher", "student"] },
  { value: "traits.delete", roles: ["researcher", "student"] },
  { value: "experiments.delete", roles: ["researcher", "student"] },
];
