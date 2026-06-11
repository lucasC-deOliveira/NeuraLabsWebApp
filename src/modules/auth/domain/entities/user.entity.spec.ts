import { describe, it, expect } from "vitest";
import { User } from "./user.entity";

const baseProps = {
  id: "user-1",
  name: "Lucas",
  email: "lucas@example.com",
  passwordHash: "hash123",
  createdAt: new Date("2024-01-01"),
  lastAccessAt: null,
};

describe("User entity", () => {
  it("exposes all props via getters", () => {
    const user = User.create(baseProps);
    expect(user.id).toBe("user-1");
    expect(user.name).toBe("Lucas");
    expect(user.email).toBe("lucas@example.com");
    expect(user.passwordHash).toBe("hash123");
    expect(user.createdAt).toEqual(new Date("2024-01-01"));
    expect(user.lastAccessAt).toBeNull();
  });

  it("exposes lastAccessAt when set", () => {
    const last = new Date("2024-06-01");
    const user = User.create({ ...baseProps, lastAccessAt: last });
    expect(user.lastAccessAt).toEqual(last);
  });

  it("toPublicProfile omits passwordHash", () => {
    const user = User.create(baseProps);
    const profile = user.toPublicProfile();
    expect(profile).toEqual({ id: "user-1", name: "Lucas", email: "lucas@example.com" });
    expect("passwordHash" in profile).toBe(false);
  });

  it("two users with different ids are independent", () => {
    const a = User.create({ ...baseProps, id: "a" });
    const b = User.create({ ...baseProps, id: "b" });
    expect(a.id).not.toBe(b.id);
  });
});
