import { describe, expect, test, mock, beforeEach } from "bun:test";
import type OpenAI from "openai";

// ---------------------------------------------------------------------------
// Mock LlmApi before the module under test is loaded.
// ---------------------------------------------------------------------------

const mockCreate = mock(
  async (): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> => ({
    role: "assistant",
    content: "mock response",
    tool_calls: undefined,
    refusal: null,
  })
);

mock.module("../../apis/llm", () => ({
  LlmApi: { createChatCompletion: mockCreate },
}));

const { testSolverAgent } = await import("./index");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capturedMessages(): OpenAI.Chat.ChatCompletionMessageParam[] {
  const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1];
  return lastCall[0] as OpenAI.Chat.ChatCompletionMessageParam[];
}

function capturedTools(): OpenAI.ChatCompletionTool[] {
  const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1];
  return lastCall[1] as OpenAI.ChatCompletionTool[];
}

function systemContent(): string {
  const msgs = capturedMessages();
  const sys = msgs.find((m) => m.role === "system");
  return typeof sys?.content === "string" ? sys.content : "";
}

function userContent(): string {
  const msgs = capturedMessages();
  const user = msgs.find((m) => m.role === "user");
  return typeof user?.content === "string" ? user.content : "";
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

describe("TestSolverAgent — system prompt", () => {
  beforeEach(() => mockCreate.mockClear());

  test("preserves autoregressive framing", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    expect(systemContent()).toContain("autoregressive");
  });

  test("mentions RLHF fine-tuning", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    expect(systemContent()).toContain("RLHF");
  });

  test("instructs step-by-step thinking before writing code", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    const content = systemContent();
    expect(content).toMatch(/step-by-step|step by step/i);
  });

  test("frames the task as writing code to make tests pass (not just fixing failures)", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    const content = systemContent();
    expect(content).toMatch(/write.*code|writing.*code|code.*pass|make.*tests pass/i);
  });

  test("references TDD practices", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    expect(systemContent()).toContain("TDD");
  });

  test("instructs the model to use read_file before modifying", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    expect(systemContent()).toContain("read_file");
  });

  test("instructs the model to use write_file for complete file content", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "some error",
    });
    expect(systemContent()).toContain("write_file");
  });
});

// ---------------------------------------------------------------------------
// User prompt
// ---------------------------------------------------------------------------

describe("TestSolverAgent — user prompt", () => {
  beforeEach(() => mockCreate.mockClear());

  test("includes the test file path", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "src/foo.test.ts", code: "test body" },
      error: "Error: expected 1",
    });
    expect(userContent()).toContain("src/foo.test.ts");
  });

  test("includes the test file code", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "describe('x', ...)" },
      error: "some err",
    });
    expect(userContent()).toContain("describe('x', ...)");
  });

  test("includes the error output", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "TypeError: cannot read property 'x'",
    });
    expect(userContent()).toContain("TypeError: cannot read property 'x'");
  });

  test("includes relevant file paths and code when provided", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "err",
      relevantFiles: [{ path: "src/helper.ts", code: "export const x = 1;" }],
    });
    const content = userContent();
    expect(content).toContain("src/helper.ts");
    expect(content).toContain("export const x = 1;");
  });

  test("ends with 'Make the tests pass.'", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "err",
    });
    expect(userContent().trim()).toEndWith("Make the tests pass.");
  });

  test("merges extra context messages into the chat", async () => {
    const context: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "assistant", content: "previous response" },
    ];
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "test code" },
      error: "err",
      context,
    });
    const msgs = capturedMessages();
    expect(msgs.some((m) => m.role === "assistant" && m.content === "previous response")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tools registered
// ---------------------------------------------------------------------------

describe("TestSolverAgent — registered tools", () => {
  beforeEach(() => mockCreate.mockClear());

  test("registers awk, grep, find, read_file, write_file tools", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "code" },
      error: "err",
    });
    const toolNames = capturedTools().map((t) => t.function.name);
    expect(toolNames).toContain("awk");
    expect(toolNames).toContain("grep");
    expect(toolNames).toContain("find");
    expect(toolNames).toContain("read_file");
    expect(toolNames).toContain("write_file");
  });

  test("does NOT register the old write_code tool", async () => {
    await testSolverAgent.callLlm({
      testFile: { path: "foo.test.ts", code: "code" },
      error: "err",
    });
    const toolNames = capturedTools().map((t) => t.function.name);
    expect(toolNames).not.toContain("write_code");
  });
});

