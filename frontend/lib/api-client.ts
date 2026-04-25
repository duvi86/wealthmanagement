import axios from "axios";

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

// Inbound: snake_case → camelCase + extract data
apiClient.interceptors.response.use((response): any =>
  convertKeys(response.data, toCamel),
);

export default apiClient;
