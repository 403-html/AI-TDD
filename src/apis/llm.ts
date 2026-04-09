import OpenAI from "openai";

import { getConfig } from "../commands/config";
import { AnthropicApi } from "./anthropic";
import { OpenAiApi } from "./open-ai";

const config = getConfig();

function isClaudeModel(model: string): boolean {
  return model.startsWith("claude-");
}

async function createChatCompletion(
  messages: Array<OpenAI.Chat.ChatCompletionMessageParam>,
  tools: Array<OpenAI.ChatCompletionTool> = []
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
  const model = config?.MODEL ?? "gpt-4o";

  if (isClaudeModel(model)) {
    return AnthropicApi.createChatCompletion(messages, tools);
  }

  return OpenAiApi.createChatCompletion(messages, tools);
}

export const LlmApi = {
  createChatCompletion,
};
