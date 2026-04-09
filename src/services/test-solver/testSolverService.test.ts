import { describe, expect, test, mock, beforeEach } from "bun:test";
import type OpenAI from "openai";

// ---------------------------------------------------------------------------
// Mock interactive prompts, shell, and file I/O before loading the service.
// ---------------------------------------------------------------------------

const mockSelect = mock(async () => true);   // user always confirms
const mockIsCancel = mock(() => false);
const mockNote = mock(() => {});

mock.module("@clack/prompts", () => ({
  select: mockSelect,
  isCancel: mockIsCancel,
  note: mockNote,
}));

const mockExe = mock(async (_args: string[]) => ({
  stdout: "mock-stdout",
  stderr: "",
  exitCode: 0,
}));

mock.module("src/utils/shell", () => ({ exe: mockExe }));

const mockReadFileContent = mock(async (_path: string) => "file contents");
const mockWriteFile = mock(async (_path: string, _content: string) => {});

mock.module("../file-manipulator/fileManipulatorService", () => ({
  fileManipulator: {
    readFileContent: mockReadFileContent,
    writeFile: mockWriteFile,
  },
}));

// Also mock the agent so callTools tests don't trigger LLM calls
mock.module("../../ai-agents/test-solver", () => ({
  testSolverAgent: {
    solve: mock(async () => ({ role: "assistant", content: "ok" })),
  },
}));

