import React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { CardGeneratorSimple } from "./CardGeneratorSimple";
import { ExportConfiguration } from "./ExportConfiguration";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoadingOverlay } from "./LoadingOverlay";
import { ToastContainer, ToastItem } from "./Toast";
import { ToastProvider, useToast } from "./ToastProvider";
import { ClientErrorBoundary } from "./ClientErrorBoundary";
import { CardDisplay } from "./FileUpload/CardDisplay";
import { CardGenerator } from "./FileUpload/CardGenerator";
import { PdfExporter } from "./FileUpload/PdfExporter";
import { PRESET_THEMES } from "../utils/themes";
import { loadGameFile } from "../utils/gameFiles";

// Animation timing is not part of these controls' interaction contract.
jest.mock("motion/react", () => {
  const element = (tag: string) => function MotionElement(props: Record<string, unknown>) {
    const dom = { ...props };
    for (const key of ["initial", "animate", "exit", "transition", "whileHover", "whileTap", "layout"])
      delete dom[key];
    return React.createElement(tag, dom);
  };
  return { AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>, motion: { div: element("div"), button: element("button") } };
});
const t = (key: string) => key;
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

it("normalizes an empty simple card count and disables generation while busy", () => {
  const setNumCards = jest.fn();
  const onGenerateCards = jest.fn();
  const props = { numCards: 2, setNumCards, onGenerateCards, isGenerating: false, t };
  const view = render(<CardGeneratorSimple {...props} />);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "7" } });
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
  expect(setNumCards.mock.calls).toEqual([[7], [1]]);
  fireEvent.click(screen.getByRole("button", { name: "Generate bingo cards" }));
  expect(onGenerateCards).toHaveBeenCalledTimes(1);
  view.rerender(<CardGeneratorSimple {...props} isGenerating />);
  expect(screen.getByRole("button", { name: /Generating cards/ })).toBeDisabled();
});

function exportProps() {
  return { bingoPercard: 1 as const, setBingoPercard: jest.fn(), qualityMode: "balanced" as const, setQualityMode: jest.fn(), eventHeader: "Family", setEventHeader: jest.fn(), locationFooter: "Porto", setLocationFooter: jest.fn(), t };
}
it("updates export metadata and sheet counts", () => {
  const props = exportProps();
  render(<ExportConfiguration {...props} />);
  const slider = screen.getByRole("slider");
  fireEvent.change(slider, { target: { value: "2" } });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "high" } });
  fireEvent.change(screen.getByPlaceholderText("eventNamePlaceholder"), { target: { value: "Office" } });
  fireEvent.change(screen.getByPlaceholderText("locationPlaceholder"), { target: { value: "Lisbon" } });
  expect(props.setBingoPercard).toHaveBeenCalledWith(2);
  expect(props.setQualityMode).toHaveBeenCalledWith("high");
  expect(props.setEventHeader).toHaveBeenCalledWith("Office");
  expect(props.setLocationFooter).toHaveBeenCalledWith("Lisbon");
});
it.each([[false, false], [true, false], [false, true]])("exposes card generator busy state cards=%s PDF=%s", (isGenerating, isGeneratingPDF) => {
  const props = { ...exportProps(), numCards: 2, setNumCards: jest.fn(), onGenerateCards: jest.fn(), isGenerating, isGeneratingPDF };
  render(<CardGenerator {...props} />);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "8" } });
  fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "fast" } });
  fireEvent.change(screen.getByPlaceholderText("eventNamePlaceholder"), { target: { value: "Party" } });
  fireEvent.change(screen.getByPlaceholderText("locationPlaceholder"), { target: { value: "Home" } });
  expect(props.setNumCards).toHaveBeenCalledWith(8);
  expect(props.setBingoPercard).toHaveBeenCalledWith(3);
  expect(props.setQualityMode).toHaveBeenCalledWith("fast");
  expect(props.setEventHeader).toHaveBeenCalledWith("Party");
  expect(props.setLocationFooter).toHaveBeenCalledWith("Home");
  const button = screen.getByRole("button");
  fireEvent.click(button);
  if (isGenerating || isGeneratingPDF) expect(button).toBeDisabled();
  else expect(props.onGenerateCards).toHaveBeenCalledTimes(1);
});

