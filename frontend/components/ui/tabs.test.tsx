import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { Tabs } from "./tabs";

describe("Tabs", () => {
  it("switches active tab and panel content", async () => {
    const user = userEvent.setup();

    render(
      createElement(Tabs, {
        items: [
          { key: "a", label: "Alpha", content: createElement("div", null, "Alpha Content") },
          { key: "b", label: "Beta", content: createElement("div", null, "Beta Content") },
        ],
      }),
    );

    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Alpha Content")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Beta" }));

    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Beta Content")).toBeInTheDocument();
  });
});
