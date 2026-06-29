export interface ClipboardGateway {
  writeText(value: string): Promise<void>;
}
