import { describe, expect, test, mock, beforeEach } from "bun:test";
import type OpenAI from "openai";

// ---------------------------------------------------------------------------
// Mock both provider APIs before loading the router.
// ---------------------------------------------------------------------------

const anthropicMock = mock(async () => ({
  role: "assistant" as const,
  content: "from-anthropic",
  tool_calls: undefined,
  refusal: null,
}));

const openaiMock = mock(async () => ({
  role: "assistant" as const,
  content: "from-openai",
  tool_calls: undefined,
  refusal: null,
}));

mock.module("./anthropic", () => ({
  AnthropicApi: { createChatCompletion: anthropicMock },
}));

mock.module("./open-ai", () => ({
  OpenAiApi: { createChatCompletion: openaiMock },
}));

const { LlmApi } = await import("./llm");

const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: "user", content: "hi" },
];

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

describe("LlmApi — provider routing", () => {
  beforeEach(() => {
    anthropicMock.mockClear();
    openaiMock.mockClear();
  });

  test("routes claude-* models to AnthropicApi", async () => {
    // The router reads the model from config at module load time.
    // Since we can't change the config mid-test we test the routing function
    // by spying on which mock gets called after overriding the model via env.
    // Instead, test the isClaudeModel logic indirectly: we verify
    // AnthropicApi.createChatCompletion receives the call for known claude names.

    // Patch the module-level config reference by re-importing with a new env.
    // The simplest testable path: create a fresh import with MODEL=claude-sonnet-4-6.
    process.env.MODEL = "claude-sonnet-4-6";
    const { LlmApi: ClaudeLlm } = await import("./llm?t=claude");
    await ClaudeLlm.createChatCompletion(messages, []);
    expect(anthropicMock).toHaveBeenCalledTimes(1);
    expect(openaiMock).toHaveBeenCalledTimes(0);
    delete process.env.MODEL;
  });

  test("routes non-claude models to OpenAiApi", async () => {
    process.env.MODEL = "gpt-4o";
    const { LlmApi: GptLlm } = await import("./llm?t=gpt");
    await GptLlm.createChatCompletion(messages, []);
    expect(openaiMock).toHaveBeenCalledTimes(1);
    expect(anthropicMock).toHaveBeenCalledTimes(0);
    delete process.env.MODEL;
  });

  test("routes gpt-5-codex to OpenAiApi", async () => {
    process.env.MODEL = "gpt-5-codex";
    const { LlmApi: CodexLlm } = await import("./llm?t=codex");
    await CodexLlm.createChatCompletion(messages, []);
    expect(openaiMock).toHaveBeenCalledTimes(1);
    expect(anthropicMock).toHaveBeenCalledTimes(0);
    delete process.env.MODEL;
  });

  test("passes messages and tools through to the chosen provider", async () => {
    process.env.MODEL = "gpt-4o";
    const { LlmApi: PassthroughLlm } = await import("./llm?t=passthrough");
    const tools: OpenAI.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "write_file",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
    ];
    await PassthroughLlm.createChatCompletion(messages, tools);
    expect(openaiMock).toHaveBeenCalledWith(messages, tools);
    delete process.env.MODEL;
  });
});
