import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./tabs";

describe("Tabs", () => {
  it("switches active tab and panel content", async () => {
    const user = userEvent.setup();

    render(
      <Tabs
        items={[
          { key: "a", label: "Alpha", content: <div>Alpha Content</div> },
          { key: "b", label: "Beta", content: <div>Beta Content</div> },
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Alpha Content")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Beta" }));

    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Beta Content")).toBeInTheDocument();
  });
});
