"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/ui/bar-chart";
import { DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { ScatterChart } from "@/components/ui/scatter-chart";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs } from "@/components/ui/tabs";

// Iris-equivalent dataset: portfolio project measurements
type ProjectRow = {
  id: string;
  name: string;
  species: string; // programme group
  sepalLength: number; // Velocity
  sepalWidth: number;  // Quality Score
  petalLength: number; // Delivery Rate
  petalWidth: number;  // Risk Score
};

const IRIS_DATA: ProjectRow[] = [
  // Digital Backbone
  { id: "1",  name: "TwinOps v1",    species: "Digital Backbone", sepalLength: 5.1, sepalWidth: 3.5, petalLength: 1.4, petalWidth: 0.2 },
  { id: "2",  name: "TwinOps v2",    species: "Digital Backbone", sepalLength: 4.9, sepalWidth: 3.0, petalLength: 1.4, petalWidth: 0.2 },
  { id: "3",  name: "API Gateway",   species: "Digital Backbone", sepalLength: 4.7, sepalWidth: 3.2, petalLength: 1.3, petalWidth: 0.2 },
  { id: "4",  name: "Auth Service",  species: "Digital Backbone", sepalLength: 4.6, sepalWidth: 3.1, petalLength: 1.5, petalWidth: 0.2 },
  { id: "5",  name: "Event Bus",     species: "Digital Backbone", sepalLength: 5.0, sepalWidth: 3.6, petalLength: 1.4, petalWidth: 0.2 },
  { id: "6",  name: "CDN Layer",     species: "Digital Backbone", sepalLength: 5.4, sepalWidth: 3.9, petalLength: 1.7, petalWidth: 0.4 },
  { id: "7",  name: "Edge Proxy",    species: "Digital Backbone", sepalLength: 4.6, sepalWidth: 3.4, petalLength: 1.4, petalWidth: 0.3 },
  { id: "8",  name: "Service Mesh",  species: "Digital Backbone", sepalLength: 5.0, sepalWidth: 3.4, petalLength: 1.5, petalWidth: 0.2 },
  { id: "9",  name: "Load Balancer", species: "Digital Backbone", sepalLength: 4.4, sepalWidth: 2.9, petalLength: 1.4, petalWidth: 0.2 },
  { id: "10", name: "DNS Manager",   species: "Digital Backbone", sepalLength: 4.9, sepalWidth: 3.1, petalLength: 1.5, petalWidth: 0.1 },
  // Data Strategy
  { id: "11", name: "Data Lake v1",  species: "Data Strategy", sepalLength: 7.0, sepalWidth: 3.2, petalLength: 4.7, petalWidth: 1.4 },
  { id: "12", name: "Data Lake v2",  species: "Data Strategy", sepalLength: 6.4, sepalWidth: 3.2, petalLength: 4.5, petalWidth: 1.5 },
  { id: "13", name: "ETL Pipeline",  species: "Data Strategy", sepalLength: 6.9, sepalWidth: 3.1, petalLength: 4.9, petalWidth: 1.5 },
  { id: "14", name: "BI Platform",   species: "Data Strategy", sepalLength: 5.5, sepalWidth: 2.3, petalLength: 4.0, petalWidth: 1.3 },
  { id: "15", name: "ML Ops",        species: "Data Strategy", sepalLength: 6.5, sepalWidth: 2.8, petalLength: 4.6, petalWidth: 1.5 },
  { id: "16", name: "Feature Store", species: "Data Strategy", sepalLength: 5.7, sepalWidth: 2.8, petalLength: 4.5, petalWidth: 1.3 },
  { id: "17", name: "Lakehouse",     species: "Data Strategy", sepalLength: 6.3, sepalWidth: 3.3, petalLength: 4.7, petalWidth: 1.6 },
  { id: "18", name: "DataMesh",      species: "Data Strategy", sepalLength: 4.9, sepalWidth: 2.4, petalLength: 3.3, petalWidth: 1.0 },
  { id: "19", name: "StreamProc",    species: "Data Strategy", sepalLength: 6.6, sepalWidth: 2.9, petalLength: 4.6, petalWidth: 1.3 },
  { id: "20", name: "Catalog",       species: "Data Strategy", sepalLength: 5.2, sepalWidth: 2.7, petalLength: 3.9, petalWidth: 1.4 },
  // Security
  { id: "21", name: "Identity Mgmt", species: "Security", sepalLength: 6.3, sepalWidth: 3.3, petalLength: 6.0, petalWidth: 2.5 },
  { id: "22", name: "PAM Solution",  species: "Security", sepalLength: 5.8, sepalWidth: 2.7, petalLength: 5.1, petalWidth: 1.9 },
  { id: "23", name: "SIEM Platform", species: "Security", sepalLength: 7.1, sepalWidth: 3.0, petalLength: 5.9, petalWidth: 2.1 },
  { id: "24", name: "Zero Trust",    species: "Security", sepalLength: 6.3, sepalWidth: 2.9, petalLength: 5.6, petalWidth: 1.8 },
  { id: "25", name: "Vault Mgmt",    species: "Security", sepalLength: 6.5, sepalWidth: 3.0, petalLength: 5.8, petalWidth: 2.2 },
  { id: "26", name: "DLP Tool",      species: "Security", sepalLength: 7.6, sepalWidth: 3.0, petalLength: 6.6, petalWidth: 2.1 },
  { id: "27", name: "CASB Gateway",  species: "Security", sepalLength: 4.9, sepalWidth: 2.5, petalLength: 4.5, petalWidth: 1.7 },
  { id: "28", name: "ThreatIntel",   species: "Security", sepalLength: 7.3, sepalWidth: 2.9, petalLength: 6.3, petalWidth: 1.8 },
  { id: "29", name: "SOC Platform",  species: "Security", sepalLength: 6.7, sepalWidth: 2.5, petalLength: 5.8, petalWidth: 1.8 },
  { id: "30", name: "CSPM Tool",     species: "Security", sepalLength: 7.2, sepalWidth: 3.6, petalLength: 6.1, petalWidth: 2.5 },
];

