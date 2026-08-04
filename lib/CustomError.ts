export class CustomError extends Error {
  customMessage: string;

  constructor(originalError: unknown, customMessage: string) {
    super(originalError instanceof Error ? originalError.message : String(originalError));

    this.name = "CustomError";
    this.customMessage = customMessage;
  }
}
