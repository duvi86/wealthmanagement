"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormContainer } from "@/components/ui/form-container";
import { FormDatepicker } from "@/components/ui/form-datepicker";
import { FormDropdown } from "@/components/ui/form-dropdown";
import { FormInput } from "@/components/ui/form-input";
import { KpiCard } from "@/components/ui/kpi-card";
import { LineChart } from "@/components/ui/line-chart";
import { Modal } from "@/components/ui/modal";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";
import {
  accountHistoryById,
  type Account,
  type AllocationBucket,
  type AccountType,
  type MortgageDetails,
  type MortgageType,
  computeTotals,
  formatMoney,
  toEur,
} from "@/lib/wealth-mock-data";
import {
  useWealthAccounts,
  useWealthPersonProfiles,
  useCreateWealthPersonProfile,
  useUpdateWealthPersonProfile,
  useDeleteWealthPersonProfile,
  useCreateWealthAccount,
  useUpdateWealthAccount,
  useDeleteWealthAccount,
  useDeleteAllWealthAccounts,
  useImportWealthAccountsCsv,
  type WealthAccount,
  type WealthAccountImportSummary,
  type WealthPersonProfile,
} from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/loading";

const WEALTH_IMPORT_STATIC_COLUMNS = [
  "owner_name",
  "co_owner_name",
  "account_name",
  "institution",
  "account_type",
  "currency",
  "expected_return_pct",
  "allocation_bucket",
  "mortgage_principal",
  "mortgage_annual_rate_pct",
  "mortgage_term_months",
  "mortgage_start_date",
  "mortgage_type",
] as const;

const WEALTH_IMPORT_TEMPLATE = [
  [
    ...WEALTH_IMPORT_STATIC_COLUMNS,
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
  ].join(","),
  [
    "Matthieu Duvinage",
    "",
    "Broker Portfolio",
    "Interactive Brokers",
    "Investment",
    "USD",
    "7.0",
    "Stocks",
    "", "", "", "", "",
    "102000",
    "104500",
    "107300",
  ].join(","),
  [
    "Sylvie Duvinage",
    "",
    "Main Checking",
    "BNP Paribas",
    "Cash",
    "EUR",
    "1.0",
    "Cash",
    "", "", "", "", "",
    "14200",
    "13890",
    "14610",
  ].join(","),
  [
    "Matthieu Duvinage",
    "Sylvie Duvinage",
    "Home Loan",
    "BNP Paribas",
    "Loan",
    "EUR",
    "0",
    "",
    "315000", "1.5", "300", "2016-01", "Fixed",
    "", "", "",
  ].join(","),
].join("\n");

function toCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Compute the remaining mortgage balance (positive) at `atDate` (YYYY-MM-DD).
 * Uses the same formula as the backend: B = P * [(1+r)^N - (1+r)^n] / [(1+r)^N - 1]
 */
function computeAmortizedBalance(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  startDate: string,   // YYYY-MM
  atDate: string,      // YYYY-MM-DD
): number {
  const r = annualRatePct / 100 / 12;
  const N = termMonths;
  const [sy, sm] = startDate.split("-").map(Number);
  const [ay, am] = atDate.substring(0, 7).split("-").map(Number);
  const n = (ay - sy) * 12 + (am - sm);
  if (n <= 0) return principal;
  if (n >= N) return 0;
  if (r === 0) return principal * (1 - n / N);
  const powN = Math.pow(1 + r, N);
  const powN2 = Math.pow(1 + r, n);
  return principal * (powN - powN2) / (powN - 1);
}

function buildAccountsRegistryCsv(accounts: Account[]): string {
  if (accounts.length === 0) {
    return WEALTH_IMPORT_TEMPLATE;
  }

  const groupedRows = new Map<
    string,
    {
      ownerName: string;
      coOwnerName: string;
      accountName: string;
      institution: string;
      accountType: string;
      currency: string;
      expectedReturnPct: number;
      allocationBucket: string;
      isMortgageLoan: boolean;
      mortgage: WealthAccount["mortgage"] | MortgageDetails | null;
      balancesByDate: Map<string, string>;
    }
  >();

  const dateColumns = Array.from(
    new Set(accounts.map((account) => account.updatedAt).filter((date): date is string => Boolean(date))),
  ).sort();

  accounts.forEach((account) => {
    const allocationBucket = account.allocationBucket ?? "";
    const rowKey = [
      account.ownerName,
      account.accountName,
      account.institution,
      account.type,
      account.currency,
      String(account.expectedReturnPct),
      allocationBucket,
    ].join("\u0001");

    if (!groupedRows.has(rowKey)) {
      groupedRows.set(rowKey, {
        ownerName: account.ownerName,
        coOwnerName: (account as Partial<WealthAccount>).coOwnerName ?? "",
        accountName: account.accountName,
        institution: account.institution,
        accountType: account.type,
        currency: account.currency,
        expectedReturnPct: account.expectedReturnPct,
        allocationBucket,
        isMortgageLoan: account.type === "Loan" && Boolean(account.mortgage),
        mortgage: account.mortgage ?? null,
        balancesByDate: new Map<string, string>(),
      });
    }

    const grp = groupedRows.get(rowKey)!;
    // If a later row in the same group carries the mortgage record, capture it
    if (account.mortgage && !grp.mortgage) {
      grp.mortgage = account.mortgage;
      grp.isMortgageLoan = true;
    }
    grp.balancesByDate.set(account.updatedAt, String(account.nativeBalance));
  });

  const rows = [
    [...WEALTH_IMPORT_STATIC_COLUMNS, ...dateColumns],
    ...Array.from(groupedRows.values()).map((row) => {
      const staticCells = [
        row.ownerName,
        row.coOwnerName,
        row.accountName,
        row.institution,
        row.accountType,
        row.currency,
        row.expectedReturnPct,
        row.allocationBucket,
        row.isMortgageLoan && row.mortgage ? row.mortgage.principal : "",
        row.isMortgageLoan && row.mortgage ? row.mortgage.annualRatePct : "",
        row.isMortgageLoan && row.mortgage ? row.mortgage.termMonths : "",
        row.isMortgageLoan && row.mortgage ? row.mortgage.startDate : "",
        row.isMortgageLoan && row.mortgage ? row.mortgage.mortgageType : "",
      ];
      const dateCells = row.isMortgageLoan && row.mortgage
        ? dateColumns.map((dateColumn) => {
            const remaining = computeAmortizedBalance(
              row.mortgage!.principal,
              row.mortgage!.annualRatePct,
              row.mortgage!.termMonths,
              row.mortgage!.startDate,
              dateColumn,
            );
            return String(-Math.round(remaining * 100) / 100);
          })
        : dateColumns.map((dateColumn) => row.balancesByDate.get(dateColumn) ?? "");
      return [...staticCells, ...dateCells];
    }),
  ];

  return rows.map((row) => row.map((cell) => toCsvCell(cell)).join(",")).join("\n");
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M4 20h4l10-10-4-4L4 16v4Zm3.2-1.5H5.5v-1.7l8.1-8.1 1.7 1.7-8.1 8.1ZM19 9l-4-4 1.3-1.3a1.5 1.5 0 0 1 2.1 0l1.9 1.9a1.5 1.5 0 0 1 0 2.1L19 9Z"
        fill="currentColor"
      />
    </svg>
  );
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

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M4 5h16a1 1 0 0 1 1 1v8h-2V7H5v7H3V6a1 1 0 0 1 1-1Zm8 3 4 4h-3v5h-2v-5H8l4-4Zm-6 9h12v2H6v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="wealth-action-icon">
      <path
        d="M12 3v9.2l2.8-2.8 1.4 1.4-5.2 5.2-5.2-5.2 1.4-1.4 2.8 2.8V3h2ZM5 19h14v2H5v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

type OwnerOption = {
  id: string;
  name: string;
};

type SupportedCurrency = "EUR" | "USD" | "CHF";

type MortgageFormState = {
  hasMortgage: boolean;
  principal: string;
  annualRatePct: string;
  termMonths: string;
  startDate: string;
  mortgageType: MortgageType;
};

