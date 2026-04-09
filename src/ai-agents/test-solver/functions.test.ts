import { describe, expect, test } from "bun:test";
import { FUNCTIONS } from "./functions";

describe("FUNCTIONS schema", () => {
  const requiredShape = (fn: any) => {
    expect(typeof fn.name).toBe("string");
    expect(fn.name.length).toBeGreaterThan(0);
    expect(typeof fn.description).toBe("string");
    expect(fn.description.length).toBeGreaterThan(0);
    expect(fn.parameters).toBeDefined();
    expect(fn.parameters.type).toBe("object");
    expect(fn.parameters.properties).toBeDefined();
    expect(Array.isArray(fn.parameters.required)).toBe(true);
  };

  test("AWK has the required shape", () => {
    requiredShape(FUNCTIONS.AWK);
    expect(FUNCTIONS.AWK.name).toBe("awk");
    expect(FUNCTIONS.AWK.parameters.required).toContain("pattern");
    expect(FUNCTIONS.AWK.parameters.required).toContain("filePath");
  });

  test("GREP has the required shape", () => {
    requiredShape(FUNCTIONS.GREP);
    expect(FUNCTIONS.GREP.name).toBe("grep");
    expect(FUNCTIONS.GREP.parameters.required).toContain("pattern");
    expect(FUNCTIONS.GREP.parameters.required).toContain("filePath");
    // flags is optional
    expect(FUNCTIONS.GREP.parameters.required).not.toContain("flags");
  });

  test("FIND has the required shape", () => {
    requiredShape(FUNCTIONS.FIND);
    expect(FUNCTIONS.FIND.name).toBe("find");
    expect(FUNCTIONS.FIND.parameters.required).toContain("directory");
    expect(FUNCTIONS.FIND.parameters.required).toContain("namePattern");
    // type has an enum
    expect(FUNCTIONS.FIND.parameters.properties.type.enum).toEqual([
      "file",
      "directory",
    ]);
  });

  test("READ_FILE has the required shape", () => {
    requiredShape(FUNCTIONS.READ_FILE);
    expect(FUNCTIONS.READ_FILE.name).toBe("read_file");
    expect(FUNCTIONS.READ_FILE.parameters.required).toContain("filePath");
  });

  test("WRITE_FILE has the required shape", () => {
    requiredShape(FUNCTIONS.WRITE_FILE);
    expect(FUNCTIONS.WRITE_FILE.name).toBe("write_file");
    expect(FUNCTIONS.WRITE_FILE.parameters.required).toContain("filePath");
    expect(FUNCTIONS.WRITE_FILE.parameters.required).toContain("content");
  });

  test("WRITE_CODE is no longer present (replaced by READ_FILE + WRITE_FILE)", () => {
    expect((FUNCTIONS as any).WRITE_CODE).toBeUndefined();
  });

  test("all tool names are unique", () => {
    const names = Object.values(FUNCTIONS).map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
