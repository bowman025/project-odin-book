export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    options: ErrorOptions = {},
  ) {
    super(message, options);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = new.target.name;

    Object.setPrototypeOf(this, new.target.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}
