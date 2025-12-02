export class ConnectCodeNotFoundError extends Error {
  constructor() {
    super("Invalid connect code");
    this.name = "ConnectCodeNotFoundError";
  }
}

export class ConnectCodeExpiredError extends Error {
  constructor() {
    super("Connect code has expired");
    this.name = "ConnectCodeExpiredError";
  }
}

export class ConnectCodeAlreadyUsedError extends Error {
  constructor() {
    super("Connect code has already been used");
    this.name = "ConnectCodeAlreadyUsedError";
  }
}

export class LineUserIdAlreadyConnectedError extends Error {
  constructor() {
    super("This LINE account is already connected to another client");
    this.name = "LineUserIdAlreadyConnectedError";
  }
}

export class RateLimitExceededError extends Error {
  public retryAfter: number;

  constructor(retryAfter: number) {
    super("Too many connection attempts. Please try again later.");
    this.name = "RateLimitExceededError";
    this.retryAfter = retryAfter;
  }
}

export class InvalidPhoneOrContractError extends Error {
  constructor() {
    super("Invalid mobile phone number or contract number");
    this.name = "InvalidPhoneOrContractError";
  }
}
