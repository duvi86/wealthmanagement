import * as XLSX from "xlsx";

// Column definitions for Accounts and PortfolioLines
export const ACCOUNTS_COLUMNS = [
  "account_id",
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
  "mortgage_type"
  // ...date columns can be appended dynamically
];

export const PORTFOLIO_LINES_COLUMNS = [
  "account_id",
  "label",
  "allocation_bucket",
  "area",
  "market_type",
  "currency",
  "amount",
  "expected_return_pct"
];

export const INSTRUCTIONS = [
  ["Instructions: This file contains two sheets. 'Accounts' for account-level data, 'PortfolioLines' for asset lines. Link lines to accounts using 'account_id'. Do not edit column headers. FX is computed automatically."],
  ["Sheet 'Accounts': Fill one row per account. 'account_id' must be unique. Date columns are optional and can be added after the static columns."],
  ["Sheet 'PortfolioLines': Each row is a portfolio line linked to an account via 'account_id'. All columns are required except 'label'."]
];

// Generate a template workbook with explanations and sample rows
export function generateAccountsWorkbookTemplate() {
  const accountsSheet = [
    Object.fromEntries(ACCOUNTS_COLUMNS.map((k) => [k, k === "account_id" ? "acc-001" : k])),
  ];
  const portfolioLinesSheet = [
    Object.fromEntries(PORTFOLIO_LINES_COLUMNS.map((k) => [k, k === "account_id" ? "acc-001" : k])),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(INSTRUCTIONS), "Instructions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountsSheet), "Accounts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(portfolioLinesSheet), "PortfolioLines");
  return wb;
}

// Export data to workbook
export function exportAccountsWorkbook(accounts, portfolioLines, dateColumns = []) {
  const accountsData = accounts.map((a) => {
    const row = { ...a };
    // Add date columns if present
    for (const dateCol of dateColumns) {
      row[dateCol] = a[dateCol] || "";
    }
    return row;
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(INSTRUCTIONS), "Instructions");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountsData, { header: [...ACCOUNTS_COLUMNS, ...dateColumns] }), "Accounts");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(portfolioLines, { header: PORTFOLIO_LINES_COLUMNS }), "PortfolioLines");
  return wb;
}

// Parse uploaded workbook
export function parseAccountsWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const accounts = XLSX.utils.sheet_to_json(wb.Sheets["Accounts"] || {}, { defval: "" });
        const portfolioLines = XLSX.utils.sheet_to_json(wb.Sheets["PortfolioLines"] || {}, { defval: "" });
        resolve({ accounts, portfolioLines });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Download workbook as file
export function downloadWorkbook(wb, filename = "wealth-accounts.xlsx") {
  XLSX.writeFile(wb, filename);
}
