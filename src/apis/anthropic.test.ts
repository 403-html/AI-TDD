import { describe, expect, test } from "bun:test";
import type OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import {
  toAnthropicTools,
  toAnthropicMessages,
  toOpenAiMessage,
} from "./anthropic";

// ---------------------------------------------------------------------------
// toAnthropicTools
// ---------------------------------------------------------------------------

describe("toAnthropicTools", () => {
  const openAiTool: OpenAI.ChatCompletionTool = {
    type: "function",
    function: {
      name: "write_file",
      description: "Write a file",
      parameters: {
        type: "object",
        properties: { filePath: { type: "string" }, content: { type: "string" } },
        required: ["filePath", "content"],
      },
    },
  };

  test("maps tool name and description", () => {
    const [result] = toAnthropicTools([openAiTool]);
    expect(result.name).toBe("write_file");
    expect(result.description).toBe("Write a file");
  });

  test("maps parameters as input_schema", () => {
    const [result] = toAnthropicTools([openAiTool]);
    expect((result.input_schema as any).type).toBe("object");
    expect((result.input_schema as any).properties).toBeDefined();
  });

  test("uses empty string for missing description", () => {
    const tool: OpenAI.ChatCompletionTool = {
      type: "function",
      function: {
        name: "no_desc",
        parameters: { type: "object", properties: {}, required: [] },
      },
    };
    const [result] = toAnthropicTools([tool]);
    expect(result.description).toBe("");
  });

  test("handles an empty tools array", () => {
    expect(toAnthropicTools([])).toEqual([]);
  });

  test("maps multiple tools", () => {
    const t2: OpenAI.ChatCompletionTool = {
      type: "function",
      function: {
        name: "read_file",
        description: "Read a file",
        parameters: { type: "object", properties: {}, required: [] },
      },
    };
    const results = toAnthropicTools([openAiTool, t2]);
    expect(results).toHaveLength(2);
    expect(results[1].name).toBe("read_file");
  });
});

// ---------------------------------------------------------------------------
// toAnthropicMessages
// ---------------------------------------------------------------------------

describe("toAnthropicMessages", () => {
  test("extracts system message as top-level system string", () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: "You are an assistant." },
      { role: "user", content: "Hello" },
    ];
    const { system, messages: result } = toAnthropicMessages(messages);
    expect(system).toBe("You are an assistant.");
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
  });

  test("concatenates multiple system messages", () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: "Part 1." },
      { role: "system", content: "Part 2." },
      { role: "user", content: "Hi" },
    ];
    const { system } = toAnthropicMessages(messages);
    expect(system).toBe("Part 1.\nPart 2.");
  });

  test("maps user messages directly", () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "user", content: "Hello there" },
    ];
    const { messages: result } = toAnthropicMessages(messages);
    expect(result[0]).toEqual({ role: "user", content: "Hello there" });
  });

  test("maps assistant text-only messages", () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "assistant", content: "Sure, here you go." },
    ];
    const { messages: result } = toAnthropicMessages(messages);
    expect(result[0].role).toBe("assistant");
    const content = result[0].content as Anthropic.ContentBlockParam[];
    expect(content[0]).toMatchObject({ type: "text", text: "Sure, here you go." });
  });

  test("maps assistant messages with tool_calls to tool_use blocks", () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "write_file", arguments: '{"filePath":"a.ts","content":"x"}' },
          },
        ],
      },
    ];
    const { messages: result } = toAnthropicMessages(messages);
    const content = result[0].content as Anthropic.ContentBlockParam[];
    expect(content[0]).toMatchObject({
      type: "tool_use",
      id: "call_1",
      name: "write_file",
      input: { filePath: "a.ts", content: "x" },
    });
  });

  test("batches consecutive tool messages into a single user turn", () => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "tool",
        tool_call_id: "call_1",
        content: "result 1",
      },
      {
        role: "tool",
        tool_call_id: "call_2",
        content: "result 2",
      },
    ];
    const { messages: result } = toAnthropicMessages(messages);
    // Both results should be in a single user turn
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe("user");
    const content = result[0].content as Anthropic.ToolResultBlockParam[];
    expect(content).toHaveLength(2);
    expect(content[0]).toMatchObject({ type: "tool_result", tool_use_id: "call_1", content: "result 1" });
    expect(content[1]).toMatchObject({ type: "tool_result", tool_use_id: "call_2", content: "result 2" });
  });

  test("returns empty system and messages for an empty input", () => {
    const { system, messages: result } = toAnthropicMessages([]);
    expect(system).toBe("");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// toOpenAiMessage
// ---------------------------------------------------------------------------

describe("toOpenAiMessage", () => {
  function makeResponse(content: Anthropic.ContentBlock[]): Anthropic.Message {
    return {
      id: "msg_1",
      type: "message",
      role: "assistant",
      content,
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 20 },
    };
  }

  test("maps a text-only response to content string", () => {
    const response = makeResponse([{ type: "text", text: "Hello!" }]);
    const msg = toOpenAiMessage(response);
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe("Hello!");
    expect(msg.tool_calls).toBeUndefined();
  });

  test("maps a tool_use block to tool_calls array", () => {
    const response = makeResponse([
      {
        type: "tool_use",
        id: "call_abc",
        name: "write_file",
        input: { filePath: "foo.ts", content: "export {}" },
      },
    ]);
    const msg = toOpenAiMessage(response);
    expect(msg.content).toBeNull();
    expect(msg.tool_calls).toHaveLength(1);
    expect(msg.tool_calls![0]).toMatchObject({
      id: "call_abc",
      type: "function",
      function: {
        name: "write_file",
        arguments: JSON.stringify({ filePath: "foo.ts", content: "export {}" }),
      },
    });
  });

  test("maps mixed text + tool_use blocks", () => {
    const response = makeResponse([
      { type: "text", text: "Here is the file:" },
      {
        type: "tool_use",
        id: "call_1",
        name: "write_file",
        input: { filePath: "a.ts", content: "" },
      },
    ]);
    const msg = toOpenAiMessage(response);
    expect(msg.content).toBe("Here is the file:");
    expect(msg.tool_calls).toHaveLength(1);
  });

  test("concatenates multiple text blocks", () => {
    const response = makeResponse([
      { type: "text", text: "Part 1 " },
      { type: "text", text: "Part 2" },
    ]);
    const msg = toOpenAiMessage(response);
    expect(msg.content).toBe("Part 1 Part 2");
  });

  test("returns null content when there are only tool_use blocks", () => {
    const response = makeResponse([
      {
        type: "tool_use",
        id: "c1",
        name: "read_file",
        input: { filePath: "x.ts" },
      },
    ]);
    const msg = toOpenAiMessage(response);
    // empty string becomes null
    expect(msg.content).toBeNull();
  });

  test("returns undefined tool_calls when there are no tool_use blocks", () => {
    const response = makeResponse([{ type: "text", text: "Done." }]);
    const msg = toOpenAiMessage(response);
    expect(msg.tool_calls).toBeUndefined();
  });
});
