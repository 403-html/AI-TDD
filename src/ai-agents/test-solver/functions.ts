export const FUNCTIONS = {
  AWK: {
    name: "awk",
    description: "Search and process text in a file or input using AWK",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "The AWK pattern to search for",
        },
        filePath: {
          type: "string",
          description: "The relative file path to search for",
        },
      },
      required: ["pattern", "filePath"],
    },
  },

  GREP: {
    name: "grep",
    description: "Search for a pattern in text or files using grep",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "The regex pattern to search for",
        },
        filePath: {
          type: "string",
          description: "The relative file path to search for",
        },
        flags: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Optional flags to modify the grep behavior",
        },
      },
      required: ["pattern", "filePath"],
    },
  },

  FIND: {
    name: "find",
    description: "Locate files in a directory hierarchy",
    parameters: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description:
            "The starting point directory for the search, default is pwd",
        },
        namePattern: {
          type: "string",
          description: "Pattern to match file or directory names",
        },
        type: {
          type: "string",
          enum: ["file", "directory"],
          description: "Specify the type to search for",
        },
      },
      required: ["directory", "namePattern"],
    },
  },

  READ_FILE: {
    name: "read_file",
    description:
      "Read the full contents of a file. Use this to inspect existing code before making changes.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The relative or absolute path of the file to read",
        },
      },
      required: ["filePath"],
    },
  },

  WRITE_FILE: {
    name: "write_file",
    description:
      "Write the complete contents of a file, creating it if it does not exist. Always provide the entire file — do not use partial snippets.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "The relative or absolute path of the file to write",
        },
        content: {
          type: "string",
          description: "The full source code to write to the file",
        },
      },
      required: ["filePath", "content"],
    },
  },
};

