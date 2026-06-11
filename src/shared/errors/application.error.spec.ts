import { describe, it, expect } from "vitest";
import {
  ApplicationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
} from "./application.error";

describe("ApplicationError hierarchy", () => {
  it("ApplicationError is an Error subclass with a code", () => {
    const err = new ApplicationError("oops", "MY_CODE");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("oops");
    expect(err.code).toBe("MY_CODE");
    expect(err.name).toBe("ApplicationError");
  });

  it("NotFoundError carries NOT_FOUND code and includes resource name", () => {
    const err = new NotFoundError("Flashcard");
    expect(err).toBeInstanceOf(ApplicationError);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toContain("Flashcard");
  });

  it("UnauthorizedError carries UNAUTHORIZED code", () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(ApplicationError);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message.length).toBeGreaterThan(0);
  });

  it("ConflictError carries CONFLICT code and custom message", () => {
    const err = new ConflictError("Email já está em uso");
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("Email já está em uso");
  });

  it("ValidationError carries VALIDATION code", () => {
    const err = new ValidationError("Campo obrigatório");
    expect(err.code).toBe("VALIDATION");
    expect(err.message).toBe("Campo obrigatório");
  });

  it("TooManyRequestsError exposes retryAfterSeconds", () => {
    const err = new TooManyRequestsError(30);
    expect(err.code).toBe("TOO_MANY_REQUESTS");
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.message).toContain("30");
  });

  // Mutation: all subclasses are instanceof ApplicationError
  it("every subclass is instanceof ApplicationError", () => {
    const errors = [
      new NotFoundError("X"),
      new UnauthorizedError(),
      new ConflictError("X"),
      new ValidationError("X"),
      new TooManyRequestsError(10),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(ApplicationError);
    }
  });

  // Mutation: codes must not be swapped between classes
  it("codes are correctly assigned to each error class", () => {
    expect(new NotFoundError("X").code).toBe("NOT_FOUND");
    expect(new UnauthorizedError().code).toBe("UNAUTHORIZED");
    expect(new ConflictError("X").code).toBe("CONFLICT");
    expect(new ValidationError("X").code).toBe("VALIDATION");
    expect(new TooManyRequestsError(5).code).toBe("TOO_MANY_REQUESTS");
  });
});
