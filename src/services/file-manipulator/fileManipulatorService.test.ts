import { describe, expect, test, afterEach } from "bun:test";
import { join } from "node:path";
import { fileManipulator } from "./fileManipulatorService";

const sandbox = join(import.meta.dir, "../../../__tests__/sandbox");

// ---------------------------------------------------------------------------
// manipulateFileContent — pure synchronous logic
// ---------------------------------------------------------------------------

describe("manipulateFileContent", () => {
  const current = ["line1", "target", "line3"].join("\n");

  test("replace: swaps the matched line", () => {
    const result = fileManipulator.manipulateFileContent(current, {
      row: "target",
      action: "replace",
      with: "replaced",
    });
    expect(result).toBe(["line1", "replaced", "line3"].join("\n"));
  });

  test("append: inserts new line after the matched line", () => {
    const result = fileManipulator.manipulateFileContent(current, {
      row: "target",
      action: "append",
      with: "appended",
    });
    expect(result).toBe(["line1", "target", "appended", "line3"].join("\n"));
  });

  test("prepend: inserts new line before the matched line", () => {
    const result = fileManipulator.manipulateFileContent(current, {
      row: "target",
      action: "prepend",
      with: "prepended",
    });
    expect(result).toBe(["line1", "prepended", "target", "line3"].join("\n"));
  });

  test("leaves lines untouched when pattern is not found", () => {
    const result = fileManipulator.manipulateFileContent(current, {
      row: "no-match",
      action: "replace",
      with: "never",
    });
    expect(result).toBe(current);
  });

  test("throws UNKNOWN_CONTENT_ACTION for an invalid action", () => {
    expect(() =>
      fileManipulator.manipulateFileContent(current, {
        row: "target",
        action: "delete" as any,
        with: "",
      })
    ).toThrow("UNKNOWN_CONTENT_ACTION");
  });

  test("matches substrings within a line (includes semantics)", () => {
    const content = "const x = foo();";
    const result = fileManipulator.manipulateFileContent(content, {
      row: "foo()",
      action: "replace",
      with: "const x = bar();",
    });
    expect(result).toBe("const x = bar();");
  });

  test("handles empty file content gracefully", () => {
    const result = fileManipulator.manipulateFileContent("", {
      row: "anything",
      action: "replace",
      with: "new",
    });
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// I/O: readFileContent, writeFile, createFile
// ---------------------------------------------------------------------------

describe("readFileContent", () => {
  test("returns null for a non-existent file", async () => {
    const result = await fileManipulator.readFileContent(
      join(sandbox, "_does_not_exist_xyz.ts")
    );
    expect(result).toBeNull();
  });

  test("returns the file content as a string", async () => {
    const path = join(sandbox, "_read_test.txt");
    await Bun.write(path, "hello world");
    const content = await fileManipulator.readFileContent(path);
    expect(content).toBe("hello world");
    await Bun.file(path).exists() && (await Bun.write(path, ""));
  });
});

describe("writeFile", () => {
  test("writes new content to a file", async () => {
    const path = join(sandbox, "_write_test.txt");
    await fileManipulator.writeFile(path, "written content");
    const file = Bun.file(path);
    expect(await file.text()).toBe("written content");
  });

  test("overwrites existing content", async () => {
    const path = join(sandbox, "_overwrite_test.txt");
    await fileManipulator.writeFile(path, "first");
    await fileManipulator.writeFile(path, "second");
    expect(await Bun.file(path).text()).toBe("second");
  });
});

describe("createFile", () => {
  test("creates a new file with provided content", async () => {
    const path = join(sandbox, "_create_test.ts");
    await fileManipulator.createFile(path, "export const x = 1;");
    expect(await Bun.file(path).text()).toBe("export const x = 1;");
  });

  test("creates an empty file when no content is supplied", async () => {
    const path = join(sandbox, "_create_empty.ts");
    await fileManipulator.createFile(path);
    expect(await Bun.file(path).text()).toBe("");
  });
});
