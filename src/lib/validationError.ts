/** Shared by authoritative catalogue, destination and pricing validation. */
export class ValidationError extends Error {
  code: string;
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}
