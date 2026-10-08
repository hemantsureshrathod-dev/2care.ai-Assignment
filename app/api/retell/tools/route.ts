import { NextRequest, NextResponse } from "next/server";
import { dispatchRetellTool } from "@/lib/retell/tool-dispatcher";

/**
 * Retell Custom Tool Webhook Handler
 *
 * Retell sends a POST request with the tool name and arguments.
 * Retell tool payload structure:
 * {
 *   "name": "check_availability",
 *   "args": { ... },
 *   "call": { "call_id": "..." }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Retell format supports either { name, args } or direct tool call structure
    const toolName = body.name || body.tool_name || body.function_name;
    const args = body.args || body.arguments || body.parameters || body;

    if (!toolName) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tool name in Retell payload.",
        },
        { status: 400 }
      );
    }

    const toolResult = await dispatchRetellTool(toolName, args);

    // Return format expected by Retell custom functions
    return NextResponse.json(toolResult);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "WEBHOOK_ERROR",
          message: error instanceof Error ? error.message : "Unknown error in Retell tool webhook",
        },
      },
      { status: 500 }
    );
  }
}
