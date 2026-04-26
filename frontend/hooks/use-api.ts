"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type {
  ConfigResponse,
  OkrStructureResponse,
  DependenciesResponse,
  DependentProgressResponse,
  CapacityInput,
  CapacityResult,
  ChatRequest,
  ChatResponse,
  Dependency,
} from "@/lib/types";

// ============================================================================
// Config Queries
// ============================================================================

export function useConfig() {
  return useQuery<ConfigResponse>({
    queryKey: ["config"],
    queryFn: async () => apiClient.get("/api/config"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// OKR Queries
// ============================================================================

export function useOkrStructure() {
  return useQuery<OkrStructureResponse>({
    queryKey: ["okr", "structure"],
    queryFn: async () => apiClient.get("/api/okr/structure"),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================================================
// Dependency Queries & Mutations
// ============================================================================

export function useDependenciesForKr(sourceKrId: number) {
  return useQuery<DependenciesResponse>({
    queryKey: ["dependencies", sourceKrId],
    queryFn: async () => apiClient.get(`/api/dependencies/kr/${sourceKrId}`),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDependentProgress(sourceKrId: number) {
  return useQuery<DependentProgressResponse>({
    queryKey: ["dependencies", sourceKrId, "progress"],
    queryFn: async () => apiClient.get(`/api/dependencies/kr/${sourceKrId}/progress`),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Dependency, "id" | "target_title" | "target_progress">) =>
      apiClient.post("/api/dependencies", payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dependencies", variables.source_kr_id],
      });
    },
  });
}

export function useDeleteDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dependencyId: number) =>
      apiClient.delete(`/api/dependencies/${dependencyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["dependencies"],
      });
    },
  });
}

// ============================================================================
// Capacity Queries
// ============================================================================

export function useCalculateCapacity(payload: CapacityInput | null) {
  return useMutation<CapacityResult, unknown, CapacityInput>({
    mutationFn: async (input) => apiClient.post("/api/capacity/rag", input),
  });
}

// ============================================================================
// Chatbot Mutations
// ============================================================================

export function useChatbot() {
  return useMutation<ChatResponse, unknown, ChatRequest>({
    mutationFn: async (payload) => apiClient.post("/api/chat", payload),
  });
}

// ============================================================================
// Wealth – Tax Calculator
// ============================================================================

export type WealthTaxCountryOption = {
  label: string;
  value: string;
};

export type WealthTaxScenario = {
  portfolio: number;
  shares: number;
  bonds: number;
  inflationRate: number;
};

export type WealthTaxDefaults = {
  country: string;
  portfolio: number;
  inflationRatePct: number;
  sharesReturnPct: number;
  bondsReturnPct: number;
  dividendYieldPct: number;
  numPersons: number;
  belgiumWealthTaxPct: number;
  sharesAllocationPct: number;
};

export type WealthTaxCalculatorConfig = {
  countryOptions: WealthTaxCountryOption[];
  scenarios: WealthTaxScenario[];
  defaults: WealthTaxDefaults;
};

export type WealthTaxCalculatorInput = {
  country: string;
  portfolioValue: number;
  inflationRatePct: number;
  sharesReturnPct: number;
  bondsReturnPct: number;
  dividendYieldPct: number;
  numPersons: number;
  belgiumWealthTaxPct: number;
  sharesAllocationPct: number;
};

export type WealthTaxCalculationResult = {
  portfolioValue: number;
  sharesValue: number;
  bondsValue: number;
  inflationRate: number;
  inflationAmount: number;
  sharesReturn: number;
  bondsReturn: number;
  dividendYield: number;
  shareDividends: number;
  shareCapitalGains: number;
  shareRevenue: number;
  bondRevenue: number;
  capitalGains: number;
  capitalGainsExemption: number;
  taxableCapitalGains: number;
  capitalGainsTax: number;
  dividendTax: number;
  bondTax: number;
  wealthTax: number;
  totalTax: number;
  revenue: number;
  taxRate: number;
  inflationAdjustedRate: number;
  netIncome: number;
  netIncomeAfterInflation: number;
  wealthGrowthRate: number;
};

export type WealthTaxCalculatorComputeResponse = {
  singleResult: WealthTaxCalculationResult;
  countryComparison: Array<{
    country: string;
    result: WealthTaxCalculationResult;
  }>;
  scenarioComparison: Array<{
    portfolio: number;
    shares: number;
    bonds: number;
    inflationRate: number;
    result: WealthTaxCalculationResult;
  }>;
  referenceCountry: string;
};

export function useWealthTaxCalculatorConfig() {
  return useQuery<WealthTaxCalculatorConfig>({
    queryKey: ["wealth", "tax-calculator", "config"],
    queryFn: async () => apiClient.get("/api/wealth/tax-calculator/config"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useComputeWealthTaxCalculator() {
  return useMutation<WealthTaxCalculatorComputeResponse, unknown, WealthTaxCalculatorInput>({
    mutationFn: async (payload) => apiClient.post("/api/wealth/tax-calculator/compute", payload),
  });
}

// ============================================================================
// Wealth – Accounts
// ============================================================================

export type WealthAccount = {
  id: string;
  ownerId: string;
  ownerName: string;
  coOwnerName?: string | null;
  coOwnerId?: string | null;
  accountName: string;
  institution: string;
  type: "Cash" | "Savings" | "Investment" | "Private Equity" | "Property" | "Loan" | "Cryptocurrency";
  currency: "EUR" | "USD" | "CHF";
  nativeBalance: number;
  fxToEur: number;
  expectedReturnPct: number;
  allocationBucket?: string;
  portfolioLines: Array<{
    id: string;
    label: string;
    allocationBucket: string;
    currency: string;
    nativeAmount: number;
    fxToEur: number;
    expectedReturnPct: number;
  }>;
  mortgage?: {
    id: number;
    accountId: string;
    principal: number;
    annualRatePct: number;
    termMonths: number;
    startDate: string;
    mortgageType: "Fixed" | "Variable";
  } | null;
  updatedAt: string;
};

export type WealthAccountImportError = {
  row: number;
  column: string;
  message: string;
};

export type WealthAccountImportSummary = {
  createdCount: number;
  skippedCount: number;
  errorCount: number;
  errors: WealthAccountImportError[];
};

export function useWealthAccounts() {
  return useQuery<WealthAccount[]>({
    queryKey: ["wealth", "accounts"],
    queryFn: async () => apiClient.get("/api/wealth/accounts"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWealthAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<WealthAccount, "portfolioLines" | "mortgage"> & {
      portfolioLines?: WealthAccount["portfolioLines"];
      mortgage?: { principal: number; annualRatePct: number; termMonths: number; startDate: string; mortgageType: string } | null;
    }) => apiClient.post<WealthAccount>("/api/wealth/accounts", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "accounts"] }),
  });
}

export function useUpdateWealthAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WealthAccount> & { id: string }) =>
      apiClient.patch<WealthAccount>(`/api/wealth/accounts/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "accounts"] }),
  });
}

export function useDeleteWealthAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/wealth/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "accounts"] }),
  });
}

