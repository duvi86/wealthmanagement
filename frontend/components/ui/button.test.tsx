import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { Button } from "./button";

describe("Button", () => {
  it("renders primary variant by default", () => {
    render(createElement(Button, null, "Save"));
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("btn-primary");
  });

  it("is disabled and busy when loading", () => {
    render(createElement(Button, { loading: true }, "Saving"));
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