type AmortizationRow = {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

type PortfolioLineState = {
  id: string;
  label: string;
  allocationBucket: AllocationBucket;
  currency: SupportedCurrency;
  nativeAmount: string;
  fxToEur: string;
  expectedReturnPct: string;
};

type AccountFormState = {
  ownerId: string;
  ownershipSplit: Record<string, number>;
  accountName: string;
  institution: string;
  type: AccountType;
  currency: SupportedCurrency;
  nativeBalance: string;
  fxToEur: string;
  expectedReturnPct: string;
  portfolioLines: PortfolioLineState[];
  mortgage: MortgageFormState;
  updatedAt: string;
};

type AccountUpdateState = {
  nativeBalance: string;
  updatedAt: string;
};

async function fetchFxToEur(currency: SupportedCurrency): Promise<number> {
  if (currency === "EUR") return 1;
  let response: Response;
  try {
    // Frankfurter migrated to api.frankfurter.dev/v1; use canonical endpoint first.
    response = await fetch(`https://api.frankfurter.dev/v1/latest?from=${currency}&to=EUR`);
  } catch {
    // Fallback keeps compatibility if .dev is temporarily blocked and .app still works in some networks.
    response = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=EUR`);
  }
  if (!response.ok) {
    throw new Error(`Unable to retrieve FX rate for ${currency} (HTTP ${response.status}).`);
  }
  const payload = (await response.json()) as { rates?: { EUR?: number } };
  const rate = Number(payload?.rates?.EUR);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid FX rate returned for ${currency}.`);
  }
  return rate;
}

function buildDefaultOwnershipSplit(ownerId: string, ownerOptions: OwnerOption[]) {
  if (ownerOptions.length === 0) {
    return {} as Record<string, number>;
  }
  return Object.fromEntries(
    ownerOptions.map((person) => [person.id, person.id === ownerId ? 100 : 0]),
  ) as Record<string, number>;
}

function buildOwnershipSplitForAccount(account: Account | undefined, ownerId: string | undefined, ownerOptions: OwnerOption[]) {
  if (ownerOptions.length === 0) {
    return {} as Record<string, number>;
  }

  if (account?.ownershipSplit?.length) {
    return Object.fromEntries(
      ownerOptions.map((person) => [person.id, account.ownershipSplit?.find((entry) => entry.ownerId === person.id)?.sharePct ?? 0]),
    ) as Record<string, number>;
  }

  const defaultOwnerId = ownerId ?? account?.ownerId ?? ownerOptions[0]?.id;
  return buildDefaultOwnershipSplit(defaultOwnerId ?? "", ownerOptions);
}

const TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "Cash", label: "Cash" },
  { value: "Savings", label: "Savings" },
  { value: "Investment", label: "Investment" },
  { value: "Private Equity", label: "Private Equity" },
  { value: "Property", label: "Property" },
  { value: "Loan", label: "Loan" },
  { value: "Cryptocurrency", label: "Cryptocurrency" },
];

const CURRENCY_OPTIONS: Array<{ value: "EUR" | "USD" | "CHF"; label: string }> = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "CHF", label: "CHF" },
];

