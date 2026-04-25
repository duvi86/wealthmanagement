"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { FormDatepicker } from "@/components/ui/form-datepicker";
import { SurfaceCard } from "@/components/ui/surface-card";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { StatusPill } from "@/components/ui/status-pill";

type Project = {
  id: string;
  name: string;
  owner: string;
  status: string;
  priority: string;
  budget: string;
  startDate: string;
};

type FormData = {
  name: string;
  owner: string;
  status: string;
  priority: string;
  budget: string;
  startDate: string;
};

const INITIAL_PROJECTS: Project[] = [
  { id: "1", name: "TwinOps Platform",    owner: "Alex",  status: "active",  priority: "high",   budget: "$250K", startDate: "2026-01-05" },
  { id: "2", name: "Data Lake v2",        owner: "Blair", status: "active",  priority: "medium", budget: "$180K", startDate: "2026-02-01" },
  { id: "3", name: "Identity Mgmt",       owner: "Casey", status: "closed",  priority: "high",   budget: "$120K", startDate: "2025-11-01" },
  { id: "4", name: "API Gateway",         owner: "Alex",  status: "active",  priority: "high",   budget: "$200K", startDate: "2026-01-15" },
  { id: "5", name: "Analytics Dashboard", owner: "Blair", status: "active",  priority: "low",    budget: "$90K",  startDate: "2026-03-01" },
  { id: "6", name: "CI/CD Modernisation", owner: "Casey", status: "on hold", priority: "medium", budget: "$150K", startDate: "2025-09-01" },
];

const OWNER_OPTIONS = [
  { label: "Alex", value: "Alex" },
  { label: "Blair", value: "Blair" },
  { label: "Casey", value: "Casey" },
];

const EMPTY_FORM: FormData = {
  name: "",
  owner: "Alex",
  status: "active",
  priority: "medium",
  budget: "",
  startDate: "",
};