export function useDeleteAllWealthAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => apiClient.delete("/api/wealth/accounts"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "accounts"] }),
  });
}

export function useImportWealthAccountsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<WealthAccountImportSummary> => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post<WealthAccountImportSummary>("/api/wealth/accounts/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "accounts"] }),
  });
}

// ============================================================================
// Wealth – Snapshots
// ============================================================================

export type WealthSnapshot = {
  id: string;
  date: string;
  netWorthEur: number;
  assetsEur: number;
  liabilitiesEur: number;
  note: string;
};

export type WealthSnapshotCreateInput = {
  id?: string;
  date: string;
  note: string;
};

export function useWealthSnapshots() {
  return useQuery<WealthSnapshot[]>({
    queryKey: ["wealth", "snapshots"],
    queryFn: async () => apiClient.get("/api/wealth/snapshots"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWealthSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WealthSnapshotCreateInput) =>
      apiClient.post<WealthSnapshot>("/api/wealth/snapshots", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "snapshots"] }),
  });
}

export function useDeleteWealthSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/wealth/snapshots/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "snapshots"] }),
  });
}

// ============================================================================
// Wealth – FIRE Scenarios
// ============================================================================

export type WealthFireScenario = {
  id: string;
  name: string;
  annualIncomeEur: number;
  annualExpensesEur: number;
  returnPct: number;
  taxRatePct: number;
  inflationPct: number;
  withdrawalRatePct: number;
  profileScope: "p-1" | "p-2" | "both";
  targetRetirementAge: number;
  postRetirementWorkIncomeEur: number;
  capitalStrategy: "protect" | "deplete";
  startingPortfolioEur: number;
  onTrajectory: boolean;
  accountIds: string[];
};

export function useWealthFireScenarios() {
  return useQuery<WealthFireScenario[]>({
    queryKey: ["wealth", "fire-scenarios"],
    queryFn: async () => apiClient.get("/api/wealth/fire-scenarios"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWealthFireScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WealthFireScenario) =>
      apiClient.post<WealthFireScenario>("/api/wealth/fire-scenarios", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "fire-scenarios"] }),
  });
}

export function useUpdateWealthFireScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WealthFireScenario> & { id: string }) =>
      apiClient.patch<WealthFireScenario>(`/api/wealth/fire-scenarios/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "fire-scenarios"] }),
  });
}

export function useDeleteWealthFireScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/wealth/fire-scenarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "fire-scenarios"] }),
  });
}

// ============================================================================
// Wealth – Decisions
// ============================================================================

export type WealthDecision = {
  id: string;
  title: string;
  description: string;
  type: "Investment" | "Rebalance" | "Strategy" | "Risk" | "Other";
  date: string;
  author: string;
  relatedScenario: string;
};

export function useWealthDecisions() {
  return useQuery<WealthDecision[]>({
    queryKey: ["wealth", "decisions"],
    queryFn: async () => apiClient.get("/api/wealth/decisions"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWealthDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WealthDecision) =>
      apiClient.post<WealthDecision>("/api/wealth/decisions", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "decisions"] }),
  });
}

export function useUpdateWealthDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<WealthDecision> & { id: string }) =>
      apiClient.patch<WealthDecision>(`/api/wealth/decisions/${id}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "decisions"] }),
  });
}

export function useDeleteWealthDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/wealth/decisions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wealth", "decisions"] }),
  });
}
