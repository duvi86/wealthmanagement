import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable } from "./data-table";

type Row = { id: string; name: string; value: number };

const rows: Row[] = Array.from({ length: 12 }).map((_, idx) => ({
  id: `r-${idx + 1}`,
  name: `Item ${idx + 1}`,
  value: idx + 1,
}));

describe("DataTable", () => {
  it("supports sort, search, and pagination", async () => {
    const user = userEvent.setup();

    render(
      <DataTable
        columns={[
          { key: "name", header: "Name" },
          { key: "value", header: "Value" },
        ]}
        data={rows}
        pageSize={5}
      />,
    );

    expect(screen.getByText("Item 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText("Item 6")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search table" }), "Item 12");
    expect(screen.getByText("Item 12")).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search table" }));
    await user.click(screen.getByRole("columnheader", { name: /Value/i }));
    await user.click(screen.getByRole("columnheader", { name: /Value/i }));

    expect(screen.getByText("Item 12")).toBeInTheDocument();
  });
});