it("confirms explicitly, cancels on backdrop or Escape, and leaves interior clicks alone", () => {
  const onCancel = jest.fn(); const onConfirm = jest.fn();
  const props = { isOpen: true, title: "Replace game", message: "Keep a backup", onCancel, onConfirm };
  const view = render(<ConfirmDialog {...props} />);
  expect(screen.getByRole("button", { name: "Confirm: Replace game" })).toHaveTextContent("Confirm");
  fireEvent.click(screen.getByText("Keep a backup"));
  fireEvent.keyDown(document, { key: "Enter" });
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm: Replace game" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("dialog"));
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel and close dialog" }));
  expect(onCancel).toHaveBeenCalledTimes(3);
  view.rerender(<ConfirmDialog {...props} confirmText="Replace" cancelText="Keep" confirmVariant="danger" />);
  expect(screen.getByText("Replace")).toHaveClass("danger");
  view.rerender(<ConfirmDialog {...props} isOpen={false} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(onCancel).toHaveBeenCalledTimes(3);
});

it("shows optional loading progress and cancellation only when requested", () => {
  const view = render(<LoadingOverlay isVisible={false} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  view.rerender(<LoadingOverlay isVisible />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  view.rerender(<LoadingOverlay isVisible showProgress />);
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  const onCancel = jest.fn();
  view.rerender(<LoadingOverlay isVisible message="Exporting" showProgress progress={54.6} subMessage="Sheet 2" onCancel={onCancel} cancelText="Stop" />);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "55");
  expect(screen.getByText("55%")).toBeInTheDocument();
  expect(screen.getByText("Sheet 2")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel current operation" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it.each([["success", "✓"], ["error", "✕"], ["warning", "⚠"], ["info", "ℹ"]] as const)("renders %s notifications and supports manual and timed dismissal", (type, icon) => {
  jest.useFakeTimers(); const onClose = jest.fn();
  const view = render(<ToastItem toast={{ id: "notice", type, message: "Saved" }} onClose={onClose} />);
  expect(screen.getByText(icon)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveAttribute("aria-live", type === "error" ? "assertive" : "polite");
  fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
  expect(onClose).toHaveBeenCalledWith("notice");
  act(() => jest.advanceTimersByTime(3000));
  expect(onClose).toHaveBeenCalledTimes(2);
  view.rerender(<ToastContainer toasts={[{ id: "other", type, message: "Other", duration: 20 }]} onClose={onClose} />);
  act(() => jest.advanceTimersByTime(20));
  expect(onClose).toHaveBeenLastCalledWith("other");
  view.unmount();
});
function Notifications() {
  const toast = useToast();
  return <>{(["showToast", "showSuccess", "showError", "showWarning", "showInfo"] as const).map((method) => <React.Fragment key={method}><button onClick={() => toast[method](method)}>{method}</button><button onClick={() => method === "showToast" ? toast.showToast("custom", "success", 10) : toast[method]("custom", 10)}>{method} custom</button></React.Fragment>)}</>;
}
it("provides all toast variants, defaults and custom expiry, and removes dismissed messages", () => {
  jest.useFakeTimers();
  render(<ToastProvider><Notifications /></ToastProvider>);
  for (const method of ["showToast", "showSuccess", "showError", "showWarning", "showInfo"]) fireEvent.click(screen.getByRole("button", { name: method }));
  expect(screen.getAllByRole("alert")).toHaveLength(5);
  fireEvent.click(screen.getAllByRole("button", { name: "Close notification" })[0]);
  expect(screen.getAllByRole("alert")).toHaveLength(4);
  act(() => jest.advanceTimersByTime(3000));
  expect(screen.getAllByRole("alert")).toHaveLength(2);
  act(() => jest.advanceTimersByTime(2000));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  for (const method of ["showToast", "showSuccess", "showError", "showWarning", "showInfo"]) fireEvent.click(screen.getByRole("button", { name: `${method} custom` }));
  expect(screen.getAllByRole("alert")).toHaveLength(5);
  act(() => jest.advanceTimersByTime(10));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("rejects toast access outside its provider", () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  expect(() => renderHook(() => useToast())).toThrow("useToast must be used within a ToastProvider");
  error.mockRestore();
});
it("renders children through the client error wrapper", () => {
  render(<ClientErrorBoundary><p>Event content</p></ClientErrorBoundary>);
  expect(screen.getByText("Event content")).toBeInTheDocument();
});
it.each([false, true])("renders numbers, blanks and card identity with theme=%s", (themed) => {
  const card = loadGameFile("Family.bingoCards", "|CardNo.7;1;;21;31;;51;;71;;2;12;;;42;;62;;82;;13;23;33;;53;;73;").cards[0];
  const ref = jest.fn();
  const view = render(<CardDisplay card={card} cardNumber="Card 7" cardRef={ref} theme={themed ? Object.values(PRESET_THEMES)[0] : undefined} />);
  expect(screen.getByText("Card 7")).toBeInTheDocument();
  expect(screen.getByText("21")).toBeInTheDocument();
  expect(view.container.querySelectorAll(".bingo-cell")).toHaveLength(27);
  expect(view.container.querySelectorAll(".empty")).toHaveLength(12);
  expect(ref).toHaveBeenCalledWith(view.container.firstChild);
});
it.each([false, true])("enables export actions only when PDF is idle (%s)", (busy) => {
  const onExportBingoGame = jest.fn(); const onGeneratePDF = jest.fn(); const onClearCards = jest.fn();
  render(<PdfExporter onExportBingoGame={onExportBingoGame} onGeneratePDF={onGeneratePDF} onClearCards={onClearCards} isGeneratingPDF={busy} t={t} />);
  for (const button of screen.getAllByRole("button")) { fireEvent.click(button); expect(button).toHaveAttribute("aria-disabled", String(busy)); }
  for (const callback of [onExportBingoGame, onGeneratePDF, onClearCards]) expect(callback).toHaveBeenCalledTimes(busy ? 0 : 1);
});

it("uses the information icon for a notification with an unknown runtime type", () => {
  render(<ToastItem toast={{ id: "unknown", message: "External notice", type: "external" as unknown as import("./Toast").ToastType }} onClose={jest.fn()} />);
  expect(screen.getByRole("alert")).toHaveTextContent("ℹExternal notice");
  expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
});
