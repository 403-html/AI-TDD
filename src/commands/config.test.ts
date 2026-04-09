import { describe, expect, test, spyOn, beforeEach, afterEach } from "bun:test";
import { CONFIG_KEYS, DEFAULT_MODEL, configValidators } from "./config";

// Silence outroError output during failure-path tests by suppressing
// @clack/prompts writes to stdout.
let stdoutSpy: ReturnType<typeof spyOn>;
let exitSpy: ReturnType<typeof spyOn>;

function stubExitAndOutput() {
  // Prevent process.exit from actually exiting; make it throw instead so
  // expect(...).toThrow() can catch it.
  exitSpy = spyOn(process, "exit").mockImplementation(
    (() => {
      throw new Error("process.exit called");
    }) as never
  );
  // Silence @clack/prompts stdout output.
  stdoutSpy = spyOn(process.stdout, "write").mockImplementation(
    (() => true) as never
  );
}

function restoreExitAndOutput() {
  exitSpy?.mockRestore();
  stdoutSpy?.mockRestore();
}

// ---------------------------------------------------------------------------
// DEFAULT_MODEL
// ---------------------------------------------------------------------------

describe("DEFAULT_MODEL", () => {
  test("is gpt-4o", () => {
    expect(DEFAULT_MODEL).toBe("gpt-4o");
  });
});

// ---------------------------------------------------------------------------
// OPENAI_API_KEY validator
// ---------------------------------------------------------------------------

describe("configValidators.OPENAI_API_KEY", () => {
  afterEach(restoreExitAndOutput);

  test("returns the key unchanged for any non-empty value", () => {
    expect(configValidators[CONFIG_KEYS.OPENAI_API_KEY]("sk-test")).toBe("sk-test");
    // Keys without sk- prefix are valid (Ollama, OpenRouter)
    expect(configValidators[CONFIG_KEYS.OPENAI_API_KEY]("ollama")).toBe("ollama");
    expect(configValidators[CONFIG_KEYS.OPENAI_API_KEY]("or-key-abc")).toBe("or-key-abc");
  });

  test("calls process.exit for an empty string", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.OPENAI_API_KEY]("")).toThrow(
      "process.exit called"
    );
  });

  test("calls process.exit for null", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.OPENAI_API_KEY](null)).toThrow(
      "process.exit called"
    );
  });
});

// ---------------------------------------------------------------------------
// ANTHROPIC_API_KEY validator
// ---------------------------------------------------------------------------

describe("configValidators.ANTHROPIC_API_KEY", () => {
  afterEach(restoreExitAndOutput);

  test("returns the key unchanged for a non-empty value", () => {
    expect(configValidators[CONFIG_KEYS.ANTHROPIC_API_KEY]("sk-ant-abc")).toBe(
      "sk-ant-abc"
    );
  });

  test("calls process.exit for an empty string", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.ANTHROPIC_API_KEY]("")).toThrow(
      "process.exit called"
    );
  });
});

// ---------------------------------------------------------------------------
// BASE_URL validator
// ---------------------------------------------------------------------------

describe("configValidators.BASE_URL", () => {
  afterEach(restoreExitAndOutput);

  test("returns the URL unchanged for a non-empty string", () => {
    expect(
      configValidators[CONFIG_KEYS.BASE_URL]("http://localhost:11434/v1")
    ).toBe("http://localhost:11434/v1");
    expect(
      configValidators[CONFIG_KEYS.BASE_URL]("https://openrouter.ai/api/v1")
    ).toBe("https://openrouter.ai/api/v1");
  });

  test("calls process.exit for an empty string", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.BASE_URL]("")).toThrow(
      "process.exit called"
    );
  });

  test("calls process.exit for a non-string value", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.BASE_URL](42)).toThrow(
      "process.exit called"
    );
  });
});

// ---------------------------------------------------------------------------
// MODEL validator
// ---------------------------------------------------------------------------

