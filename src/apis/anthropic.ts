import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { outro } from "@clack/prompts";

import { getConfig } from "../commands/config";
import { outroError } from "../utils/prompts";

const config = getConfig();

const ANTHROPIC_API_KEY = config?.ANTHROPIC_API_KEY;
const MODEL = config?.MODEL ?? "claude-sonnet-4-6";

// ---------------------------------------------------------------------------
// Translation helpers: OpenAI format → Anthropic format
// ---------------------------------------------------------------------------

export function toAnthropicTools(
  tools: OpenAI.ChatCompletionTool[]
): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description ?? "",
    input_schema: tool.function.parameters as Anthropic.Tool.InputSchema,
  }));
}

export function toAnthropicMessages(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): { system: string; messages: Anthropic.MessageParam[] } {
  let system = "";
  const result: Anthropic.MessageParam[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "system") {
      system +=
        (system ? "\n" : "") +
        (typeof msg.content === "string" ? msg.content : "");
      continue;
    }

    if (msg.role === "user") {
      result.push({
        role: "user",
        content: typeof msg.content === "string" ? msg.content : "",
      });
      continue;
    }

    if (msg.role === "assistant") {
      const content: Anthropic.ContentBlockParam[] = [];

      if (msg.content) {
        content.push({
          type: "text",
          text: typeof msg.content === "string" ? msg.content : "",
        });
      }

      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          });
        }
      }

      result.push({ role: "assistant", content });
      continue;
    }

    if (msg.role === "tool") {
      // Collect consecutive tool-result messages into a single user turn.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      toolResults.push({
        type: "tool_result",
        tool_use_id: msg.tool_call_id!,
        content: typeof msg.content === "string" ? msg.content : "",
      });

      while (i + 1 < messages.length && messages[i + 1].role === "tool") {
        i++;
        const next =
          messages[i] as OpenAI.Chat.ChatCompletionToolMessageParam;
        toolResults.push({
          type: "tool_result",
          tool_use_id: next.tool_call_id!,
          content: typeof next.content === "string" ? next.content : "",
        });
      }

      result.push({ role: "user", content: toolResults });
      continue;
    }
  }

  return { system, messages: result };
}

// ---------------------------------------------------------------------------
// Translation helper: Anthropic response → OpenAI message format
// ---------------------------------------------------------------------------

export function toOpenAiMessage(
  response: Anthropic.Message
): OpenAI.Chat.Completions.ChatCompletionMessage {
  let textContent = "";
  const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] =
    [];

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      });
    }
  }

  return {
    role: "assistant",
    content: textContent || null,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  } as OpenAI.Chat.Completions.ChatCompletionMessage;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function createChatCompletion(
  messages: Array<OpenAI.Chat.ChatCompletionMessageParam>,
  tools: Array<OpenAI.ChatCompletionTool> = []
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
  if (!ANTHROPIC_API_KEY) {
    outro(
      "ANTHROPIC_API_KEY is not set. Run `aitdd config set ANTHROPIC_API_KEY <key>`."
    );
    outro("For help look into README https://github.com/403-html/AI-TDD#setup");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const { system, messages: anthropicMessages } =
    toAnthropicMessages(messages);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8096,
      system: system || undefined,
      messages: anthropicMessages,
      tools: toAnthropicTools(tools),
    });

    return toOpenAiMessage(response);
  } catch (error) {
    const err = error as Error;
    outroError(err.message);
    throw err;
  }
}

export const AnthropicApi = {
  createChatCompletion,
};
