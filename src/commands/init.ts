import { intro, outro } from "@clack/prompts";
import { command } from "cleye";
import { COMMANDS } from "./enums";

export const initCommand = command(
  {
    name: COMMANDS.init,
  },
  async (argv) => {
    intro("aitdd is initializing 🐣");

    // TODO

    outro("Initialization finished 🐥");
  }
);
