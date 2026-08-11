export class HTTPError extends Error {
  status: number;
  data?: string;

  constructor(status: number, message: string, data?: string) {
    super(message);

    this.status = status;
    this.name = "HTTPError";
    this.data = data;
  }
}
