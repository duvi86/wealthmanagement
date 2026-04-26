import "@testing-library/jest-dom/vitest";

if (typeof HTMLDialogElement !== "undefined") {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal?: () => void;
    close?: () => void;
  };

  if (!proto.showModal) {
    proto.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }

  if (!proto.close) {
    proto.close = function close() {
      this.removeAttribute("open");
    };
  }
}
