import { describe, expect, test } from "bun:test";
import { call } from "./call";

describe("call", () => {
  test("returns [data, null] on a resolved promise", async () => {
    const [data, err] = await call(Promise.resolve(42));
    expect(data).toBe(42);
    expect(err).toBeNull();
  });

  test("returns [null, Error] on a rejected promise", async () => {
    const [data, err] = await call(Promise.reject(new Error("boom")));
    expect(data).toBeNull();
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toBe("boom");
  });

  test("re-throws non-Error throwables", async () => {
    await expect(
      call(new Promise((_, reject) => reject("string-error")))
    ).rejects.toBe("string-error");
  });

  test("preserves resolved value type for objects", async () => {
    const obj = { a: 1, b: "c" };
    const [data, err] = await call(Promise.resolve(obj));
    expect(data).toEqual(obj);
    expect(err).toBeNull();
  });

  test("preserves resolved value for null", async () => {
    const [data, err] = await call(Promise.resolve(null));
    expect(data).toBeNull();
    expect(err).toBeNull();
  });
});