const PORTFOLIO_BUCKET_OPTIONS: Array<{ value: AllocationBucket; label: string }> = [
  { value: "Stocks", label: "Stocks" },
  { value: "Bonds", label: "Bonds" },
  { value: "REIT", label: "REIT" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Commodities", label: "Commodities" },
  { value: "Crypto", label: "Crypto" },
  { value: "Private Equity", label: "Private Equity" },
  { value: "Cash", label: "Cash" },
  { value: "Savings", label: "Savings" },
];

function makeEmptyPortfolioLine(index = 0): PortfolioLineState {
  return {
    id: `portfolio-line-${Date.now()}-${index}`,
    label: "",
    allocationBucket: "Stocks",
    currency: "EUR",
    nativeAmount: "0",
    fxToEur: "1",
    expectedReturnPct: "6",
  };
}

function buildPortfolioLinesForAccount(account?: Account): PortfolioLineState[] {
  if (account?.portfolioLines?.length) {
    return account.portfolioLines.map((line) => ({
      id: line.id,
      label: line.label,
      allocationBucket: line.allocationBucket,
      currency: line.currency,
      nativeAmount: String(line.nativeAmount),
      fxToEur: String(line.fxToEur),
      expectedReturnPct: String(line.expectedReturnPct ?? account.expectedReturnPct ?? 0),
    }));
  }

  if (account?.type === "Investment") {
    return [
      {
        id: `portfolio-line-${account.id}`,
        label: account.accountName,
        allocationBucket: account.allocationBucket ?? "Stocks",
        currency: account.currency,
        nativeAmount: String(account.nativeBalance),
        fxToEur: String(account.fxToEur),
        expectedReturnPct: String(account.expectedReturnPct ?? 0),
      },
    ];
  }

  return [];
}

function buildMortgageFormState(account?: Pick<Account, "type" | "nativeBalance" | "mortgage"> | null): MortgageFormState {
  if (account?.mortgage) {
    const m = account.mortgage;
    return {
      hasMortgage: true,
      principal: String(m.principal),
      annualRatePct: String(m.annualRatePct),
      termMonths: String(m.termMonths),
      startDate: m.startDate,
      mortgageType: m.mortgageType,
    };
  }
  return {
    hasMortgage: account?.type === "Loan",
    principal: account?.type === "Loan" ? String(Math.abs(account.nativeBalance ?? 0)) : "200000",
    annualRatePct: "2.5",
    termMonths: "240",
    startDate: "2024-01",
    mortgageType: "Fixed",
  };
}

function computeAmortization(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  startDate: string,
): AmortizationRow[] {
  if (principal <= 0 || annualRatePct <= 0 || termMonths <= 0) return [];
  const r = annualRatePct / 100 / 12;
  const n = termMonths;
  const pmt = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const parts = startDate.split("-");
  const startYear = Number(parts[0] ?? 2024);
  const startMonthIdx = Number(parts[1] ?? 1) - 1;
  let balance = principal;
  const rows: AmortizationRow[] = [];
  for (let i = 0; i < n && balance > 0.005; i++) {
    const interest = balance * r;
    const principalPart = Math.min(pmt - interest, balance);
    balance = Math.max(0, balance - principalPart);
    const mi = (startMonthIdx + i) % 12;
    const y = startYear + Math.floor((startMonthIdx + i) / 12);
    rows.push({
      month: i + 1,
      date: `${y}-${String(mi + 1).padStart(2, "0")}`,
      payment: pmt,
      principal: principalPart,
      interest,
      balance,
    });
  }
  return rows;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getAmortizedBalanceForMonth(rows: AmortizationRow[], monthKey: string, principal: number) {
  if (!rows.length) return principal;

  const exactMatch = rows.find((row) => row.date === monthKey);
  if (exactMatch) return exactMatch.balance;

  const latestPastRow = [...rows]
    .filter((row) => row.date <= monthKey)
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);

  if (latestPastRow) return latestPastRow.balance;
  if (monthKey < rows[0].date) return principal;
  return 0;
}

function getLoanAccountBalanceForMonth(account: Account, monthKey: string) {
  if (account.type !== "Loan" || !account.mortgage) return account.nativeBalance;

  const rows = computeAmortization(
    account.mortgage.principal,
    account.mortgage.annualRatePct,
    account.mortgage.termMonths,
    account.mortgage.startDate,
  );
  const computedBalance = getAmortizedBalanceForMonth(rows, monthKey, account.mortgage.principal);
  return -Number(computedBalance.toFixed(2));
}

function getAccountSeriesKey(account: Account) {
  return [account.ownerId, account.accountName.trim().toLowerCase()].join("|");
}

function toBadgeTone(type: AccountType): "default" | "info" | "success" | "warning" | "error" {
  if (type === "Loan") return "error";
  if (type === "Property") return "info";
  if (type === "Investment" || type === "Private Equity" || type === "Cryptocurrency") return "warning";
  if (type === "Savings") return "success";
  return "default";
}

function makeInitialForm(account: Account | undefined, ownerOptions: OwnerOption[]): AccountFormState {
  const hasMultipleOwners = (account?.ownershipSplit?.filter((entry) => entry.sharePct > 0).length ?? 0) > 1;
  const ownerId = hasMultipleOwners ? "__multiple__" : (account?.ownerId ?? ownerOptions[0]?.id ?? "");
  return {
    ownerId,
    ownershipSplit: buildOwnershipSplitForAccount(account, ownerId, ownerOptions),
    accountName: account?.accountName ?? "",
    institution: account?.institution ?? "",
    type: account?.type ?? "Cash",
    currency: account?.currency ?? "EUR",
    nativeBalance: account ? String(account.nativeBalance) : "0",
    fxToEur: account ? String(account.fxToEur) : "1",
    expectedReturnPct: account ? String(account.expectedReturnPct) : "6",
    portfolioLines: buildPortfolioLinesForAccount(account),
    mortgage: buildMortgageFormState(account),
    updatedAt: account?.updatedAt ?? "2026-04-10",
  };
}

export default function WealthAccountsPage() {
  const { data: rawPersonProfiles = [] } = useWealthPersonProfiles();
  const createPersonProfile = useCreateWealthPersonProfile();
  const updatePersonProfile = useUpdateWealthPersonProfile();
  const deletePersonProfile = useDeleteWealthPersonProfile();

  const personProfiles = (rawPersonProfiles as WealthPersonProfile[]).filter((profile) => profile.isActive !== false);
  const ownerOptions = useMemo<OwnerOption[]>(
    () => personProfiles.map((profile) => ({ id: profile.id, name: profile.name })),
    [personProfiles],
  );

  const { data: rawAccounts = [], isLoading, isError } = useWealthAccounts();
  const sourceAccounts = rawAccounts as Account[];
  const currentMonthKey = useMemo(() => formatMonthKey(new Date()), []);
  const accounts = useMemo(
    () =>
      sourceAccounts.map((account) => ({
        ...account,
        nativeBalance: getLoanAccountBalanceForMonth(account, currentMonthKey),
      })),
    [currentMonthKey, sourceAccounts],
  );
  const createAccount = useCreateWealthAccount();
  const updateAccount = useUpdateWealthAccount();
  const deleteAccount = useDeleteWealthAccount();
  const deleteAllAccounts = useDeleteAllWealthAccounts();
  const importAccountsCsv = useImportWealthAccountsCsv();
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEraseAllOpen, setIsEraseAllOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<WealthAccountImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [fxSyncStatus, setFxSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [fxSyncDate, setFxSyncDate] = useState<string | null>(null);
  const [fxSyncError, setFxSyncError] = useState<string | null>(null);
  const [latestFxByCurrency, setLatestFxByCurrency] = useState<Record<SupportedCurrency, number>>({
    EUR: 1,
    USD: 1,
    CHF: 1,
  });
  const hasAutoFxSyncedRef = useRef(false);
  const [formState, setFormState] = useState<AccountFormState>(makeInitialForm(undefined, ownerOptions));

  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personFormState, setPersonFormState] = useState({
    name: "",
    email: "",
    birthDate: "",
    expectedLifetime: "",
    isActive: true,
  });
  const [personFormError, setPersonFormError] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<AccountUpdateState>({
    nativeBalance: "0",
    updatedAt: "2026-04-10",
  });

  useEffect(() => {
    if (!ownerOptions.length) return;
    setFormState((prev) => {
      if (prev.ownerId) return prev;
      const defaultOwnerId = ownerOptions[0].id;
      return {
        ...prev,
        ownerId: defaultOwnerId,
        ownershipSplit: buildDefaultOwnershipSplit(defaultOwnerId, ownerOptions),
      };
    });
  }, [ownerOptions]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const updatingAccount = useMemo(
    () => accounts.find((account) => account.id === updatingAccountId) ?? null,
    [accounts, updatingAccountId],
  );

  const matchingAccounts = useMemo(
    () =>
      accounts.filter((account) => {
        if (ownerFilter !== "all" && account.ownerId !== ownerFilter) return false;
        if (typeFilter !== "all" && account.type !== typeFilter) return false;
        if (currencyFilter !== "all" && account.currency !== currencyFilter) return false;
        return true;
      }),
    [accounts, ownerFilter, typeFilter, currencyFilter],
  );

  const latestAvailableDate = useMemo(
    () => matchingAccounts.reduce<string | null>((latest, account) => (!latest || account.updatedAt > latest ? account.updatedAt : latest), null),
    [matchingAccounts],
  );

  const currentAccounts = useMemo(
    () => matchingAccounts.filter((account) => account.updatedAt === latestAvailableDate),
    [matchingAccounts, latestAvailableDate],
  );

  const olderAccounts = useMemo(
    () => matchingAccounts.filter((account) => account.updatedAt !== latestAvailableDate),
    [matchingAccounts, latestAvailableDate],
  );

  const totals = computeTotals(currentAccounts);

  const accountTableColumns = [
    {
      key: "ownerName",
      header: "Owner",
    },
    {
      key: "accountName",
      header: "Account",
    },
    {
      key: "institution",
      header: "Institution",
    },
    {
      key: "type",
      header: "Type",
      render: (value: unknown) => <Badge tone={toBadgeTone(String(value) as AccountType)}>{String(value)}</Badge>,
    },
    {
      key: "nativeBalance",
      header: "Balance",
      render: (_: unknown, row: Account) => (
        <div className="wealth-account-value">
          <strong>{formatMoney(toEur(row), "EUR")}</strong>
          <p className="wealth-muted">
            {row.portfolioLines?.length
              ? `${row.portfolioLines?.length} portfolio lines`
              : formatMoney(row.nativeBalance as number, row.currency as string)}
          </p>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
    },
    {
      key: "expectedReturnPct",
      header: "Expected Return",
      render: (value: unknown) => `${Number(value).toFixed(1)}%`,
    },
    {
      key: "id",
      header: "Actions",
      sortable: false,
      render: (_: unknown, row: Account) => {
        const account = row as Account;
        return (
          <div className="wealth-actions-row">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                openUpdateModal(account);
              }}
            >
              New Entry
            </Button>
            <Button
              variant="icon"
              className="wealth-compact-icon-button"
              aria-label={`Edit ${account.accountName}`}
              title="Edit current entry"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(account);
              }}
            >
              <EditIcon />
            </Button>
            <Button
              variant="icon"
              className="wealth-danger-icon-button wealth-compact-icon-button"
              aria-label={`Delete ${account.accountName}`}
              title="Delete current entry"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAccount(String(account.id));
              }}
            >
              <DeleteIcon />
            </Button>
          </div>
        );
      },
    },
  ];
  const portfolioTotalEur = useMemo(
    () => formState.portfolioLines.reduce((sum, line) => sum + Number(line.nativeAmount || 0) * Number(line.fxToEur || 0), 0),
    [formState.portfolioLines],
  );

  const investmentExpectedReturnPct = useMemo(() => {
    const weightedReturn = formState.portfolioLines.reduce(
      (sum, line) =>
        sum +
        Number(line.nativeAmount || 0) *
          Number(line.fxToEur || 0) *
          Number(line.expectedReturnPct || 0),
      0,
    );
    if (portfolioTotalEur <= 0) return 0;
    return Number((weightedReturn / portfolioTotalEur).toFixed(4));
  }, [formState.portfolioLines, portfolioTotalEur]);

  const amortizationSchedule = useMemo(() => {
    const { mortgage, type } = formState;
    if (type !== "Loan" && !(type === "Property" && mortgage.hasMortgage)) return [];
    return computeAmortization(
      Number(mortgage.principal || 0),
      Number(mortgage.annualRatePct || 0),
      Number(mortgage.termMonths || 0),
      mortgage.startDate,
    );
  }, [formState]);

  const mortgageSummary = useMemo(() => {
    if (!amortizationSchedule.length) return null;
    const monthlyPayment = amortizationSchedule[0]?.payment ?? 0;
    const totalPaid = monthlyPayment * amortizationSchedule.length;
    const totalInterest = totalPaid - Number(formState.mortgage.principal || 0);
    return { monthlyPayment, totalPaid, totalInterest };
  }, [amortizationSchedule, formState.mortgage.principal]);

  const computedLoanBalance = useMemo(() => {
    if (formState.type !== "Loan") return null;
    const principal = Number(formState.mortgage.principal || 0);
    return getAmortizedBalanceForMonth(amortizationSchedule, currentMonthKey, principal);
  }, [amortizationSchedule, currentMonthKey, formState.mortgage.principal, formState.type]);

  const updateAmortizationSchedule = useMemo(() => {
    if (!updatingAccount?.mortgage || updatingAccount.type !== "Loan") return [];
    return computeAmortization(
      updatingAccount.mortgage.principal,
      updatingAccount.mortgage.annualRatePct,
      updatingAccount.mortgage.termMonths,
      updatingAccount.mortgage.startDate,
    );
  }, [updatingAccount]);

  const computedUpdatedLoanBalance = useMemo(() => {
    if (!updatingAccount?.mortgage || updatingAccount.type !== "Loan") return null;
    const monthKey = updateState.updatedAt.slice(0, 7);
    return getAmortizedBalanceForMonth(updateAmortizationSchedule, monthKey, updatingAccount.mortgage.principal);
  }, [updateAmortizationSchedule, updateState.updatedAt, updatingAccount]);

  useEffect(() => {
    async function syncFxRatesForAllAccounts() {
      if (sourceAccounts.length === 0) return;
      if (hasAutoFxSyncedRef.current) return;
      hasAutoFxSyncedRef.current = true;

      try {
        setFxSyncStatus("syncing");
        setFxSyncError(null);

        const currencies = new Set<SupportedCurrency>(["EUR"]);
        const unsupportedCurrencies = new Set<string>();
        for (const account of sourceAccounts) {
          if (account.currency === "EUR" || account.currency === "USD" || account.currency === "CHF") {
            currencies.add(account.currency);
          } else {
            unsupportedCurrencies.add(account.currency);
          }
          for (const line of account.portfolioLines ?? []) {
            if (line.currency === "EUR" || line.currency === "USD" || line.currency === "CHF") {
              currencies.add(line.currency);
            } else {
              unsupportedCurrencies.add(line.currency);
            }
          }
        }

        const ratesByCurrency: Record<SupportedCurrency, number> = { EUR: 1, USD: 1, CHF: 1 };
        await Promise.all(
          Array.from(currencies).map(async (currency) => {
            ratesByCurrency[currency] = await fetchFxToEur(currency);
          }),
        );

        setLatestFxByCurrency(ratesByCurrency);

        const updates = sourceAccounts
          .map((account) => {
            const accountCurrency = account.currency as SupportedCurrency;
            const nextAccountFx = ratesByCurrency[accountCurrency] ?? account.fxToEur;
            const nextPortfolioLines = (account.portfolioLines ?? []).map((line) => ({
              ...line,
              fxToEur: ratesByCurrency[line.currency as SupportedCurrency] ?? line.fxToEur,
            }));

            const accountFxChanged = Math.abs(nextAccountFx - account.fxToEur) > 0.000001;
            const linesFxChanged = nextPortfolioLines.some((line, idx) =>
              Math.abs(line.fxToEur - (account.portfolioLines?.[idx]?.fxToEur ?? line.fxToEur)) > 0.000001,
            );

            if (!accountFxChanged && !linesFxChanged) return null;

            return {
              id: account.id,
              fxToEur: nextAccountFx,
              ...(nextPortfolioLines.length > 0 ? { portfolioLines: nextPortfolioLines } : {}),
            };
          })
          .filter((update): update is { id: string; fxToEur: number; portfolioLines?: Account["portfolioLines"] } => Boolean(update));

        if (updates.length > 0) {
          const updateResults = await Promise.allSettled(updates.map((update) => updateAccount.mutateAsync(update)));
          const failedUpdates = updateResults.filter((result) => result.status === "rejected");
          if (failedUpdates.length > 0) {
            const firstReason = failedUpdates[0].reason;
            const reasonText = firstReason instanceof Error ? firstReason.message : String(firstReason ?? "Unknown error");
            throw new Error(`FX refresh updated ${updates.length - failedUpdates.length}/${updates.length} accounts. ${reasonText}`);
          }
        }

        if (unsupportedCurrencies.size > 0) {
          setFxSyncError(`Skipped unsupported currencies: ${Array.from(unsupportedCurrencies).join(", ")}`);
        }

        setFxSyncStatus("success");
        setFxSyncDate(new Date().toISOString());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to synchronize FX rates.";
        setFxSyncStatus("error");
        setFxSyncError(message);
      }
    }

    void syncFxRatesForAllAccounts();
  }, [sourceAccounts, updateAccount]);

  const historyBySeriesKey = useMemo(() => {
    const grouped = new Map<string, Array<{ period: string; balanceEur: number }>>();

    for (const account of sourceAccounts) {
      const key = getAccountSeriesKey(account);
      const period = account.updatedAt;
      const monthKey = period.slice(0, 7);
      const accountForHistory =
        account.type === "Loan"
          ? { ...account, nativeBalance: getLoanAccountBalanceForMonth(account, monthKey) }
          : account;
      const points = grouped.get(key) ?? [];
      points.push({ period, balanceEur: toEur(accountForHistory) });
      grouped.set(key, points);
    }

    for (const [key, points] of grouped.entries()) {
      const dedupedByPeriod = new Map<string, { period: string; balanceEur: number }>();
      for (const point of points.sort((a, b) => a.period.localeCompare(b.period))) {
        dedupedByPeriod.set(point.period, point);
      }
      grouped.set(key, Array.from(dedupedByPeriod.values()).sort((a, b) => a.period.localeCompare(b.period)));
    }

    return grouped;
  }, [sourceAccounts]);

  const selectedAccountHistory = useMemo(() => {
    if (!selectedAccount) return [];
    const key = getAccountSeriesKey(selectedAccount);
    const linkedHistory = historyBySeriesKey.get(key) ?? [];
    const fallbackHistory = (accountHistoryById[selectedAccount.id] ?? []).map((point) => ({
      period: point.month,
      balanceEur: point.balanceEur,
    }));

    const merged = new Map<string, { period: string; balanceEur: number }>();
    for (const point of [...fallbackHistory, ...linkedHistory]) {
      merged.set(point.period, point);
    }

    return Array.from(merged.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [historyBySeriesKey, selectedAccount]);

  function setMortgage(partial: Partial<MortgageFormState>) {
    setFormState((prev) => ({ ...prev, mortgage: { ...prev.mortgage, ...partial } }));
  }

  function openCreateModal() {
    setEditingAccountId(null);
    setFormState(makeInitialForm(undefined, ownerOptions));
    setIsFormOpen(true);
  }

  function openEditModal(account: Account) {
    setEditingAccountId(account.id);
    setFormState(makeInitialForm(account, ownerOptions));
    setIsFormOpen(true);
  }

  function openCreatePersonModal() {
    setEditingPersonId(null);
    setPersonFormError(null);
    setPersonFormState({ name: "", email: "", birthDate: "", expectedLifetime: "", isActive: true });
    setIsPersonFormOpen(true);
  }

  function openEditPersonModal(person: WealthPersonProfile) {
    setEditingPersonId(person.id);
    setPersonFormError(null);
    setPersonFormState({
      name: person.name,
      email: person.email ?? "",
      birthDate: person.birthDate ?? "",
      expectedLifetime: person.expectedLifetime == null ? "" : String(person.expectedLifetime),
      isActive: person.isActive,
    });
    setIsPersonFormOpen(true);
  }

  function handlePersonSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPersonFormError(null);
    const payload = {
      name: personFormState.name,
      email: personFormState.email.trim() || null,
      birthDate: personFormState.birthDate.trim() || null,
      expectedLifetime: personFormState.expectedLifetime.trim() ? Number(personFormState.expectedLifetime) : null,
      isActive: personFormState.isActive,
    };

    const onSuccess = () => setIsPersonFormOpen(false);
    const onError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Save failed. Please try again.";
      setPersonFormError(msg);
    };

    if (editingPersonId) {
      updatePersonProfile.mutate({ id: editingPersonId, ...payload }, { onSuccess, onError });
    } else {
      createPersonProfile.mutate(payload as any, { onSuccess, onError });
    }
  }

  function handleDeletePerson(personId: string) {
    deletePersonProfile.mutate(personId);
  }

  function openUpdateModal(account: Account) {
    setUpdatingAccountId(account.id);
    setUpdateState({
      nativeBalance: String(account.nativeBalance),
      updatedAt: account.updatedAt,
    });
  }

  function handleDeleteAccount(accountId: string) {
    deleteAccount.mutate(accountId);
    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isMultipleOwners = formState.ownerId === "__multiple__";

    const ownershipSplit = isMultipleOwners
      ? ownerOptions
          .map((person) => ({
            ownerId: person.id,
            ownerName: person.name,
            sharePct: Number(formState.ownershipSplit[person.id] ?? 0),
          }))
          .filter((entry) => entry.sharePct > 0)
      : (() => {
          const owner = ownerOptions.find((person) => person.id === formState.ownerId);
          if (!owner) return [];
          return [{ ownerId: owner.id, ownerName: owner.name, sharePct: 100 }];
        })();

    if (ownershipSplit.length === 0) {
      window.alert("Select at least one owner.");
      return;
    }
    if (isMultipleOwners && ownershipSplit.length < 2) {
      window.alert("Select at least two owners when using Multiple.");
      return;
    }
    const ownershipTotal = ownershipSplit.reduce((sum, entry) => sum + entry.sharePct, 0);
    if (isMultipleOwners && Math.abs(ownershipTotal - 100) > 0.01) {
      window.alert("Ownership split must sum to 100%.");
      return;
    }

    ownershipSplit.sort((a, b) => b.sharePct - a.sharePct);
    const primaryOwner = ownershipSplit[0];
    const coOwner = ownershipSplit[1];

    const portfolioLines =
      formState.type === "Investment"
        ? formState.portfolioLines.map((line) => ({
            id: line.id,
            label: line.label || "Unnamed line",
            allocationBucket: line.allocationBucket,
            currency: line.currency,
            nativeAmount: Number(line.nativeAmount),
            fxToEur: Number(line.fxToEur),
            expectedReturnPct: Number(line.expectedReturnPct || 0),
          }))
        : undefined;

    const mortgagePayload: MortgageDetails | undefined =
      (formState.type === "Loan" || (formState.type === "Property" && formState.mortgage.hasMortgage)) &&
      Number(formState.mortgage.principal) > 0
        ? {
            principal: Number(formState.mortgage.principal),
            annualRatePct: Number(formState.mortgage.annualRatePct),
            termMonths: Number(formState.mortgage.termMonths),
            startDate: formState.mortgage.startDate,
            mortgageType: formState.mortgage.mortgageType,
          }
        : undefined;

    const payload: Account = {
      id: editingAccountId ?? `a-${Date.now()}`,
      ownerId: primaryOwner.ownerId,
      ownerName: primaryOwner.ownerName,
      ownershipSplit,
      coOwnerId: coOwner?.ownerId,
      coOwnerName: coOwner?.ownerName,
      accountName: formState.accountName,
      institution: formState.institution,
      type: formState.type,
      currency: formState.type === "Investment" ? "EUR" : formState.currency,
      nativeBalance:
        formState.type === "Investment"
          ? portfolioTotalEur
          : formState.type === "Loan"
            ? -Number((computedLoanBalance ?? 0).toFixed(2))
            : Number(formState.nativeBalance),
      fxToEur: formState.type === "Investment" ? 1 : Number(formState.fxToEur),
      expectedReturnPct:
        formState.type === "Investment"
          ? investmentExpectedReturnPct
          : Number(formState.expectedReturnPct || 0),
      allocationBucket:
        formState.type === "Investment" && portfolioLines?.length === 1
          ? portfolioLines[0].allocationBucket
          : undefined,
      portfolioLines,
      mortgage: mortgagePayload,
      updatedAt: formState.updatedAt,
    };

    if (editingAccountId) {
      updateAccount.mutate({ ...(payload as any), id: editingAccountId });
    } else {
      createAccount.mutate(payload);
    }

    setIsFormOpen(false);
  }

  function handleUpdateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!updatingAccount) return;

    const nextBalance =
      updatingAccount.type === "Loan" && computedUpdatedLoanBalance !== null
        ? -Number(computedUpdatedLoanBalance.toFixed(2))
        : Number(updateState.nativeBalance);
    const currentBalance = updatingAccount.nativeBalance;
    const balanceRatio = currentBalance !== 0 ? nextBalance / currentBalance : 1;
    const portfolioLines = updatingAccount.portfolioLines?.map((line, index) => ({
      ...line,
      id: `pl-${Date.now()}-${index}`,
      nativeAmount: Number((line.nativeAmount * balanceRatio).toFixed(2)),
    }));

    createAccount.mutate({
      ...updatingAccount,
      id: `a-${Date.now()}`,
      nativeBalance: nextBalance,
      updatedAt: updateState.updatedAt,
      portfolioLines,
    });

    setUpdatingAccountId(null);
  }

  async function handleImportCsv() {
    if (!importFile) {
      setImportError("Please choose a CSV file before importing.");
      return;
    }

    setImportError(null);
    setImportResult(null);

    try {
      const summary = await importAccountsCsv.mutateAsync(importFile);
      setImportResult(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setImportError(message);
    }
  }

  function handleDownloadTemplate() {
    const csvContent = buildAccountsRegistryCsv(sourceAccounts);
    const filename = sourceAccounts.length > 0
      ? `wealth-accounts-registry-${new Date().toISOString().slice(0, 10)}.csv`
      : "wealth-accounts-import-template.csv";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handlePortfolioLineChange(lineId: string, field: keyof PortfolioLineState, value: string) {
    setFormState((prev) => ({
      ...prev,
      portfolioLines: prev.portfolioLines.map((line) => {
        if (line.id !== lineId) return line;
        if (field === "currency") {
          const nextCurrency = value as SupportedCurrency;
          const rate = latestFxByCurrency[nextCurrency] ?? line.fxToEur;
          return { ...line, currency: nextCurrency, fxToEur: String(Number(rate.toFixed(4))) };
        }
        return { ...line, [field]: value };
      }),
    }));
  }

  useEffect(() => {
    if (formState.currency === "EUR") {
      if (formState.fxToEur !== "1") {
        setFormState((prev) => ({ ...prev, fxToEur: "1" }));
      }
      return;
    }
    const rate = latestFxByCurrency[formState.currency];
    if (!rate) return;
    const nextFx = String(Number(rate.toFixed(4)));
    if (formState.fxToEur === nextFx) return;
    setFormState((prev) => ({ ...prev, fxToEur: nextFx }));
  }, [formState.currency, formState.fxToEur, latestFxByCurrency]);

  function handleAddPortfolioLine() {
    setFormState((prev) => ({
      ...prev,
      portfolioLines: [...prev.portfolioLines, makeEmptyPortfolioLine(prev.portfolioLines.length)],
    }));
  }

  function handleRemovePortfolioLine(lineId: string) {
    setFormState((prev) => ({
      ...prev,
      portfolioLines: prev.portfolioLines.filter((line) => line.id !== lineId),
    }));
  }

  return (
    <PageFrame>
      <PageHeader
        title="Accounts"
      />

      {isLoading ? (
        <SurfaceCard><Skeleton lines={8} /></SurfaceCard>
      ) : isError ? (
        <SurfaceCard>
          <p style={{ color: "var(--color-status-error)" }}>Failed to load accounts. Check that the backend is running.</p>
        </SurfaceCard>
      ) : (<>

      <section className="wealth-kpi-grid" aria-label="Filtered totals">
        <KpiCard label="Filtered Net Worth" value={formatMoney(totals.netWorth)} />
        <KpiCard label="Filtered Assets" value={formatMoney(totals.assets)} />
        <KpiCard label="Filtered Liabilities" value={formatMoney(totals.liabilities)} />
        <KpiCard label="Visible Accounts" value={String(currentAccounts.length)} />
      </section>

      <SurfaceCard>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Person Profiles</h3>
          <Button onClick={openCreatePersonModal}>Add Person</Button>
        </div>
        {personProfiles.length === 0 ? (
          <EmptyState title="No person profiles" description="Create at least one person before creating accounts." />
        ) : (
          <DataTable
            rowKey="id"
            searchable={false}
            pageSize={6}
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email", render: (value: unknown) => String(value ?? "-") },
              { key: "birthDate", header: "Birth Date", render: (value: unknown) => String(value ?? "-") },
              { key: "currentAge", header: "Age", render: (value: unknown) => (value == null ? "-" : Number(value).toFixed(1)) },
              {
                key: "expectedLifetime",
                header: "Exp. Lifetime",
                render: (value: unknown) => (value == null ? "-" : String(value)),
              },
              {
                key: "isActive",
                header: "Status",
                render: (value: unknown) => <Badge tone={value ? "success" : "default"}>{value ? "Active" : "Inactive"}</Badge>,
              },
              {
                key: "id",
                header: "Actions",
                sortable: false,
                render: (_: unknown, row: Record<string, unknown>) => {
                  const person = row as unknown as WealthPersonProfile;
                  return (
                    <div className="wealth-actions-row">
                      <Button size="sm" variant="secondary" onClick={() => openEditPersonModal(person)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeletePerson(person.id)}>
                        Delete
                      </Button>
                    </div>
                  );
                },
              },
            ]}
            data={personProfiles as unknown as Record<string, unknown>[]}
          />
        )}
      </SurfaceCard>

      <SurfaceCard>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Filters</h3>
        </div>
        <div className="wealth-filter-grid">
          <FormDropdown
            label="Owner"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            options={[
              { value: "all", label: "All owners" },
              ...ownerOptions.map((person) => ({ value: person.id, label: person.name })),
            ]}
          />
          <FormDropdown
            label="Account Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[{ value: "all", label: "All types" }, ...TYPE_OPTIONS]}
          />
          <FormDropdown
            label="Currency"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            options={[{ value: "all", label: "All currencies" }, ...CURRENCY_OPTIONS]}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Bulk Import (CSV)</h3>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          <p className="wealth-muted" style={{ margin: 0 }}>
            Upload a wide CSV: static account columns + one column per date (YYYY-MM-DD). Each non-empty date cell creates an account entry for that date.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportError(null);
                setImportResult(null);
              }}
            />
            <Button
              type="button"
              variant="icon"
              className="wealth-compact-icon-button"
              aria-label={importAccountsCsv.isPending ? "Importing CSV" : "Import CSV"}
              title={importAccountsCsv.isPending ? "Importing CSV" : "Import CSV"}
              onClick={handleImportCsv}
              disabled={!importFile || importAccountsCsv.isPending}
            >
              <ImportIcon />
            </Button>
          </div>
          {importError ? (
            <p style={{ margin: 0, color: "var(--color-status-error)" }}>{importError}</p>
          ) : null}
          {importResult ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0 }}>
                Created: <strong>{importResult.createdCount}</strong> | Skipped duplicates: <strong>{importResult.skippedCount}</strong> | Errors: <strong>{importResult.errorCount}</strong>
              </p>
              {importResult.errorCount > 0 ? (
                <div className="data-table-root" style={{ maxHeight: 200, overflow: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="data-table-th">Row</th>
                        <th className="data-table-th">Column</th>
                        <th className="data-table-th">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((item, idx) => (
                        <tr key={`${item.row}-${item.column}-${idx}`}>
                          <td className="data-table-td">{item.row}</td>
                          <td className="data-table-td">{item.column}</td>
                          <td className="data-table-td">{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="card-header">
          <h3 style={{ margin: 0 }}>Account Registry</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {fxSyncStatus === "syncing" ? <Badge tone="info">Fetching FX rates...</Badge> : null}
            {fxSyncStatus === "success" && fxSyncDate ? (
              <Badge tone="success">
                All FX fetched {new Date(fxSyncDate).toLocaleDateString()} {new Date(fxSyncDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            ) : null}
            {fxSyncStatus === "error" ? <Badge tone="error">FX sync failed</Badge> : null}
            <Button
              type="button"
              variant="icon"
              className="wealth-compact-icon-button"
              aria-label={sourceAccounts.length > 0 ? "Download full account registry CSV" : "Download CSV template"}
              title={sourceAccounts.length > 0 ? "Download full account registry CSV" : "Download CSV template"}
              onClick={handleDownloadTemplate}
            >
              <DownloadIcon />
            </Button>
            <span
              title={ownerOptions.length === 0 ? "Add at least one person in the Person Profiles section below first" : undefined}
              style={{ display: "inline-block" }}
            >
              <Button onClick={openCreateModal} disabled={ownerOptions.length === 0}>
                Add Account
              </Button>
            </span>
            <button
              className="wealth-icon-btn wealth-icon-btn--accent"
              title="Erase all accounts"
              onClick={() => setIsEraseAllOpen(true)}
            >
              <DeleteIcon />
            </button>
          </div>
        </div>
        {ownerOptions.length === 0 && !isLoading ? (
          <p className="wealth-muted" style={{ marginTop: 0, color: "var(--color-status-warning, #b45309)" }}>
            No person profiles yet — add a person in the <strong>Person Profiles</strong> section below before creating accounts.
          </p>
        ) : null}
        {fxSyncStatus === "error" && fxSyncError ? (
          <p className="wealth-muted" style={{ marginTop: 0, color: "var(--color-status-error)" }}>
            {fxSyncError}
          </p>
        ) : null}

        {matchingAccounts.length === 0 ? (
          <EmptyState
            title="No accounts found"
            description="Adjust filters or add a new account to continue."
          />
        ) : (
          <>
            <p className="wealth-muted" style={{ marginTop: 0 }}>
              KPI cutoff date: <strong>{latestAvailableDate}</strong>. Accounts below this line are older entries.
            </p>

            <DataTable
              columns={accountTableColumns}
              data={currentAccounts}
              rowKey="id"
              searchable
              pageSize={8}
              onRowClick={(row) => setSelectedAccountId(String(row.id))}
            />

            {olderAccounts.length > 0 ? (
              <>
                <div className="wealth-cutoff-separator" role="separator" aria-label="Cutoff separator">
                  <span>Older entries (before {latestAvailableDate})</span>
                </div>
                <DataTable
                  columns={accountTableColumns}
                  data={olderAccounts}
                  rowKey="id"
                  searchable={false}
                  pageSize={8}
                  onRowClick={(row) => setSelectedAccountId(String(row.id))}
                />
              </>
            ) : null}
          </>
        )}
      </SurfaceCard>

      <Modal
        open={isEraseAllOpen}
        onClose={() => setIsEraseAllOpen(false)}
        title="Erase All Accounts"
        size="default"
      >
        <p style={{ margin: "0 0 20px" }}>
          This will permanently delete <strong>all accounts</strong> from the registry. This action cannot be undone.
        </p>
        <div className="wealth-modal-actions">
          <Button variant="secondary" onClick={() => setIsEraseAllOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteAllAccounts.mutate(undefined, {
                onSuccess: () => setIsEraseAllOpen(false),
              });
            }}
          >
            <DeleteIcon /> Erase All
          </Button>
        </div>
      </Modal>

      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAccountId ? "Edit Account" : "New Account"}
        size={formState.type === "Loan" || formState.type === "Property" ? "wide" : "default"}
      >
        <FormContainer
          onSubmit={handleFormSubmit}
          footer={
            <div className="wealth-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Account</Button>
            </div>
          }
        >
          {/* ── Identity (always visible) ── */}
          <div className="form-section">
            <p className="form-section-label">Account</p>
            <div className="form-row-2">
              <FormDropdown
                required
                label="Primary Owner"
                value={formState.ownerId}
                onChange={(e) => {
                  const nextOwnerId = e.target.value;
                  setFormState((prev) => {
                    const nextSplit = { ...prev.ownershipSplit };
                    if (nextOwnerId === "__multiple__") {
                      return { ...prev, ownerId: nextOwnerId, ownershipSplit: nextSplit };
                    }
                    for (const person of ownerOptions) {
                      nextSplit[person.id] = person.id === nextOwnerId ? 100 : 0;
                    }
                    return { ...prev, ownerId: nextOwnerId, ownershipSplit: nextSplit };
                  });
                }}
                options={
                  ownerOptions.length
                    ? [
                        ...ownerOptions.map((person) => ({ value: person.id, label: person.name })),
                        { value: "__multiple__", label: "Multiple" },
                      ]
                    : [{ value: "", label: "No person profiles available" }]
                }
              />
              <FormDropdown
                required
                label="Type"
                value={formState.type}
                onChange={(e) => {
                  const nextType = e.target.value as AccountType;
                  setFormState((prev) => ({
                    ...prev,
                    type: nextType,
                    portfolioLines:
                      nextType === "Investment"
                        ? prev.portfolioLines.length > 0
                          ? prev.portfolioLines
                          : [makeEmptyPortfolioLine()]
                        : [],
                    mortgage: buildMortgageFormState({ type: nextType, nativeBalance: Number(prev.nativeBalance) }),
                  }));
                }}
                options={TYPE_OPTIONS}
              />
            </div>
            {formState.ownerId === "__multiple__" ? (
            <div className="form-section" style={{ paddingTop: 0 }}>
              <p className="form-section-label">Ownership Split (%)</p>
              <div className="stack" style={{ gap: "var(--spacing-8)" }}>
                {ownerOptions.map((person) => (
                  <div key={person.id} className="form-row-2">
                    <FormInput
                      label={person.name}
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={String(formState.ownershipSplit[person.id] ?? 0)}
                      onChange={(e) => {
                        const numeric = Number(e.target.value || 0);
                        const safe = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
                        setFormState((prev) => ({
                          ...prev,
                          ownershipSplit: { ...prev.ownershipSplit, [person.id]: safe },
                        }));
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "end", paddingBottom: "8px" }}>
                      <span className="wealth-muted">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="wealth-muted" style={{ marginTop: "8px", marginBottom: 0 }}>
                Total: {ownerOptions.reduce((sum, person) => sum + Number(formState.ownershipSplit[person.id] ?? 0), 0).toFixed(1)}%
              </p>
            </div>
            ) : null}
            <div className="form-row-2">
              <FormInput
                required
                label="Account Name"
                value={formState.accountName}
                onChange={(e) => setFormState((prev) => ({ ...prev, accountName: e.target.value }))}
              />
              <FormInput
                required
                label="Institution"
                value={formState.institution}
                onChange={(e) => setFormState((prev) => ({ ...prev, institution: e.target.value }))}
              />
            </div>
          </div>

          {/* ── Type-specific sections ── */}
          {formState.type === "Loan" || formState.type === "Property" ? (
            <Tabs
              key={formState.type}
              defaultTab="details"
              items={[
                {
                  key: "details",
                  label: "Details",
                  content: (
                    <div className="form-section-group">
                      {/* Balance */}
                      <div className="form-section">
                        <p className="form-section-label">
                          {formState.type === "Loan" ? "Outstanding Balance" : "Property Value"}
                        </p>
                        <div className="form-row-2">
                          <FormDropdown
                            required
                            label="Currency"
                            value={formState.currency}
                            onChange={(e) => {
                              const nextCurrency = e.target.value as SupportedCurrency;
                              const rate = latestFxByCurrency[nextCurrency] ?? Number(formState.fxToEur || 1);
                              setFormState((prev) => ({
                                ...prev,
                                currency: nextCurrency,
                                fxToEur: String(Number(rate.toFixed(4))),
                              }));
                            }}
                            options={CURRENCY_OPTIONS}
                          />
                          <FormInput
                            required
                            type="number"
                            label={formState.type === "Loan" ? "Current Month Balance" : "Current Value"}
                            value={
                              formState.type === "Loan"
                                ? String(Number((computedLoanBalance ?? 0).toFixed(2)))
                                : formState.nativeBalance
                            }
                            disabled={formState.type === "Loan"}
                            helpText={undefined}
                            onChange={(e) => setFormState((prev) => ({ ...prev, nativeBalance: e.target.value }))}
                          />
                        </div>
                        {formState.currency !== "EUR" && (
                          <div className="form-row-2">
                            <FormInput
                              required
                              type="number"
                              step="0.0001"
                              label="FX to EUR"
                              helpText="Rate used for EUR household totals."
                              value={formState.fxToEur}
                              onChange={(e) => setFormState((prev) => ({ ...prev, fxToEur: e.target.value }))}
                            />
                            <div />
                          </div>
                        )}
                        <div className="form-row-2">
                          <FormInput
                            required
                            type="number"
                            step="0.1"
                            label="Expected Return (%)"
                            helpText="Used as portfolio-return proposal in FIRE scenario setup."
                            value={formState.expectedReturnPct}
                            onChange={(e) => setFormState((prev) => ({ ...prev, expectedReturnPct: e.target.value }))}
                          />
                          <FormDatepicker
                            required
                            label="Last Updated"
                            value={formState.updatedAt}
                            onChange={(e) => setFormState((prev) => ({ ...prev, updatedAt: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Mortgage */}
                      <div className="form-section">
                        <p className="form-section-label">Mortgage</p>
                        {formState.type === "Property" && (
                          <label className="wealth-checkbox-row">
                            <input
                              type="checkbox"
                              checked={formState.mortgage.hasMortgage}
                              onChange={(e) => setMortgage({ hasMortgage: e.target.checked })}
                            />
                            This property has an associated mortgage
                          </label>
                        )}
                        {(formState.type === "Loan" || formState.mortgage.hasMortgage) && (
                          <>
                            <div className="form-row-3">
                              <FormInput
                                required
                                type="number"
                                label="Principal (original)"
                                value={formState.mortgage.principal}
                                onChange={(e) => setMortgage({ principal: e.target.value })}
                              />
                              <FormInput
                                required
                                type="number"
                                step="0.01"
                                label="Annual Rate (%)"
                                value={formState.mortgage.annualRatePct}
                                onChange={(e) => setMortgage({ annualRatePct: e.target.value })}
                              />
                              <FormInput
                                required
                                type="number"
                                label="Term (months)"
                                helpText="240 = 20 yrs · 300 = 25 yrs"
                                value={formState.mortgage.termMonths}
                                onChange={(e) => setMortgage({ termMonths: e.target.value })}
                              />
                            </div>
                            <div className="form-row-2">
                              <FormInput
                                required
                                label="Start Date (YYYY-MM)"
                                value={formState.mortgage.startDate}
                                onChange={(e) => setMortgage({ startDate: e.target.value })}
                              />
                              <FormDropdown
                                required
                                label="Rate Type"
                                value={formState.mortgage.mortgageType}
                                onChange={(e) => setMortgage({ mortgageType: e.target.value as MortgageType })}
                                options={[
                                  { value: "Fixed", label: "Fixed rate" },
                                  { value: "Variable", label: "Variable rate" },
                                ]}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Record */}
                      <div className="form-section">
                        <p className="form-section-label">Record</p>
                        <p className="wealth-muted" style={{ margin: 0 }}>Expected return and date are shown in Balance for a more compact edit form.</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "amortization",
                  label: amortizationSchedule.length
                    ? `Amortization · ${amortizationSchedule.length} months`
                    : "Amortization",
                  content: mortgageSummary ? (
                    <div className="form-section-group">
                      <div className="wealth-mortgage-kpi-row">
                        <div className="wealth-mortgage-kpi">
                          <p className="wealth-muted">Monthly Payment</p>
                          <strong>{formatMoney(mortgageSummary.monthlyPayment, formState.currency)}</strong>
                        </div>
                        <div className="wealth-mortgage-kpi">
                          <p className="wealth-muted">Total Interest</p>
                          <strong>{formatMoney(mortgageSummary.totalInterest, formState.currency)}</strong>
                        </div>
                        <div className="wealth-mortgage-kpi">
                          <p className="wealth-muted">Total Cost</p>
                          <strong>{formatMoney(mortgageSummary.totalPaid, formState.currency)}</strong>
                        </div>
                      </div>
                      <div className="wealth-amortization-wrap">
                        <table className="data-table wealth-amortization-table">
                          <thead>
                            <tr>
                              <th className="data-table-th">#</th>
                              <th className="data-table-th">Date</th>
                              <th className="data-table-th">Payment</th>
                              <th className="data-table-th">Principal</th>
                              <th className="data-table-th">Interest</th>
                              <th className="data-table-th">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {amortizationSchedule.map((row) => (
                              <tr key={row.month} className="data-table-row">
                                <td className="data-table-td">{row.month}</td>
                                <td className="data-table-td">{row.date}</td>
                                <td className="data-table-td">{formatMoney(row.payment, formState.currency)}</td>
                                <td className="data-table-td">{formatMoney(row.principal, formState.currency)}</td>
                                <td className="data-table-td">{formatMoney(row.interest, formState.currency)}</td>
                                <td className="data-table-td">{formatMoney(row.balance, formState.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="wealth-muted" style={{ padding: "var(--spacing-16) 0" }}>
                      Fill in the mortgage details in the Details tab to compute the schedule.
                    </p>
                  ),
                },
              ]}
            />
          ) : formState.type === "Investment" ? (
            <>
              <div className="form-section">
                <div className="wealth-portfolio-header">
                  <div>
                    <p className="form-section-label">Portfolio Lines</p>
                    <p className="wealth-muted" style={{ marginTop: 4 }}>Each line carries its own asset class, currency, and amount.</p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddPortfolioLine}>
                    + Add Line
                  </Button>
                </div>

                <div className="wealth-portfolio-lines">
                  {formState.portfolioLines.map((line, idx) => (
                    <div key={line.id} className="wealth-portfolio-line-card">
                      <div className="wealth-portfolio-line-header">
                        <span className="wealth-portfolio-line-num">{idx + 1}</span>
                        <FormInput
                          aria-label="Line label"
                          value={line.label}
                          placeholder="e.g. ETF World, Bond Ladder, Gold ETC…"
                          onChange={(e) => handlePortfolioLineChange(line.id, "label", e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn-ghost btn-sm wealth-portfolio-line-remove"
                          aria-label="Remove line"
                          disabled={formState.portfolioLines.length === 1}
                          onClick={() => handleRemovePortfolioLine(line.id)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="wealth-portfolio-line-fields">
                        <FormDropdown
                          required
                          label="Asset class"
                          value={line.allocationBucket}
                          onChange={(e) => handlePortfolioLineChange(line.id, "allocationBucket", e.target.value)}
                          options={PORTFOLIO_BUCKET_OPTIONS}
                        />
                        <FormDropdown
                          required
                          label="Currency"
                          value={line.currency}
                          onChange={(e) => handlePortfolioLineChange(line.id, "currency", e.target.value)}
                          options={CURRENCY_OPTIONS}
                        />
                        <FormInput
                          required
                          type="number"
                          label="Amount"
                          value={line.nativeAmount}
                          onChange={(e) => handlePortfolioLineChange(line.id, "nativeAmount", e.target.value)}
                        />
                        <FormInput
                          required
                          type="number"
                          step="0.1"
                          label="Expected Return (%)"
                          value={line.expectedReturnPct}
                          onChange={(e) => handlePortfolioLineChange(line.id, "expectedReturnPct", e.target.value)}
                        />
                        <FormInput
                          required
                          type="number"
                          step="0.0001"
                          label="FX to EUR"
                          value={line.fxToEur}
                          onChange={(e) => handlePortfolioLineChange(line.id, "fxToEur", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="wealth-portfolio-total">
                  Total: <strong>{formatMoney(portfolioTotalEur, "EUR")}</strong>
                </p>
              </div>

              <div className="form-section">
                <p className="form-section-label">Record</p>
                <div className="form-row-2">
                  <FormInput
                    required
                    type="number"
                    step="0.1"
                    label="Expected Return (%)"
                    helpText="Computed as weighted average of line expected returns."
                    value={investmentExpectedReturnPct.toFixed(2)}
                    disabled
                  />
                  <FormDatepicker
                    required
                    label="Last Updated"
                    value={formState.updatedAt}
                    onChange={(e) => setFormState((prev) => ({ ...prev, updatedAt: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-section">
                <p className="form-section-label">Balance</p>
                <div className="form-row-2">
                  <FormDropdown
                    required
                    label="Currency"
                    value={formState.currency}
                    onChange={(e) =>
                      setFormState((prev) => {
                        const nextCurrency = e.target.value as SupportedCurrency;
                        const rate = latestFxByCurrency[nextCurrency] ?? Number(prev.fxToEur || 1);
                        return {
                          ...prev,
                          currency: nextCurrency,
                          fxToEur: String(Number(rate.toFixed(4))),
                        };
                      })
                    }
                    options={CURRENCY_OPTIONS}
                  />
                  <FormInput
                    required
                    type="number"
                    label="Native Balance"
                    value={formState.nativeBalance}
                    onChange={(e) => setFormState((prev) => ({ ...prev, nativeBalance: e.target.value }))}
                  />
                </div>
                <div className="form-row-2">
                  <FormInput
                    required
                    type="number"
                    step="0.0001"
                    label="FX to EUR"
                    helpText="Rate used to convert to EUR for household totals."
                    value={formState.fxToEur}
                    onChange={(e) => setFormState((prev) => ({ ...prev, fxToEur: e.target.value }))}
                  />
                  <div />
                </div>
              </div>

              <div className="form-section">
                <p className="form-section-label">Record</p>
                <div className="form-row-2">
                  <FormInput
                    required
                    type="number"
                    step="0.1"
                    label="Expected Return (%)"
                    helpText="Used as portfolio-return proposal in FIRE scenario setup."
                    value={formState.expectedReturnPct}
                    onChange={(e) => setFormState((prev) => ({ ...prev, expectedReturnPct: e.target.value }))}
                  />
                  <FormDatepicker
                    required
                    label="Last Updated"
                    value={formState.updatedAt}
                    onChange={(e) => setFormState((prev) => ({ ...prev, updatedAt: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}
        </FormContainer>
      </Modal>

      <Modal
        open={isPersonFormOpen}
        onClose={() => setIsPersonFormOpen(false)}
        title={editingPersonId ? "Edit Person" : "New Person"}
      >
        <FormContainer
          onSubmit={handlePersonSubmit}
          footer={
            <div className="wealth-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setIsPersonFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Person</Button>
            </div>
          }
        >
          <FormInput
            required
            label="Name"
            value={personFormState.name}
            onChange={(e) => setPersonFormState((prev) => ({ ...prev, name: e.target.value }))}
          />
          <FormInput
            label="Email"
            value={personFormState.email}
            onChange={(e) => setPersonFormState((prev) => ({ ...prev, email: e.target.value }))}
          />
          <div className="form-row-2">
            <FormDatepicker
              label="Birth date"
              value={personFormState.birthDate}
              onChange={(e) => setPersonFormState((prev) => ({ ...prev, birthDate: e.target.value }))}
            />
            <FormInput
              label="Age (computed)"
              type="text"
              readOnly
              value={
                personFormState.birthDate
                  ? (() => {
                      const b = new Date(personFormState.birthDate);
                      const today = new Date();
                      const age = today.getFullYear() - b.getFullYear() -
                        (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate()) ? 1 : 0);
                      return isNaN(age) ? "" : age.toFixed(1);
                    })()
                  : ""
              }
            />
          </div>
          <div className="form-row-2">
            <FormInput
              type="number"
              min={0}
              label="Expected lifetime"
              value={personFormState.expectedLifetime}
              onChange={(e) => setPersonFormState((prev) => ({ ...prev, expectedLifetime: e.target.value }))}
            />
          </div>
          {personFormError ? (
            <p style={{ color: "var(--color-status-error)", margin: 0, fontSize: "0.875rem" }}>{personFormError}</p>
          ) : null}
          <label className="wealth-checkbox-row">
            <input
              type="checkbox"
              checked={personFormState.isActive}
              onChange={(e) => setPersonFormState((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Active
          </label>
        </FormContainer>
      </Modal>

      <Modal
        open={selectedAccount !== null}
        onClose={() => setSelectedAccountId(null)}
        title={selectedAccount ? `${selectedAccount.accountName} detail` : "Account detail"}
      >
        {selectedAccount ? (
          <div className="stack">
            <div className="wealth-detail-grid">
              <SurfaceCard>
                <p className="wealth-muted">Owner</p>
                <p>{selectedAccount.ownerName}</p>
                <p className="wealth-muted">Institution</p>
                <p>{selectedAccount.institution}</p>
                <p className="wealth-muted">Type</p>
                <Badge tone={toBadgeTone(selectedAccount.type)}>{selectedAccount.type}</Badge>
              </SurfaceCard>
              <SurfaceCard>
                <p className="wealth-muted">Native balance</p>
                <h3 style={{ marginTop: 6 }}>{formatMoney(selectedAccount.nativeBalance, selectedAccount.currency)}</h3>
                <p className="wealth-muted">Converted to EUR</p>
                <h3 style={{ marginTop: 6 }}>{formatMoney(toEur(selectedAccount), "EUR")}</h3>
                <p className="wealth-muted">Expected Return</p>
                <h3 style={{ marginTop: 6 }}>{selectedAccount.expectedReturnPct.toFixed(2)}%</h3>
                <p className="wealth-muted">Updated {selectedAccount.updatedAt}</p>
              </SurfaceCard>
            </div>

            <SurfaceCard>
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Balance History (EUR)</h3>
              </div>
              <LineChart
                data={selectedAccountHistory}
                xKey="period"
                yLabel="EUR"
                series={[{ dataKey: "balanceEur", name: "Balance" }]}
                height={240}
              />
            </SurfaceCard>

            {selectedAccount.portfolioLines?.length ? (
              <SurfaceCard>
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Portfolio Lines</h3>
                </div>
                <div className="data-table-root wealth-portfolio-table">
                  <div className="data-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="data-table-th">Line</th>
                          <th className="data-table-th">Type</th>
                          <th className="data-table-th">Currency</th>
                          <th className="data-table-th">Amount</th>
                          <th className="data-table-th">EUR Value</th>
                          <th className="data-table-th">Expected Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAccount.portfolioLines.map((line) => (
                          <tr key={line.id}>
                            <td className="data-table-td">{line.label}</td>
                            <td className="data-table-td">{line.allocationBucket}</td>
                            <td className="data-table-td">{line.currency}</td>
                            <td className="data-table-td">{formatMoney(line.nativeAmount, line.currency)}</td>
                            <td className="data-table-td">{formatMoney(line.nativeAmount * line.fxToEur, "EUR")}</td>
                            <td className="data-table-td">{Number(line.expectedReturnPct ?? selectedAccount.expectedReturnPct).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </SurfaceCard>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={updatingAccount !== null}
        onClose={() => setUpdatingAccountId(null)}
        title={updatingAccount ? `Update ${updatingAccount.accountName}` : "Update account"}
      >
        <FormContainer
          title="Quick balance update"
          description="Create a new dated entry without changing the current record. Use Edit to change the current entry itself."
          onSubmit={handleUpdateSubmit}
          footer={
            <div className="wealth-modal-actions">
              <Button type="button" variant="secondary" onClick={() => setUpdatingAccountId(null)}>
                Cancel
              </Button>
              <Button type="submit">Save Update</Button>
            </div>
          }
        >
          <FormInput
            required
            type="number"
            label={updatingAccount?.type === "Loan" ? "Computed Balance" : "New Amount"}
            value={
              updatingAccount?.type === "Loan"
                ? String(Number((computedUpdatedLoanBalance ?? 0).toFixed(2)))
                : updateState.nativeBalance
            }
            disabled={updatingAccount?.type === "Loan"}
            helpText={
              updatingAccount?.type === "Loan"
                ? "Computed automatically from the amortization schedule for the selected month."
                : undefined
            }
            onChange={(e) => setUpdateState((prev) => ({ ...prev, nativeBalance: e.target.value }))}
          />
          <FormDatepicker
            required
            label="New Date"
            value={updateState.updatedAt}
            onChange={(e) => setUpdateState((prev) => ({ ...prev, updatedAt: e.target.value }))}
          />
        </FormContainer>
      </Modal>
      </>)}
    </PageFrame>
  );
}