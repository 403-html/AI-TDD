import { describe, expect, test } from "bun:test";
import type OpenAI from "openai";
import { buildTestSolverPrompt, TEST_SOLVER_TOOLS } from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function systemContent(
  msgs: OpenAI.Chat.ChatCompletionMessageParam[]
): string {
  const sys = msgs.find((m) => m.role === "system");
  return typeof sys?.content === "string" ? sys.content : "";
}

function userContent(
  msgs: OpenAI.Chat.ChatCompletionMessageParam[]
): string {
  const user = msgs.find((m) => m.role === "user");
  return typeof user?.content === "string" ? user.content : "";
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

describe("buildTestSolverPrompt — system prompt", () => {
  const msgs = buildTestSolverPrompt(
    { path: "foo.test.ts", code: "test code" },
    "some error"
  );

  test("preserves autoregressive framing", () => {
    expect(systemContent(msgs)).toContain("autoregressive");
  });

  test("mentions RLHF fine-tuning", () => {
    expect(systemContent(msgs)).toContain("RLHF");
  });

  test("instructs step-by-step thinking before writing code", () => {
    expect(systemContent(msgs)).toMatch(/step-by-step|step by step/i);
  });

  test("frames the task as writing code to make tests pass", () => {
    expect(systemContent(msgs)).toMatch(
      /write.*code|writing.*code|code.*pass|make.*tests pass/i
    );
  });

  test("references TDD practices", () => {
    expect(systemContent(msgs)).toContain("TDD");
  });

  test("instructs the model to use read_file before modifying", () => {
    expect(systemContent(msgs)).toContain("read_file");
  });

  test("instructs the model to use write_file for complete file content", () => {
    expect(systemContent(msgs)).toContain("write_file");
  });
});

// ---------------------------------------------------------------------------
// User prompt
// ---------------------------------------------------------------------------

describe("buildTestSolverPrompt — user prompt", () => {
  test("includes the test file path", () => {
    const msgs = buildTestSolverPrompt(
      { path: "src/foo.test.ts", code: "test body" },
      "Error: expected 1"
    );
    expect(userContent(msgs)).toContain("src/foo.test.ts");
  });

  test("includes the test file code", () => {
    const msgs = buildTestSolverPrompt(
      { path: "foo.test.ts", code: "describe('x', ...)" },
      "some err"
    );
    expect(userContent(msgs)).toContain("describe('x', ...)");
  });

  test("includes the error output", () => {
    const msgs = buildTestSolverPrompt(
      { path: "foo.test.ts", code: "test code" },
      "TypeError: cannot read property 'x'"
    );
    expect(userContent(msgs)).toContain("TypeError: cannot read property 'x'");
  });

  test("includes relevant file paths and code when provided", () => {
    const msgs = buildTestSolverPrompt(
      { path: "foo.test.ts", code: "test code" },
      "err",
      [{ path: "src/helper.ts", code: "export const x = 1;" }]
    );
    expect(userContent(msgs)).toContain("src/helper.ts");
    expect(userContent(msgs)).toContain("export const x = 1;");
  });

  test("includes multiple relevant files", () => {
    const msgs = buildTestSolverPrompt(
      { path: "foo.test.ts", code: "test code" },
      "err",
      [
        { path: "src/a.ts", code: "const a = 1;" },
        { path: "src/b.ts", code: "const b = 2;" },
      ]
    );
    const uc = userContent(msgs);
    expect(uc).toContain("src/a.ts");
    expect(uc).toContain("src/b.ts");
  });

  test("ends with 'Make the tests pass.'", () => {
    const msgs = buildTestSolverPrompt(
      { path: "foo.test.ts", code: "test code" },
      "err"
    );
    expect(userContent(msgs).trim()).toEndWith("Make the tests pass.");
  });

  test("produces exactly system + user messages (no extras)", () => {
    const msgs = buildTestSolverPrompt(
      { path: "foo.test.ts", code: "test code" },
      "err"
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });
});

// ---------------------------------------------------------------------------
// Tools registered
// ---------------------------------------------------------------------------

describe("TEST_SOLVER_TOOLS", () => {
  const toolNames = TEST_SOLVER_TOOLS.map((t) => t.function.name);

  test("registers awk, grep, find, read_file, write_file", () => {
    expect(toolNames).toContain("awk");
    expect(toolNames).toContain("grep");
    expect(toolNames).toContain("find");
    expect(toolNames).toContain("read_file");
    expect(toolNames).toContain("write_file");
  });

  test("does NOT register the old write_code tool", () => {
    expect(toolNames).not.toContain("write_code");
  });

  test("all tools have type 'function'", () => {
    TEST_SOLVER_TOOLS.forEach((t) => expect(t.type).toBe("function"));
  });
});


