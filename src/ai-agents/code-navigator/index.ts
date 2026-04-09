import OpenAI from "openai";

import { OpenAiApi } from "../../apis/open-ai";
import { spinner } from "@clack/prompts";

interface CodeImport {
  row: string;
  from: string;
}

class CodeNavigator {
  private getChatCompletionPrompt(
    imports: CodeImport[]
  ): Array<OpenAI.Chat.ChatCompletionMessageParam> {
    return [
      {
        role: "system",
        content: [
          "You are to write code that passes tests as per the Software TDD practice. I send you the test suite, and you write the code that passes it.",
          "DO NOT provide any explanations, strictly response with JSON in this format:",
          `FilesToAdjust {
              content: {
                row: string;
                action: "replace" | "append" | "prepend";
                with: string;
              };
              filePath: string;
            }[]`,
        ].join("\n"),
      },
      {
        role: "user",
        content: "123",
      },
    ];
  }

  async callOpenAi(imports: CodeImport[]) {
    const prompt = this.getChatCompletionPrompt(imports);
    const loader = spinner();

    try {
      loader.start("LLM is trying to solve the test");
      const res = await OpenAiApi.createChatCompletion(prompt);

      if (!res) {
        loader.stop("Something went wrong");
        return process.exit(1);
      } else {
        loader.stop("LLM got an idea, applying…");
      }

      const codeToAdjust = JSON.parse(res);

      // todo: validate the codeToAdjust structure with joi

      return codeToAdjust;
    } catch (error) {
      loader.stop("Something went wrong");
      return process.exit(1);
    }
  }

  async getCommandsToFindImportedMethods(imports: CodeImport[]) {
    // write code here, use awk command
  }
}

export const codeNavigator = new CodeNavigator();