const SPECIES_COLORS: Record<string, string> = {
  "Digital Backbone": "var(--color-chart-series-1)",
  "Data Strategy":    "var(--color-chart-series-2)",
  "Security":         "var(--color-chart-series-3)",
};

function buildHistogram(data: ProjectRow[], accessor: (r: ProjectRow) => number, label: string) {
  const values = data.map(accessor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = 5;
  const binSize = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    range: `${(min + i * binSize).toFixed(1)}–${(min + (i + 1) * binSize).toFixed(1)}`,
    count: values.filter((v) => v >= min + i * binSize && v < min + (i + 1) * binSize + (i === binCount - 1 ? 0.001 : 0)).length,
  }));
  return { bins, label };
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return den === 0 ? 0 : num / den;
}

export default function ExploratoryPage() {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const filteredData = useMemo(
    () => selectedSpecies ? IRIS_DATA.filter((r) => r.species === selectedSpecies) : IRIS_DATA,
    [selectedSpecies]
  );

  const scatterSeriesSL_PL = useMemo(() =>
    ["Digital Backbone", "Data Strategy", "Security"].map((sp) => ({
      name: sp,
      color: SPECIES_COLORS[sp],
      xKey: "sepalLength",
      yKey: "petalLength",
      data: filteredData.filter((r) => r.species === sp).map((r) => ({
        sepalLength: r.sepalLength,
        petalLength: r.petalLength,
        name: r.name,
      })),
    }))
  , [filteredData]);

  const scatterSeriesSW_PW = useMemo(() =>
    ["Digital Backbone", "Data Strategy", "Security"].map((sp) => ({
      name: sp,
      color: SPECIES_COLORS[sp],
      xKey: "sepalWidth",
      yKey: "petalWidth",
      data: filteredData.filter((r) => r.species === sp).map((r) => ({
        sepalWidth: r.sepalWidth,
        petalWidth: r.petalWidth,
        name: r.name,
      })),
    }))
  , [filteredData]);

  const histSL = useMemo(() => buildHistogram(filteredData, (r) => r.sepalLength, "Velocity (Sepal Length)"), [filteredData]);
  const histSW = useMemo(() => buildHistogram(filteredData, (r) => r.sepalWidth,  "Quality Score (Sepal Width)"), [filteredData]);
  const histPL = useMemo(() => buildHistogram(filteredData, (r) => r.petalLength, "Delivery Rate (Petal Length)"), [filteredData]);
  const histPW = useMemo(() => buildHistogram(filteredData, (r) => r.petalWidth,  "Risk Score (Petal Width)"), [filteredData]);

  const corrMatrix = useMemo(() => {
    const keys: Array<{ key: keyof ProjectRow; label: string }> = [
      { key: "sepalLength", label: "Velocity" },
      { key: "sepalWidth",  label: "Quality" },
      { key: "petalLength", label: "Delivery" },
      { key: "petalWidth",  label: "Risk" },
    ];
    return keys.map((row) =>
      keys.map((col) => ({
        row: row.label,
        col: col.label,
        value: pearson(
          filteredData.map((r) => r[row.key] as number),
          filteredData.map((r) => r[col.key] as number),
        ),
      }))
    );
  }, [filteredData]);

  const corrColor = (v: number) => {
    const abs = Math.abs(v);
    if (abs > 0.8) return v > 0 ? "#1565c0" : "#b71c1c";
    if (abs > 0.5) return v > 0 ? "#42a5f5" : "#ef5350";
    return "var(--color-text-subtle)";
  };

  const species = ["Digital Backbone", "Data Strategy", "Security"];

  const tableData = filteredData.map((r) => ({
    id: r.id,
    name: r.name,
    species: r.species,
    sepalLength: r.sepalLength,
    sepalWidth: r.sepalWidth,
    petalLength: r.petalLength,
    petalWidth: r.petalWidth,
  }));

  type TableRow = typeof tableData[number];

  return (
    <PageFrame>
      <PageHeader
        title="Exploratory Analysis"
        description="Interactive exploration of portfolio project measurements — scatter plots, distributions, correlations."
      />

      {/* Species filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setSelectedSpecies(null)}
          style={{
            padding: "6px 16px", borderRadius: 20, border: "1px solid var(--color-stroke-primary)",
            background: selectedSpecies === null ? "var(--color-accent-primary)" : "var(--color-surface-secondary)",
            color: selectedSpecies === null ? "#fff" : "var(--color-text-default)",
            cursor: "pointer", fontSize: 13, fontFamily: "var(--font-regular)",
          }}
        >
          All programmes
        </button>
        {species.map((sp) => (
          <button
            key={sp}
            onClick={() => setSelectedSpecies(sp === selectedSpecies ? null : sp)}
            style={{
              padding: "6px 16px", borderRadius: 20, border: "1px solid var(--color-stroke-primary)",
              background: selectedSpecies === sp ? SPECIES_COLORS[sp] : "var(--color-surface-secondary)",
              color: selectedSpecies === sp ? "#fff" : "var(--color-text-default)",
              cursor: "pointer", fontSize: 13, fontFamily: "var(--font-regular)",
            }}
          >
            {sp}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        <KpiCard label="Projects shown" value={String(filteredData.length)} detail={`of ${IRIS_DATA.length} total`} />
        <KpiCard label="Avg velocity"   value={(filteredData.reduce((s, r) => s + r.sepalLength, 0) / filteredData.length).toFixed(2)} detail="sepal length" />
        <KpiCard label="Avg delivery"   value={(filteredData.reduce((s, r) => s + r.petalLength, 0) / filteredData.length).toFixed(2)} detail="petal length" />
        <KpiCard label="Programmes"     value={String(new Set(filteredData.map((r) => r.species)).size)} detail="in selection" />
      </div>

      <Tabs
        items={[
          {
            key: "scatter",
            label: "Scatter Plots",
            content: (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <SurfaceCard>
                  <div className="card-header">
                    <h3 style={{ margin: 0, fontSize: 14 }}>Velocity vs Delivery Rate</h3>
                  </div>
                  <div style={{ paddingTop: 16 }}>
                    <ScatterChart
                      series={scatterSeriesSL_PL}
                      xLabel="Velocity (Sepal Length)"
                      yLabel="Delivery Rate (Petal Length)"
                      height={300}
                    />
                  </div>
                </SurfaceCard>
                <SurfaceCard>
                  <div className="card-header">
                    <h3 style={{ margin: 0, fontSize: 14 }}>Quality Score vs Risk Score</h3>
                  </div>
                  <div style={{ paddingTop: 16 }}>
                    <ScatterChart
                      series={scatterSeriesSW_PW}
                      xLabel="Quality Score (Sepal Width)"
                      yLabel="Risk Score (Petal Width)"
                      height={300}
                    />
                  </div>
                </SurfaceCard>
              </div>
            ),
          },
          {
            key: "distributions",
            label: "Distributions",
            content: (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {[histSL, histSW, histPL, histPW].map((h) => (
                  <SurfaceCard key={h.label}>
                    <div className="card-header">
                      <h3 style={{ margin: 0, fontSize: 14 }}>Distribution: {h.label}</h3>
                    </div>
                    <div style={{ paddingTop: 16 }}>
                      <BarChart
                        data={h.bins}
                        xKey="range"
                        series={[{ dataKey: "count", name: "Count", color: "var(--color-chart-series-1)" }]}
                        height={240}
                        xLabel={h.label}
                        yLabel="Count"
                      />
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            ),
          },
          {
            key: "correlation",
            label: "Correlation Heatmap",
            content: (
              <SurfaceCard>
                <div className="card-header">
                  <h3 style={{ margin: 0, fontSize: 14 }}>Pearson Correlation Matrix</h3>
                </div>
                <div style={{ paddingTop: 16, overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "var(--font-regular)", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "8px 16px", textAlign: "left", color: "var(--color-text-subtle)" }}></th>
                        {corrMatrix[0].map((cell) => (
                          <th key={cell.col} style={{ padding: "8px 16px", textAlign: "center", fontFamily: "var(--font-bold)", fontSize: 12 }}>
                            {cell.col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corrMatrix.map((row) => (
                        <tr key={row[0].row}>
                          <td style={{ padding: "8px 16px", fontFamily: "var(--font-bold)", fontSize: 12 }}>{row[0].row}</td>
                          {row.map((cell) => (
                            <td
                              key={cell.col}
                              style={{
                                padding: "12px 16px",
                                textAlign: "center",
                                color: cell.row === cell.col ? "var(--color-text-subtle)" : corrColor(cell.value),
                                fontFamily: "var(--font-bold)",
                                fontSize: 14,
                                background: cell.row === cell.col ? "var(--color-surface-primary)" : undefined,
                              }}
                            >
                              {cell.row === cell.col ? "—" : cell.value.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SurfaceCard>
            ),
          },
          {
            key: "raw",
            label: "Raw Data",
            content: (
              <DataTable<TableRow>
                columns={[
                  { key: "name",        header: "Project",         sortable: true },
                  { key: "species",     header: "Programme",       sortable: true },
                  { key: "sepalLength", header: "Velocity",        sortable: true },
                  { key: "sepalWidth",  header: "Quality Score",   sortable: true },
                  { key: "petalLength", header: "Delivery Rate",   sortable: true },
                  { key: "petalWidth",  header: "Risk Score",      sortable: true },
                ]}
                data={tableData}
                rowKey="id"
              />
            ),
          },
        ]}
      />
    </PageFrame>
  );
}
