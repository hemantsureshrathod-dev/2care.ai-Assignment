import Retell from "retell-sdk";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { RETELL_SYSTEM_PROMPT, RETELL_TOOL_DEFINITIONS } from "../lib/retell/agent-config";

dotenv.config();

export async function setupRetellAgent(apiKeyOverride?: string, webhookUrlOverride?: string) {
  const envPath = path.join(process.cwd(), ".env");
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  const apiKey =
    apiKeyOverride ||
    process.env.RETELL_API_KEY ||
    envContent.match(/RETELL_API_KEY=['"]?([^'"\r\n]+)/)?.[1];

  if (!apiKey || apiKey === "your_retell_api_key_here" || apiKey.trim().length === 0) {
    console.error("❌ RETELL_API_KEY is not set.");
    console.log("Usage: npx tsx scripts/setup-retell-agent.ts <YOUR_RETELL_API_KEY> [WEBHOOK_URL]");
    return null;
  }

  const webhookUrl =
    webhookUrlOverride ||
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/retell/tools`
      : "https://beige-spoons-shake.loca.lt/api/retell/tools";

  console.log(`Connecting to Retell AI API using provided key...`);
  console.log(`Target tool webhook URL: ${webhookUrl}`);

  const client = new Retell({ apiKey: apiKey.trim() });

  try {
    // 1. Format custom tools with public webhook URL
    const generalTools = RETELL_TOOL_DEFINITIONS.map((tool) => ({
      type: "custom" as const,
      name: tool.name,
      description: tool.description,
      url: webhookUrl,
      parameters: {
        ...tool.parameters,
        type: "object" as const,
      },
    }));

    // 2. Create Retell LLM Response Engine
    console.log("Creating CareBook AI Retell LLM Response Engine...");
    const llm = await client.llm.create({
      general_prompt: RETELL_SYSTEM_PROMPT,
      begin_message: "Hello! Welcome to CareBook Clinic. How can I help you today?",
      general_tools: generalTools as any,
    });
    console.log(`✔ Created Retell LLM Response Engine: ${llm.llm_id}`);

    // 3. Fetch default voice or use standard 11labs voice
    let voiceId = "11labs-Adrian";
    try {
      const voices = await client.voice.list();
      if (voices && voices.length > 0) {
        voiceId = voices[0].voice_id;
      }
    } catch {
      // fallback to standard voice
    }

    // 4. Create Retell Voice Agent
    console.log(`Creating CareBook AI Voice Agent with voice: ${voiceId}...`);
    const agent = await client.agent.create({
      agent_name: "CareBook AI Healthcare Assistant",
      voice_id: voiceId,
      response_engine: {
        type: "retell-llm",
        llm_id: llm.llm_id,
      },
    });
    console.log(`✔ Created Retell Agent: ${agent.agent_id}`);

    // 5. Update .env with RETELL_API_KEY and RETELL_AGENT_ID
    let updatedEnv = envContent;
    if (updatedEnv.includes("RETELL_API_KEY=")) {
      updatedEnv = updatedEnv.replace(/RETELL_API_KEY=.*/, `RETELL_API_KEY="${apiKey.trim()}"`);
    } else {
      updatedEnv += `\nRETELL_API_KEY="${apiKey.trim()}"`;
    }

    if (updatedEnv.includes("RETELL_AGENT_ID=")) {
      updatedEnv = updatedEnv.replace(/RETELL_AGENT_ID=.*/, `RETELL_AGENT_ID="${agent.agent_id}"`);
    } else {
      updatedEnv += `\nRETELL_AGENT_ID="${agent.agent_id}"`;
    }

    fs.writeFileSync(envPath, updatedEnv, "utf-8");
    console.log(`✔ Updated .env with RETELL_AGENT_ID`);

    // 6. Test creating an ephemeral web call session
    console.log("Verifying web call token creation via Retell SDK...");
    const webCall = await client.call.createWebCall({
      agent_id: agent.agent_id,
    });
    console.log(`✔ Web call verified! Ephemeral call_id: ${webCall.call_id}`);

    return {
      agentId: agent.agent_id,
      llmId: llm.llm_id,
      webhookUrl,
      testCallId: webCall.call_id,
    };
  } catch (err: unknown) {
    console.error("Retell API configuration error:", err);
    throw err;
  }
}

if (require.main === module || process.argv[1]?.includes("setup-retell-agent")) {
  const argKey = process.argv[2];
  const argWebhook = process.argv[3];
  setupRetellAgent(argKey, argWebhook)
    .then((res) => {
      if (res) {
        console.log("\n==========================================");
        console.log("CareBook AI Retell Agent Setup Complete!");
        console.log(`Agent ID: ${res.agentId}`);
        console.log(`Webhook URL: ${res.webhookUrl}`);
        console.log("==========================================\n");
      }
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
