import { type Account, computeTotals } from "@/lib/wealth-mock-data";

export const ALL_SCOPE_VALUE = "all";

export type WealthScope = {
  ownerId: string;
  accountType: string;
  currency: string;
};

export function toDateKey(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function getOwnershipShare(account: Account, ownerId: string): number {
  // If no specific owner filter, return 100%
  if (ownerId === ALL_SCOPE_VALUE) return 1;

  // If ownership split is defined, find the owner's share percentage
  if (account.ownershipSplit && account.ownershipSplit.length > 0) {
    const ownerShare = account.ownershipSplit.find((split) => split.ownerId === ownerId);
    return ownerShare ? ownerShare.sharePct / 100 : 0;
  }

  // Without an explicit split, treat two-owner accounts as 50/50.
  if (account.coOwnerId) {
    if (account.ownerId === ownerId || account.coOwnerId === ownerId) {
      return 0.5;
    }
    return 0;
  }

  if (account.ownerId === ownerId) return 1;

  return 0;
}

function adjustAccountByOwnership(account: Account, ownerId: string): Account {
  const share = getOwnershipShare(account, ownerId);
  if (share === 1) return account;

  return {
    ...account,
    nativeBalance: account.nativeBalance * share,
    portfolioLines: account.portfolioLines?.map((line) => ({
      ...line,
      nativeAmount: String(Number(line.nativeAmount) * share),
    })),
    mortgage: account.mortgage
      ? {
          ...account.mortgage,
          balance: account.mortgage.balance * share,
        }
      : undefined,
  };
}

export function scopeAccounts(accounts: Account[], scope: WealthScope): Account[] {
  return accounts
    .filter((account) => {
      if (scope.ownerId !== ALL_SCOPE_VALUE && account.ownerId !== scope.ownerId && account.coOwnerId !== scope.ownerId) return false;
      if (scope.accountType !== ALL_SCOPE_VALUE && account.type !== scope.accountType) return false;
      if (scope.currency !== ALL_SCOPE_VALUE && account.currency !== scope.currency) return false;
      return true;
    })
    .map((account) => adjustAccountByOwnership(account, scope.ownerId));
}

export function latestScopedDate(accounts: Account[]): string | null {
  return accounts.reduce<string | null>((latest, account) => {
    const dateKey = toDateKey(account.updatedAt);
    if (!dateKey) {
      return latest;
    }
    if (!latest || dateKey > latest) {
      return dateKey;
    }
    return latest;
  }, null);
}

export function computeScopedSnapshot(accounts: Account[], scope: WealthScope) {
  const matchingAccounts = scopeAccounts(accounts, scope);
  const latestDate = latestScopedDate(matchingAccounts);
  const currentAccounts = latestDate
    ? matchingAccounts.filter((account) => toDateKey(account.updatedAt) === latestDate)
    : [];
  const olderAccounts = latestDate
    ? matchingAccounts.filter((account) => toDateKey(account.updatedAt) !== latestDate)
    : matchingAccounts;

  return {
    matchingAccounts,
    latestDate,
    currentAccounts,
    olderAccounts,
    totals: computeTotals(currentAccounts),
  };
}

type AmortizationRow = {
  date: string;
  balance: number;
};

function computeAmortizationRows(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  startDate: string,
): AmortizationRow[] {
  if (principal <= 0 || annualRatePct <= 0 || termMonths <= 0) return [];
  const monthlyRate = annualRatePct / 100 / 12;
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  const parts = startDate.split("-");
  const startYear = Number(parts[0] ?? 2024);
  const startMonthIdx = Number(parts[1] ?? 1) - 1;

  let balance = principal;
  const rows: AmortizationRow[] = [];

  for (let i = 0; i < termMonths && balance > 0.005; i += 1) {
    const interest = balance * monthlyRate;
    const principalPart = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - principalPart);
    const monthIndex = (startMonthIdx + i) % 12;
    const year = startYear + Math.floor((startMonthIdx + i) / 12);

    rows.push({
      date: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      balance,
    });
  }

  return rows;
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

export function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getLoanAccountBalanceForMonth(account: Account, monthKey: string) {
  if (account.type !== "Loan" || !account.mortgage) return account.nativeBalance;

  const rows = computeAmortizationRows(
    account.mortgage.principal,
    account.mortgage.annualRatePct,
    account.mortgage.termMonths,
    account.mortgage.startDate,
  );
  const computedBalance = getAmortizedBalanceForMonth(rows, monthKey, account.mortgage.principal);
  return -Number(computedBalance.toFixed(2));
}

export function normalizeLoanBalancesForMonth(accounts: Account[], monthKey: string): Account[] {
  return accounts.map((account) => ({
    ...account,
    nativeBalance: getLoanAccountBalanceForMonth(account, monthKey),
  }));
}
