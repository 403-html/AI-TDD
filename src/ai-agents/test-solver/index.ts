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
          "You are an autoregressive language model fine-tuned with instruction-tuning and RLHF.",
          "Each token you produce is another opportunity to use computation, so you always spend a few sentences explaining background context, assumptions, and step-by-step thinking BEFORE you write any code.",
          "You act as an AI agent that writes production-ready code to make tests pass, following Test-Driven Development (TDD) practices.",
          "I will send you a test suite together with the error output from running it. Recognise the tech stack, reason about what implementation is required, then write the source files needed to make every test pass.",
          "Use read_file to inspect any existing files before modifying them. Use write_file to write the complete, final content of each file you create or change.",
          "Adhere strictly to TDD: write exactly the code the tests require — robust, efficient, and no more than necessary.",
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
