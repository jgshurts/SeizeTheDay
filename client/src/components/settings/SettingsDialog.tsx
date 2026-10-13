import { useState } from "react";
import { Modal } from "../Modal";
import { StatusesTab } from "./StatusesTab";
import { PriorityGroupsTab } from "./PriorityGroupsTab";
import { UsersTab } from "./UsersTab";
import { ProjectsTab } from "./ProjectsTab";
import { ThemeTab } from "./ThemeTab";
import { useAuth } from "../../context/AuthContext";

type Tab = "projects" | "statuses" | "priorityGroups" | "users" | "theme";

// Statuses, Priority Groups and Users are one shared set for everyone, so
// only admins see (and can change) them; the server enforces the same.
const TABS: { id: Tab; label: string; adminOnly?: boolean }[] = [
  { id: "projects", label: "Projects" },
  { id: "statuses", label: "Statuses", adminOnly: true },
  { id: "priorityGroups", label: "Priority Groups", adminOnly: true },
  { id: "users", label: "Users", adminOnly: true },
  { id: "theme", label: "Theme" },
];

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("projects");
  const tabs = TABS.filter((t) => !t.adminOnly || user?.isAdmin);

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-indigo-600 text-indigo-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "projects" && <ProjectsTab />}
      {tab === "statuses" && <StatusesTab />}
      {tab === "priorityGroups" && <PriorityGroupsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "theme" && <ThemeTab />}
    </Modal>
  );
}
