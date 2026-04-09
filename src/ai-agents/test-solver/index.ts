import OpenAI from "openai";

import { spinner } from "@clack/prompts";
import { LlmApi } from "../../apis/llm";
import { FileWithCode } from "../../types";
import { FUNCTIONS } from "./functions";

interface Props {
  testFile: FileWithCode;
  relevantFiles?: FileWithCode[];
  error: string;
  context?: Array<OpenAI.Chat.ChatCompletionMessageParam>;
}

class TestSolverAgent {
  private getChatCompletionPrompt(
    test: FileWithCode,
    error: string,
    files: FileWithCode[] = []
  ): Array<OpenAI.Chat.ChatCompletionMessageParam> {
    return [
      {
        role: "system",
        content: [
          "You are an AI agent that solves failing tests as per Test-Driven Development (TDD) practices.",
          "I will send you a test suite and the error output from running it.",
          "Your job is to write or update source files so that all tests pass.",
          "Use read_file to inspect existing files before writing. Use write_file to write the complete content of each file you create or modify.",
          "Adhere strictly to TDD: only write the code needed to pass the tests — no more.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `Below is the '${test.path}' content:`,
          "```",
          test.code,
          "```",
          "",
          `This is a stderr for the '${test.path}' run:`,
          "```",
          error,
          "```",
          "",
          ...files.map((file) => [
            `This is the '${file.path}' content:`,
            "```",
            file.code,
            "```",
            "",
          ]),
          "",
          "Make the tests pass.",
        ].join("\n"),
      },
    ];
  }

  async callLlm({ testFile, relevantFiles, error, context = [] }: Props) {
    const prompt = this.getChatCompletionPrompt(testFile, error, relevantFiles);

    const chat = [...prompt, ...context];

    const message = await LlmApi.createChatCompletion(chat, [
      {
        type: "function",
        function: FUNCTIONS.AWK,
      },
      {
        type: "function",
        function: FUNCTIONS.GREP,
      },
      {
        type: "function",
        function: FUNCTIONS.FIND,
      },
      {
        type: "function",
        function: FUNCTIONS.READ_FILE,
      },
      {
        type: "function",
        function: FUNCTIONS.WRITE_FILE,
      },
    ]);

    return message;
  }

  async solve({
    testFile,
    relevantFiles = [],
    error,
    context = [],
  }: Props): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
    const loader = spinner();

    try {
      loader.start("AI is solving the test");
      const message = await this.callLlm({
        testFile,
        relevantFiles,
        error,
        context,
      });

      loader.stop("AI has an idea, applying 🔧🪛🔨");

      // TODO: stream to stdout
      if (message.content) console.info(message.content);

      return message;
    } catch (error) {
      loader.stop("Something went wrong");
      return process.exit(1);
    }
  }
}

export const testSolverAgent = new TestSolverAgent();
