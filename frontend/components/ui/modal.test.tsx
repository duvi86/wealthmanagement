import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { Modal } from "./modal";

describe("Modal", () => {
  it("renders open modal and closes via close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      createElement(
        Modal,
        { open: true, onClose, title: "Edit Profile" },
        createElement("div", null, "Body"),
      ),
    );

    expect(screen.getByRole("heading", { name: "Edit Profile" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
