"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormContainer } from "@/components/ui/form-container";
import { FormDatepicker } from "@/components/ui/form-datepicker";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { Modal } from "@/components/ui/modal";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { TemporalFilter } from "@/components/ui/temporal-filter";
import { Badge } from "@/components/ui/badge";
import { SurfaceCard } from "@/components/ui/surface-card";
import { formatMoney, type NetWorthSnapshot } from "@/lib/wealth-mock-data";
import {
  useWealthAccounts,
  useWealthSnapshots,
  useCreateWealthSnapshot,
  useDeleteWealthSnapshot,
  type WealthAccount,
} from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/loading";

function shiftDateByYears(value: string, years: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year - years}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function byPeriod(
  period: string,
  data: NetWorthSnapshot[],
  customStart: string,
  customEnd: string,
): NetWorthSnapshot[] {
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
  const latestDate = sorted[0]?.date;

  if (!latestDate) {
    return sorted;
  }

  if (period === "ytd") {
    const startOfYear = `${latestDate.slice(0, 4)}-01-01`;
    return sorted.filter((item) => item.date >= startOfYear && item.date <= latestDate);
  }

  if (period === "1y") {
    const startDate = shiftDateByYears(latestDate, 1);
    return sorted.filter((item) => item.date >= startDate && item.date <= latestDate);
  }

  if (period === "5y") {
    const startDate = shiftDateByYears(latestDate, 5);
    return sorted.filter((item) => item.date >= startDate && item.date <= latestDate);
  }

  if (period === "custom") {
    return sorted.filter((item) => {
      if (customStart && item.date < customStart) return false;
      if (customEnd && item.date > customEnd) return false;
      return true;
    });
  }

  return sorted;
}

function toUtcDayStamp(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, (month ?? 1) - 1, day ?? 1);
}

