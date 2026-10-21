export class AppError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
