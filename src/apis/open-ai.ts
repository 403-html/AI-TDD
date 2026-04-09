import OpenAI from "openai";

import { outro } from "@clack/prompts";

import { getConfig } from "../commands/config";
import { outroError } from "../utils/prompts";

const config = getConfig();

const OPENAI_API_KEY = config?.OPENAI_API_KEY;
const BASE_URL: string | undefined = config?.BASE_URL || undefined;
const MODEL = config?.MODEL;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY ?? "missing",
  baseURL: BASE_URL,
});

async function createChatCompletion(
  messages: Array<OpenAI.Chat.ChatCompletionMessageParam>,
  tools: Array<OpenAI.ChatCompletionTool> = []
): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
  if (!OPENAI_API_KEY) {
    outro(
      "OPENAI_API_KEY is not set. Run `aitdd config set OPENAI_API_KEY <key>`. For Anthropic models set ANTHROPIC_API_KEY instead."
    );
    outro("For help look into README https://github.com/403-html/AI-TDD#setup");
    process.exit(1);
  }

  const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model: MODEL ?? "gpt-4o",
    messages,
    tools,
    temperature: 1,
    top_p: 0.1,
  };

  try {
    const completion = await openai.chat.completions.create(params);
    return completion.choices[0].message;
  } catch (error) {
    const err = error as Error & { status?: number; error?: { message: string } };

    outroError(err.message);

    if (err.status === 401) {
      if (err.error?.message) outro(err.error.message);
      outro("For help look into README https://github.com/403-html/AI-TDD#setup");
    }

    throw err;
  }
}

export const OpenAiApi = {
  createChatCompletion,
};