const { testSolver } = await import("./testSolverService");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTool(
  name: string,
  args: Record<string, unknown>
): OpenAI.Chat.Completions.ChatCompletionMessageToolCall {
  return {
    id: `call_${name}`,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

// ---------------------------------------------------------------------------
// callTools — each tool branch
// ---------------------------------------------------------------------------

describe("TestSolverService.callTools", () => {
  beforeEach(() => {
    mockSelect.mockClear();
    mockExe.mockClear();
    mockReadFileContent.mockClear();
    mockWriteFile.mockClear();
  });

  // ── read_file ────────────────────────────────────────────────────────────

  describe("read_file", () => {
    test("calls readFileContent and returns its content", async () => {
      mockReadFileContent.mockImplementation(async () => "export const x = 1;");
      const [out] = await testSolver.callTools([
        makeTool("read_file", { filePath: "src/x.ts" }),
      ]);
      expect(mockReadFileContent).toHaveBeenCalledWith("src/x.ts");
      expect(out.name).toBe("read_file");
      expect(out.content).toBe("export const x = 1;");
      expect(out.callId).toBe("call_read_file");
    });

    test("returns 'File not found' message for a non-existent file", async () => {
      mockReadFileContent.mockImplementation(async () => null);
      const [out] = await testSolver.callTools([
        makeTool("read_file", { filePath: "missing.ts" }),
      ]);
      expect(out.content).toContain("File not found: missing.ts");
    });
  });

  // ── write_file ───────────────────────────────────────────────────────────

  describe("write_file", () => {
    test("calls writeFile and returns a success message", async () => {
      const [out] = await testSolver.callTools([
        makeTool("write_file", { filePath: "src/out.ts", content: "const y = 2;" }),
      ]);
      expect(mockWriteFile).toHaveBeenCalledWith("src/out.ts", "const y = 2;");
      expect(out.name).toBe("write_file");
      expect(out.content).toContain("written successfully");
      expect(out.content).toContain("src/out.ts");
    });
  });

  // ── grep ──────────────────────────────────────────────────────────────────

  describe("grep", () => {
    test("calls exe with pattern and filePath", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "match line", stderr: "", exitCode: 0 }));
      const [out] = await testSolver.callTools([
        makeTool("grep", { pattern: "export", filePath: "src/index.ts" }),
      ]);
      const [args] = mockExe.mock.calls[0];
      expect(args).toContain("grep");
      expect(args).toContain("export");
      expect(args).toContain("src/index.ts");
      expect(out.content).toBe("match line");
    });

    test("passes safe flags as separate array elements", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
      await testSolver.callTools([
        makeTool("grep", {
          pattern: "TODO",
          filePath: "src/utils.ts",
          flags: ["-r", "-n"],
        }),
      ]);
      const [args] = mockExe.mock.calls[0];
      // Flags are individual elements, not a joined string
      expect(args).toContain("-r");
      expect(args).toContain("-n");
    });

    test("strips unsafe flag strings", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
      await testSolver.callTools([
        makeTool("grep", {
          pattern: "x",
          filePath: "f.ts",
          // These do not match /^-[a-zA-Z]+$/ and must be dropped
          flags: ["-r", "--malicious", "badarg", "-n"],
        }),
      ]);
      const [args] = mockExe.mock.calls[0];
      expect(args).toContain("-r");
      expect(args).toContain("-n");
      expect(args).not.toContain("--malicious");
      expect(args).not.toContain("badarg");
    });

    test("works with no flags provided", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "ok", stderr: "", exitCode: 0 }));
      const [out] = await testSolver.callTools([
        makeTool("grep", { pattern: "foo", filePath: "bar.ts" }),
      ]);
      expect(out.content).toBe("ok");
    });
  });

  // ── find ──────────────────────────────────────────────────────────────────

  describe("find", () => {
    test("passes type=file as two separate args [-type, f]", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "src/foo.ts", stderr: "", exitCode: 0 }));
      await testSolver.callTools([
        makeTool("find", { directory: ".", namePattern: "*.ts", type: "file" }),
      ]);
      const [args] = mockExe.mock.calls[0];
      const typeIdx = args.indexOf("-type");
      expect(typeIdx).toBeGreaterThan(-1);
      expect(args[typeIdx + 1]).toBe("f");
      // Must NOT be a single "-type f" token
      expect(args).not.toContain("-type f");
    });

    test("passes type=directory as [-type, d]", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
      await testSolver.callTools([
        makeTool("find", { directory: "src", namePattern: "*", type: "directory" }),
      ]);
      const [args] = mockExe.mock.calls[0];
      const typeIdx = args.indexOf("-type");
      expect(typeIdx).toBeGreaterThan(-1);
      expect(args[typeIdx + 1]).toBe("d");
    });

    test("omits type args when type is not specified", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
      await testSolver.callTools([
        makeTool("find", { directory: ".", namePattern: "*.ts" }),
      ]);
      const [args] = mockExe.mock.calls[0];
      expect(args).not.toContain("-type");
    });

    test("returns stdout as content", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "src/a.ts\nsrc/b.ts", stderr: "", exitCode: 0 }));
      const [out] = await testSolver.callTools([
        makeTool("find", { directory: ".", namePattern: "*.ts", type: "file" }),
      ]);
      expect(out.content).toBe("src/a.ts\nsrc/b.ts");
    });
  });

  // ── awk ───────────────────────────────────────────────────────────────────

  describe("awk", () => {
    test("calls exe with pattern and filePath and returns stdout", async () => {
      mockExe.mockImplementation(async () => ({ stdout: "awk result", stderr: "", exitCode: 0 }));
      const [out] = await testSolver.callTools([
        makeTool("awk", { pattern: "{print $1}", filePath: "data.txt" }),
      ]);
      const [args] = mockExe.mock.calls[0];
      expect(args).toContain("awk");
      expect(args).toContain("{print $1}");
      expect(args).toContain("data.txt");
      expect(out.content).toBe("awk result");
    });
  });

  // ── unknown tool ──────────────────────────────────────────────────────────

  describe("unknown tool", () => {
    test("throws an error for an unsupported tool name", async () => {
      await expect(
        testSolver.callTools([makeTool("rm_rf", { path: "/" })])
      ).rejects.toThrow("Unsupported tool name: rm_rf");
    });
  });

  // ── multiple tools ────────────────────────────────────────────────────────

  describe("multiple tools in sequence", () => {
    test("processes all tools and returns one output per tool", async () => {
      mockReadFileContent.mockImplementation(async () => "existing content");
      mockWriteFile.mockImplementation(async () => {});

      const outputs = await testSolver.callTools([
        makeTool("read_file", { filePath: "src/a.ts" }),
        makeTool("write_file", { filePath: "src/a.ts", content: "new content" }),
      ]);

      expect(outputs).toHaveLength(2);
      expect(outputs[0].name).toBe("read_file");
      expect(outputs[1].name).toBe("write_file");
    });
  });
});
