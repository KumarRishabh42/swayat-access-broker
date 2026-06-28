import "dotenv/config";
import axios from "axios";
import {
  Server,
  StdioServerTransport,
  CallToolRequest,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/server/index.js";
import { Tool } from "@modelcontextprotocol/sdk/shared/messages.js";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001/api";

const server = new Server({
  name: "policy-check-server",
  version: "0.0.1",
});

// Tool: check_capability
const checkCapabilityTool: Tool = {
  name: "check_capability",
  description:
    "Check if a proposed API capability is approved for this task. Always call this before executing any action.",
  inputSchema: {
    type: "object" as const,
    properties: {
      taskId: {
        type: "string",
        description: "The task ID to check authorization for",
      },
      service: {
        type: "string",
        description: "The service (e.g., slack, github, email, sap)",
      },
      action: {
        type: "string",
        description: "The action to perform (e.g., read, write, post_message)",
      },
      resource: {
        type: "string",
        description: "Optional: specific resource (e.g., #general for Slack)",
      },
    },
    required: ["taskId", "service", "action"],
  },
};

// Tool handler
server.setRequestHandler(CallToolRequest, async (request) => {
  if (request.params.name === "check_capability") {
    const { taskId, service, action, resource } = request.params.arguments as {
      taskId: string;
      service: string;
      action: string;
      resource?: string;
    };

    try {
      // Fetch decision from backend
      const response = await axios.post(
        `${BACKEND_URL}/policy/check-proposal`,
        { taskId }
      );
      const decision = response.data;

      // Check if the requested capability is in approved list
      const approved = decision.approvedCapabilities.find(
        (c: any) => c.service === service && c.actions.includes(action)
      );

      if (!approved) {
        return {
          content: [
            {
              type: "text",
              text: `DENIED: ${service}:${action} is not approved for this task. Reason: ${decision.reasoning}`,
            },
          ],
        };
      }

      // Check resource restrictions if specified
      if (resource && approved.resources && !approved.resources.includes(resource)) {
        return {
          content: [
            {
              type: "text",
              text: `DENIED: Resource '${resource}' is not in the approved list for ${service}. Approved: ${approved.resources.join(", ")}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `APPROVED: ${service}:${action}${resource ? ` on ${resource}` : ""} is allowed. You may proceed.`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `ERROR: Failed to check capability. ${error.message}`,
          },
        ],
      };
    }
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${request.params.name}`
  );
});

// Provide available tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [checkCapabilityTool],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Policy MCP Server] Started on stdio");
}

main().catch(console.error);
