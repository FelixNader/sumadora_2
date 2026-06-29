import { ClipboardGateway } from "../../application/ports/ClipboardGateway";

export class BrowserClipboardGateway implements ClipboardGateway {
  async writeText(value: string): Promise<void> {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard API is not available");
    }

    await navigator.clipboard.writeText(value);
  }
}
