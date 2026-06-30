import axios, { type AxiosRequestConfig } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// ── Key conversion helpers ────────────────────────────────────────────────────

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c: string) => `_${c.toLowerCase()}`);
}

function convertKeys(obj: unknown, fn: (k: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((item) => convertKeys(item, fn));
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        fn(k),
        convertKeys(v, fn),
      ]),
    );
  }
  return obj;
}

// ── Axios instance ────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Outbound: camelCase → snake_case
apiClient.interceptors.request.use((config) => {
  if (config.data && !(config.data instanceof FormData)) {
    config.data = convertKeys(config.data, toSnake);
  }
  return config;
});

export type ApiClientError = Error & {
  status?: number;
  code?: string;
  details?: unknown;
};

function normalizeApiError(input: unknown): ApiClientError {
  if (!axios.isAxiosError(input)) {
    return Object.assign(new Error("Unexpected API error"), {
      code: "UNEXPECTED_ERROR",
      details: input,
    });
  }

  const status = input.response?.status;
  const payload = input.response?.data as { detail?: unknown; message?: string; code?: string } | undefined;
  const message =
    (typeof payload?.detail === "string" && payload.detail)
    || payload?.message
    || input.message
    || "Request failed";

  return Object.assign(new Error(message), {
    status,
    code: payload?.code ?? input.code,
    details: payload?.detail,
  });
}

apiClient.interceptors.response.use(
  (response): any => convertKeys(response.data, toCamel),
  (error) => {
    const normalized = normalizeApiError(error);

    if (
      normalized.status === 401
      && typeof window !== "undefined"
      && !window.location.pathname.startsWith("/auth/login")
    ) {
      window.location.assign("/auth/login?reason=session-expired");
    }

    return Promise.reject(normalized);
  },
);

const api = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get<T, T>(url, config);
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post<T, T>(url, data, config);
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch<T, T>(url, data, config);
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put<T, T>(url, data, config);
  },
  delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete<T, T>(url, config);
  },
};

export { apiClient, normalizeApiError };
export default api;
