"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormContainer } from "@/components/ui/form-container";
import { FormDatepicker } from "@/components/ui/form-datepicker";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";

const TEAM_MEMBERS = [
  { value: "alice", label: "Alice Chen" },
  { value: "bob",   label: "Bob Martin" },
  { value: "carol", label: "Carol Davis" },
  { value: "dave",  label: "Dave Smith" },
];

const PROGRAMS = [
  { value: "prog-a", label: "Programme Alpha" },
  { value: "prog-b", label: "Programme Beta" },
  { value: "prog-c", label: "Programme Gamma" },
];

const STATUS_OPTS = [
  { value: "on-track",  label: "On Track" },
  { value: "at-risk",   label: "At Risk" },
  { value: "off-track", label: "Off Track" },
  { value: "complete",  label: "Complete" },
];

function ProjectForm() {
  const [submitted, setSubmitted] = useState(false);
  return submitted ? (
    <div className="empty-state">
      <p className="empty-title">✓ Submitted</p>
      <p className="empty-description">Project form submitted successfully.</p>
      <Button variant="secondary" onClick={() => setSubmitted(false)} style={{ marginTop: "var(--spacing-8)" }}>
        Reset
      </Button>
    </div>
  ) : (
    <FormContainer
      title="New Project"
      description="Register a new delivery project in the portfolio."
      onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setSubmitted(false)}>Clear</Button>
          <Button type="submit" variant="primary">Create project</Button>
        </>
      }
    >
      <FormInput label="Project name" placeholder="e.g. TwinOps v2" required />
      <FormDropdown label="Programme" options={PROGRAMS} placeholder="Select programme…" required />
      <FormDropdown label="Owner"     options={TEAM_MEMBERS} placeholder="Select owner…" required />
      <FormDropdown label="Status"    options={STATUS_OPTS} defaultValue="on-track" />
      <FormDatepicker label="Start date" required />
      <FormDatepicker label="Target date" required />
      <FormInput label="Description" placeholder="Brief description…" />
    </FormContainer>
  );
}

function ProgramForm() {
  return (
    <FormContainer
      title="New Programme"
      description="Create a new strategic programme grouping multiple projects."
      footer={
        <>
          <Button type="button" variant="secondary">Clear</Button>
          <Button type="submit" variant="primary">Create programme</Button>
        </>
      }
    >
      <FormInput label="Programme name" placeholder="e.g. Digital Backbone" required />
      <FormDropdown label="Programme lead" options={TEAM_MEMBERS} placeholder="Select lead…" required />
      <FormDatepicker label="Start date" />
      <FormDatepicker label="End date" />
      <FormInput label="Strategic objective" placeholder="Link to OKR objective…" />
    </FormContainer>
  );
}

function TeamMemberForm() {
  return (
    <FormContainer
      title="Add Team Member"
      description="Register a new team member and assign their capacity."
      footer={
        <>
          <Button type="button" variant="secondary">Clear</Button>
          <Button type="submit" variant="primary">Add member</Button>
        </>
      }
    >
      <FormInput label="Full name" placeholder="First and last name" required />
      <FormInput label="Role"      placeholder="e.g. Product Manager" required />
      <FormInput label="Email"     type="email" placeholder="name@company.com" required />
      <FormDropdown label="Team"   options={PROGRAMS} placeholder="Select team…" />
      <FormInput label="Capacity (FTE)" type="number" placeholder="0.0 – 1.0" min="0" max="1" step="0.1" />
    </FormContainer>
  );
}

export default function FormsPage() {
  return (
    <PageFrame>
      <PageHeader title="Forms" description="Form pattern library — all input variants and form layouts." />

      <Tabs
        items={[
          { key: "project",    label: "Project",      content: <SurfaceCard><ProjectForm /></SurfaceCard> },
          { key: "programme",  label: "Programme",    content: <SurfaceCard><ProgramForm /></SurfaceCard> },
          { key: "team",       label: "Team Member",  content: <SurfaceCard><TeamMemberForm /></SurfaceCard> },
        ]}
      />
    </PageFrame>
  );
}
