import { formatMoney } from "@/lib/wealth-mock-data";
import type { YearlyCashflowRow } from "@/lib/fire-calculations";

type YearlyCashflowTableProps = {
  rows: YearlyCashflowRow[];
};

export function YearlyCashflowTable({ rows }: YearlyCashflowTableProps) {
  return (
    <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid var(--color-border-subtle)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 980 }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Year</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Age</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "left", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Phase</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Start</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Growth</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Contrib+Growth</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Withdraw</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>Net Flow (excl growth)</th>
            <th style={{ position: "sticky", top: 0, zIndex: 3, backgroundColor: "var(--color-bg)", textAlign: "right", padding: "8px 10px", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>End</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <td style={{ padding: "8px 10px" }}>{row.year}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.age.toFixed(1)}</td>
              <td style={{ padding: "8px 10px" }}>{row.phase}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{formatMoney(row.startPortfolioEur)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.growthEur >= 0 ? `+${formatMoney(row.growthEur)}` : formatMoney(row.growthEur)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.contributionEur + row.growthEur !== 0 ? `${row.contributionEur + row.growthEur >= 0 ? "+" : ""}${formatMoney(row.contributionEur + row.growthEur)}` : "-"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.withdrawalEur > 0 ? `-${formatMoney(row.withdrawalEur)}` : "-"}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{row.netFlowEur >= 0 ? `+${formatMoney(row.netFlowEur)}` : formatMoney(row.netFlowEur)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{formatMoney(row.endPortfolioEur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
