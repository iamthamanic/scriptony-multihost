import { describe, expect, it } from "vitest";
import {
  LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
  isLocalDeleteConfirmationValid,
  normalizeLocalDeleteConfirmation,
} from "./local-project-delete-confirmation";

describe("local-project-delete-confirmation", () => {
  it("accepts delete case-insensitively", () => {
    expect(isLocalDeleteConfirmationValid("delete")).toBe(true);
    expect(isLocalDeleteConfirmationValid("DELETE")).toBe(true);
    expect(isLocalDeleteConfirmationValid("  Delete  ")).toBe(true);
  });

  it("rejects wrong or empty input", () => {
    expect(isLocalDeleteConfirmationValid("")).toBe(false);
    expect(isLocalDeleteConfirmationValid("projekt löschen")).toBe(false);
    expect(isLocalDeleteConfirmationValid("password123")).toBe(false);
  });

  it("normalizes to canonical phrase", () => {
    expect(normalizeLocalDeleteConfirmation("  DELETE  ")).toBe(
      LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
    );
  });
});