describe("configValidators.MODEL", () => {
  afterEach(restoreExitAndOutput);

  test("accepts current OpenAI models", () => {
    expect(configValidators[CONFIG_KEYS.MODEL]("gpt-4o")).toBe("gpt-4o");
    expect(configValidators[CONFIG_KEYS.MODEL]("gpt-4o-mini")).toBe("gpt-4o-mini");
    expect(configValidators[CONFIG_KEYS.MODEL]("gpt-4.1")).toBe("gpt-4.1");
    expect(configValidators[CONFIG_KEYS.MODEL]("gpt-5-codex")).toBe("gpt-5-codex");
    expect(configValidators[CONFIG_KEYS.MODEL]("o3")).toBe("o3");
    expect(configValidators[CONFIG_KEYS.MODEL]("o4-mini")).toBe("o4-mini");
  });

  test("accepts Anthropic Claude models", () => {
    expect(configValidators[CONFIG_KEYS.MODEL]("claude-sonnet-4-6")).toBe(
      "claude-sonnet-4-6"
    );
    expect(configValidators[CONFIG_KEYS.MODEL]("claude-sonnet-4-5")).toBe(
      "claude-sonnet-4-5"
    );
    expect(configValidators[CONFIG_KEYS.MODEL]("claude-opus-4-5")).toBe(
      "claude-opus-4-5"
    );
    expect(configValidators[CONFIG_KEYS.MODEL]("claude-haiku-4-5")).toBe(
      "claude-haiku-4-5"
    );
  });

  test("accepts Ollama / local models", () => {
    expect(configValidators[CONFIG_KEYS.MODEL]("qwen3:30b")).toBe("qwen3:30b");
    expect(configValidators[CONFIG_KEYS.MODEL]("qwen3:7b")).toBe("qwen3:7b");
    expect(configValidators[CONFIG_KEYS.MODEL]("deepseek-coder-v2")).toBe(
      "deepseek-coder-v2"
    );
    expect(configValidators[CONFIG_KEYS.MODEL]("codellama")).toBe("codellama");
  });

  test("accepts any arbitrary non-empty model name (open-ended validator)", () => {
    expect(configValidators[CONFIG_KEYS.MODEL]("some-future-model-2030")).toBe(
      "some-future-model-2030"
    );
  });

  test("calls process.exit for an empty string", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.MODEL]("")).toThrow(
      "process.exit called"
    );
  });
});

// ---------------------------------------------------------------------------
// LANGUAGE validator
// ---------------------------------------------------------------------------

describe("configValidators.LANGUAGE", () => {
  afterEach(restoreExitAndOutput);

  test("returns the canonical locale key for known values", () => {
    expect(configValidators[CONFIG_KEYS.LANGUAGE]("en")).toBe("en");
    expect(configValidators[CONFIG_KEYS.LANGUAGE]("English")).toBe("en");
    expect(configValidators[CONFIG_KEYS.LANGUAGE]("de")).toBe("de");
    expect(configValidators[CONFIG_KEYS.LANGUAGE]("fr")).toBe("fr");
    expect(configValidators[CONFIG_KEYS.LANGUAGE]("ja")).toBe("ja");
    expect(configValidators[CONFIG_KEYS.LANGUAGE]("ru")).toBe("ru");
  });

  test("calls process.exit for an unsupported language", () => {
    stubExitAndOutput();
    expect(() => configValidators[CONFIG_KEYS.LANGUAGE]("xyz")).toThrow(
      "process.exit called"
    );
  });
});

// ---------------------------------------------------------------------------
// RUN_TESTS validator
// ---------------------------------------------------------------------------

describe("configValidators.RUN_TESTS", () => {
  test("returns the command string unchanged", () => {
    expect(configValidators[CONFIG_KEYS.RUN_TESTS]("npm run test")).toBe(
      "npm run test"
    );
    expect(configValidators[CONFIG_KEYS.RUN_TESTS]("bun test")).toBe("bun test");
    expect(configValidators[CONFIG_KEYS.RUN_TESTS]("jest --runInBand")).toBe(
      "jest --runInBand"
    );
  });
});
