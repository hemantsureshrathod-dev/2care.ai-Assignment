import { NextResponse } from "next/server";
import Retell from "retell-sdk";

export async function POST() {
  const apiKey = process.env.RETELL_API_KEY;
  const agentId = process.env.RETELL_AGENT_ID;

  if (!apiKey || apiKey === "your_retell_api_key_here" || apiKey.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RETELL_CREDENTIALS_MISSING",
          message:
            "RETELL_API_KEY is not configured in your environment variables. Please provide your Retell API key in .env or use the Interactive Simulator tab.",
        },
      },
      { status: 400 }
    );
  }

  if (!agentId || agentId === "your_retell_agent_id_here" || agentId.trim().length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RETELL_AGENT_ID_MISSING",
          message:
            "RETELL_AGENT_ID is not configured in .env. Create an agent in your Retell dashboard and set RETELL_AGENT_ID.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const client = new Retell({ apiKey });

    const webCallResponse = await client.call.createWebCall({
      agent_id: agentId,
    });

    return NextResponse.json({
      success: true,
      data: {
        accessToken: webCallResponse.access_token,
        callId: webCallResponse.call_id,
        agentId: agentId,
      },
    });
  } catch (error) {
    console.error("Retell createWebCall error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RETELL_API_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create Retell web call session.",
        },
      },
      { status: 502 }
    );
  }
}
