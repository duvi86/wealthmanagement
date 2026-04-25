"use client";

import { type ReactNode, useState } from "react";

type TabItem = { key: string; label: string; content: ReactNode };

type TabsProps = {
  items: TabItem[];
  defaultTab?: string;
};

/** Horizontal tab bar with active underline styling. Maps to Dash nav-tabs pattern. */
export function Tabs({ items, defaultTab }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.key ?? "");
  const current = items.find((t) => t.key === active);

  return (
    <div className="tabs-root">
      <div className="tabs-bar" role="tablist">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={active === item.key}
            aria-controls={`tabpanel-${item.key}`}
            className={`tab-btn${active === item.key ? " active" : ""}`}
            onClick={() => setActive(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="tabs-panel"
      >
        {current?.content}
      </div>
    </div>
  );
}
