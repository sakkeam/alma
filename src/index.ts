import "dotenv/config";
import { VoltAgent, VoltOpsClient, Agent, Memory, MCPConfiguration } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { honoServer } from "@voltagent/server-hono";
import { expenseApprovalWorkflow } from "./workflows";

// Create a logger instance
const logger = createPinoLogger({
  name: "alma",
  level: "info",
});

// Configure persistent memory (LibSQL / SQLite)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
});

const mcpConfig = new MCPConfiguration({
  servers: {
    playwright: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@playwright/mcp@latest",
      ],
    },
  },
});

const toolsets = await mcpConfig.getToolsets();

const agent = new Agent({
  name: "alma",
  instructions: "A helpful assistant that can check weather and help with various tasks",
  model: openrouter("z-ai/glm-4.5"),
  tools: [...toolsets.playwright.getTools()],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },
  workflows: {
    expenseApprovalWorkflow,
  },
  server: honoServer(),
  logger,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});
