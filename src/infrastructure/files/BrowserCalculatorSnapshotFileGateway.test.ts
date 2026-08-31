import { createInitialCalculatorState } from "../../domain/calculator/state";
import { BrowserCalculatorSnapshotFileGateway } from "./BrowserCalculatorSnapshotFileGateway";

describe("BrowserCalculatorSnapshotFileGateway", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalWindowOpen = window.open;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:ticket-preview");
    URL.revokeObjectURL = jest.fn();
    window.open = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    window.open = originalWindowOpen;
    jest.restoreAllMocks();
  });

  test("opens the receipt pdf in a new tab when preview is available", async () => {
    const gateway = new BrowserCalculatorSnapshotFileGateway();
    const state = createInitialCalculatorState();
    state.paperTape = ["2026-08-31 10:43", "50 *"];
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");

    (window.open as jest.Mock).mockReturnValue({} as Window);

    await gateway.exportReceiptPdf(state);

    expect(window.open).toHaveBeenCalledWith(
      "blob:ticket-preview",
      "_blank",
      "noopener,noreferrer"
    );
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  test("downloads the receipt pdf when the preview tab is blocked", async () => {
    const gateway = new BrowserCalculatorSnapshotFileGateway();
    const state = createInitialCalculatorState();
    state.paperTape = ["2026-08-31 10:43", "50 *"];
    const clickSpy = jest.fn();
    const createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation(((tagName: string) => {
        if (tagName === "a") {
          return { click: clickSpy } as unknown as HTMLAnchorElement;
        }

        return originalCreateElement(tagName);
      }) as typeof document.createElement);

    (window.open as jest.Mock).mockReturnValue(null);

    await gateway.exportReceiptPdf(state);

    expect(window.open).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
