import "dotenv/config";
import { AgentRepository } from "../services/agent-repository";

const RELIABLE_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";

async function forceReliableModels() {
  try {
    const agents = await AgentRepository.all();
    console.log(`Checking ${agents.length} agents for model reliability...`);

    for (const agent of agents) {
      if (agent.model !== RELIABLE_MODEL) {
        console.log(`FORCING [${agent.id}] from ${agent.model} to ${RELIABLE_MODEL}`);
        await AgentRepository.update(agent.id, { model: RELIABLE_MODEL });
      }
    }

    console.log("✅ All agents hard-reset to highly reliable Gemini 2.0 Flash Lite.");
  } catch (err) {
    console.error("Force reset failed:", err);
  } finally {
    process.exit();
  }
}

forceReliableModels();
