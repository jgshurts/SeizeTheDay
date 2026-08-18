import { useState } from "react";
import { Modal } from "../Modal";
import { StatusesTab } from "./StatusesTab";
import { PriorityGroupsTab } from "./PriorityGroupsTab";
import { UsersTab } from "./UsersTab";

type Tab = "statuses" | "priorityGroups" | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "statuses", label: "Statuses" },
  { id: "priorityGroups", label: "Priority Groups" },
  { id: "users", label: "Users" },
];

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("statuses");

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
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

      {tab === "statuses" && <StatusesTab />}
      {tab === "priorityGroups" && <PriorityGroupsTab />}
      {tab === "users" && <UsersTab />}
    </Modal>
  );
}