function findLatestAvailableDateOnOrBefore(targetDate: string, availableDates: string[]): string | null {
  if (!targetDate || availableDates.length === 0) {
    return null;
  }

  const eligibleDates = availableDates.filter((candidate) => toUtcDayStamp(candidate) <= toUtcDayStamp(targetDate));
  return eligibleDates.length > 0 ? eligibleDates[0] : null;
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Zm-1 11a2 2 0 0 1-2-2V8h16v10a2 2 0 0 1-2 2H6Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function WealthSnapshotsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: rawAccounts = [] } = useWealthAccounts();
  const { data: rawSnapshots = [], isLoading, isError } = useWealthSnapshots();
  const accounts = rawAccounts as WealthAccount[];
  const snapshots = rawSnapshots as NetWorthSnapshot[];
  const createSnapshotMutation = useCreateWealthSnapshot();
  const deleteSnapshotMutation = useDeleteWealthSnapshot();
  const [period, setPeriod] = useState("1y");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [openCompare, setOpenCompare] = useState(false);
  const [createDate, setCreateDate] = useState(today);
  const [createNote, setCreateNote] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  const visible = useMemo(
    () => byPeriod(period, snapshots, customStartDate, customEndDate),
    [customEndDate, customStartDate, period, snapshots],
  );
  const availableAccountDates = useMemo(
    () => Array.from(new Set(accounts.map((account) => account.updatedAt))).sort((a, b) => b.localeCompare(a)),
    [accounts],
  );
  const latestAccountDate = availableAccountDates[0] ?? today;
  const effectiveAccountDate = useMemo(
    () => findLatestAvailableDateOnOrBefore(createDate, availableAccountDates),
    [availableAccountDates, createDate],
  );
  const createDateError = !createDate
    ? "Snapshot date is required."
    : createDate > today
      ? "Snapshot date cannot be in the future."
      : !availableAccountDates.length
        ? "No account values are available yet."
        : !effectiveAccountDate
          ? "No account values exist on or before the selected date."
        : undefined;

  const compareLeft = snapshots.find((item) => item.id === leftId);
  const compareRight = snapshots.find((item) => item.id === rightId);
  const compareDelta = (compareLeft?.netWorthEur ?? 0) - (compareRight?.netWorthEur ?? 0);

  function createSnapshot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (createDateError) {
      return;
    }

    createSnapshotMutation.mutate({
      date: createDate,
      note: createNote || "Manual snapshot entry",
    });
    setOpenCreate(false);
    setCreateNote("");
  }

  function openCreateModal() {
    setCreateDate(latestAccountDate);
    setCreateNote("");
    setOpenCreate(true);
  }

  function handleDeleteSnapshot(snapshotId: string) {
    if (expandedId === snapshotId) {
      setExpandedId(null);
    }
    deleteSnapshotMutation.mutate(snapshotId);
  }

  return (
    <PageFrame>
      <PageHeader
        title="Snapshots"
      />

      {isLoading ? (
        <SurfaceCard><Skeleton lines={6} /></SurfaceCard>
      ) : isError ? (
        <SurfaceCard>
          <p style={{ color: "var(--color-status-error)" }}>Failed to load snapshots. Check that the backend is running.</p>
        </SurfaceCard>
      ) : (<>
      <SurfaceCard>
        <div className="wealth-meta-row">
          <TemporalFilter
            defaultPeriod="ytd"
            onPeriodChange={setPeriod}
            onRangeChange={(start, end) => {
              setCustomStartDate(start);
              setCustomEndDate(end);
            }}
            periods={[
              { value: "ytd", label: "YTD" },
              { value: "1y", label: "1 Year" },
              { value: "5y", label: "5 Years" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <div className="wealth-actions-row">
            <Button variant="secondary" onClick={() => setOpenCompare(true)}>
              Compare
            </Button>
            <Button onClick={openCreateModal}>Create</Button>
          </div>
        </div>
      </SurfaceCard>

      {visible.length === 0 ? (
        <EmptyState title="No snapshots found" description="Create your first snapshot to start trend tracking." />
      ) : (
        <div className="wealth-snapshot-grid">
          {visible.map((item, index) => {
            const prev = visible[index + 1];
            const delta = item.netWorthEur - (prev?.netWorthEur ?? item.netWorthEur);
            const expanded = expandedId === item.id;
            return (
              <SurfaceCard key={item.id} className="wealth-snapshot-card">
                <div className="wealth-snapshot-header">
                  <div className="wealth-snapshot-heading">
                    <p className="wealth-muted">Snapshot</p>
                    <h3 style={{ margin: 0 }}>{item.date}</h3>
                  </div>
                  <div className="wealth-actions-row wealth-snapshot-actions">
                    <Badge tone={delta >= 0 ? "success" : "error"}>
                      {delta >= 0 ? "+" : ""}
                      {formatMoney(delta)}
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => setExpandedId(expanded ? null : item.id)}>
                      {expanded ? "Hide" : "Details"}
                    </Button>
                    <Button
                      variant="icon"
                      className="wealth-danger-icon-button wealth-compact-icon-button"
                      aria-label={`Delete snapshot ${item.date}`}
                      title="Delete snapshot"
                      disabled={deleteSnapshotMutation.isPending}
                      onClick={() => handleDeleteSnapshot(item.id)}
                    >
                      <DeleteIcon />
                    </Button>
                  </div>
                </div>

                <p className="wealth-snapshot-value">{formatMoney(item.netWorthEur)}</p>

                {expanded ? (
                  <div className="wealth-snapshot-detail-grid">
                    <div className="wealth-snapshot-detail-item">
                      <p className="wealth-muted">Assets</p>
                      <p className="wealth-snapshot-detail-value">{formatMoney(item.assetsEur)}</p>
                    </div>
                    <div className="wealth-snapshot-detail-item">
                      <p className="wealth-muted">Liabilities</p>
                      <p className="wealth-snapshot-detail-value">{formatMoney(item.liabilitiesEur)}</p>
                    </div>
                    <div className="wealth-snapshot-note">
                      <p className="wealth-muted">Notes</p>
                      <p style={{ margin: "6px 0 0" }}>{item.note}</p>
                    </div>
                  </div>
                ) : null}
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="Create Snapshot">
        <FormContainer
          onSubmit={createSnapshot}
          footer={
            <div className="wealth-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Snapshot</Button>
            </div>
          }
        >
          <FormDatepicker
            label="Snapshot date"
            required
            max={today}
            value={createDate}
            error={createDateError}
            helpText={availableAccountDates.length
              ? effectiveAccountDate && effectiveAccountDate !== createDate
                ? `Snapshot will keep the selected date ${createDate} and use the latest account values available on or before ${effectiveAccountDate}.`
                : `Snapshot values are tied to the selected snapshot date.`
              : "No account values are available yet."}
            onChange={(e) => setCreateDate(e.target.value)}
          />
          <FormInput label="Notes" value={createNote} onChange={(e) => setCreateNote(e.target.value)} placeholder="Optional comment" />
        </FormContainer>
      </Modal>

      <Modal open={openCompare} onClose={() => setOpenCompare(false)} title="Compare Snapshots">
        <div className="stack">
          <div className="wealth-filter-grid">
            <FormDropdown
              label="Snapshot A"
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              options={snapshots.map((item) => ({ value: item.id, label: `${item.date} - ${formatMoney(item.netWorthEur)}` }))}
            />
            <FormDropdown
              label="Snapshot B"
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              options={snapshots.map((item) => ({ value: item.id, label: `${item.date} - ${formatMoney(item.netWorthEur)}` }))}
            />
          </div>
          <SurfaceCard>
            <p className="wealth-muted">Net worth delta (A - B)</p>
            <h2 style={{ margin: "6px 0 0" }}>
              {compareDelta >= 0 ? "+" : ""}
              {formatMoney(compareDelta)}
            </h2>
          </SurfaceCard>
          <div className="wealth-detail-grid">
            <SurfaceCard>
              <p className="wealth-muted">Snapshot A</p>
              <p style={{ marginBottom: 0 }}>{compareLeft?.date}</p>
              <h3 style={{ marginTop: 6 }}>{formatMoney(compareLeft?.netWorthEur ?? 0)}</h3>
            </SurfaceCard>
            <SurfaceCard>
              <p className="wealth-muted">Snapshot B</p>
              <p style={{ marginBottom: 0 }}>{compareRight?.date}</p>
              <h3 style={{ marginTop: 6 }}>{formatMoney(compareRight?.netWorthEur ?? 0)}</h3>
            </SurfaceCard>
          </div>
        </div>
      </Modal>
      </>)}
    </PageFrame>
  );
}