export default function TablesPage() {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("any");
  const [ownerFilter, setOwnerFilter] = useState("any");
  const [priorityFilter, setPriorityFilter] = useState("any");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Filter projects based on all active filters
  const filteredProjects = projects.filter((p) => {
    const statusMatch = statusFilter === "any" || p.status === statusFilter;
    const ownerMatch = ownerFilter === "any" || p.owner === ownerFilter;
    const priorityMatch = priorityFilter === "any" || p.priority === priorityFilter;
    return statusMatch && ownerMatch && priorityMatch;
  });

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRowClick = (project: Project) => {
    console.log("Row clicked:", project);
    setFormData(project);
    setIsEditMode(true);
    setEditingProjectId(project.id);
    setSaveMessage(null);
    console.log("Edit mode enabled for project:", project.id);
  };

  const handleSave = () => {
    // Validation - check that required fields are filled
    if (!formData.name.trim()) {
      setSaveMessage("⚠ Project name is required");
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }
    
    if (!formData.owner) {
      setSaveMessage("⚠ Owner is required");
      setTimeout(() => setSaveMessage(null), 5000);
      return;
    }

    if (isEditMode && editingProjectId) {
      // Update existing project
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProjectId
            ? {
                id: p.id,
                name: formData.name,
                owner: formData.owner,
                status: formData.status,
                priority: formData.priority,
                budget: formData.budget,
                startDate: formData.startDate,
              }
            : p
        )
      );
      setSaveMessage("✓ Project updated successfully!");
    } else {
      // Create new project
      const newProject: Project = {
        id: Math.random().toString(36).substring(7),
        name: formData.name,
        owner: formData.owner,
        status: formData.status,
        priority: formData.priority,
        budget: formData.budget,
        startDate: formData.startDate,
      };

      console.log("Adding project:", newProject);
      setProjects((prev) => {
        const updated = [newProject, ...prev];
        console.log("Updated projects list:", updated);
        return updated;
      });
      setSaveMessage("✓ Project added successfully!");
    }

    setTimeout(() => {
      setFormData(EMPTY_FORM);
      setIsEditMode(false);
      setEditingProjectId(null);
      setSaveMessage(null);
    }, 2000);
  };

  const handleCancel = () => {
    setFormData(EMPTY_FORM);
    setIsEditMode(false);
    setEditingProjectId(null);
    setSaveMessage(null);
  };

  const handleDelete = () => {
    if (editingProjectId) {
      setProjects((prev) => prev.filter((p) => p.id !== editingProjectId));
      setSaveMessage("✓ Project deleted successfully!");
      setTimeout(() => {
        setFormData(EMPTY_FORM);
        setIsEditMode(false);
        setEditingProjectId(null);
        setSaveMessage(null);
      }, 2000);
    }
  };

  const STATUS_TONE: Record<string, "success" | "warning" | "error" | "default"> = {
    "active": "success", "closed": "default", "on hold": "warning",
  };

  return (
    <PageFrame>
      <PageHeader title="Tables" description="Projects management — add, filter, and manage projects." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px", marginTop: "24px" }}>
        {/* LEFT COLUMN: FORM CARD */}
        <div>
          <SurfaceCard>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>
                {isEditMode ? "Edit Project" : "Add New Project"}
              </h3>
            </div>

              <div className="stack">
                {saveMessage && (
                  <div style={{
                    padding: "16px",
                    backgroundColor: saveMessage.includes("⚠") ? "#fff3cd" : "#c8e6c9",
                    borderLeft: `4px solid ${saveMessage.includes("⚠") ? "#ff6f00" : "#2e7d32"}`,
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: saveMessage.includes("⚠") ? "#bf360c" : "#1b5e20",
                    marginBottom: "16px",
                  }}>
                    {saveMessage}
                  </div>
                )}

              <FormInput
                id="project-name"
                label="Project Name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />

              <FormDropdown
                id="owner"
                label="Owner"
                options={OWNER_OPTIONS}
                value={formData.owner}
                onChange={(e) => handleFormChange("owner", e.target.value)}
              />

              <FormDropdown
                id="status"
                label="Status"
                options={[
                  { value: "active", label: "Active" },
                  { value: "closed", label: "Closed" },
                  { value: "on hold", label: "On Hold" },
                ]}
                value={formData.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
              />

              <FormDropdown
                id="priority"
                label="Priority"
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
                value={formData.priority}
                onChange={(e) => handleFormChange("priority", e.target.value)}
              />

              <FormInput
                id="budget"
                label="Budget"
                placeholder="e.g. $150K"
                value={formData.budget}
                onChange={(e) => handleFormChange("budget", e.target.value)}
              />

              <FormDatepicker
                id="start-date"
                label="Start Date"
                value={formData.startDate}
                onChange={(e) => handleFormChange("startDate", e.target.value)}
              />

                <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
                  <Button variant="primary" onClick={handleSave}>
                    {isEditMode ? "Update" : "Save"}
                  </Button>
                  <Button variant="secondary" onClick={handleCancel}>
                    {isEditMode ? "Close" : "Cancel"}
                  </Button>
                  {isEditMode && (
                    <Button variant="danger" onClick={handleDelete}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
          </SurfaceCard>
        </div>

        {/* RIGHT COLUMN: TABLE */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <SurfaceCard>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Filters</h3>
            </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", paddingTop: "8px" }}>
            <FormDropdown
              id="filter-status"
              label="Status"
              options={[
                { value: "any", label: "All" },
                { value: "active", label: "Active" },
                { value: "closed", label: "Closed" },
                { value: "on hold", label: "On Hold" },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />

            <FormDropdown
              id="filter-owner"
              label="Owner"
              options={[
                { value: "any", label: "Any" },
                { value: "Alex", label: "Alex" },
                { value: "Blair", label: "Blair" },
                { value: "Casey", label: "Casey" },
              ]}
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            />

            <FormDropdown
              id="filter-priority"
              label="Priority"
              options={[
                { value: "any", label: "All" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            />
          </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Projects</h3>
            </div>
          <DataTable<Project>
            columns={[
              { key: "name",     header: "Project",  sortable: true },
              { key: "owner",    header: "Owner",    sortable: true },
              { key: "status",   header: "Status",   sortable: true,
                render: (v) => <StatusPill tone={STATUS_TONE[String(v)] ?? "default"}>{String(v)}</StatusPill> },
              { key: "priority", header: "Priority", sortable: true },
              { key: "budget",   header: "Budget",   sortable: true },
            ]}
            data={filteredProjects}
            rowKey="id"
            onRowClick={(row) => handleRowClick(row as Project)}
          />
          </SurfaceCard>
        </div>
      </div>
    </PageFrame>
  );
}
