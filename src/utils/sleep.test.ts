import { describe, expect, test } from "bun:test";
import { sleep } from "./sleep";

describe("sleep", () => {
  test("resolves after approximately the given delay", async () => {
    const start = Date.now();
    await sleep(30);
    expect(Date.now() - start).toBeGreaterThanOrEqual(25);
  });

  test("resolves immediately with a 0 ms delay", async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});
