import "dotenv/config";
import { initLogger } from "./infrastructure/logger";

// Initialize logger immediately
initLogger();

import { VoltAgent} from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { cors } from "hono/cors";
import { AgentRepository } from "./services/agent-repository";
import { AgentManager } from "./services/agent-manager";
import { memory } from "./infrastructure/memory";
import { internetSearchTool } from "./tools/internet_search";
import { makeCreateAgentTool, makeUpdateAgentTool, listAgentsTool, makeListToolsTool, makeTestAgentTool, makeAddSubAgentTool, makeRemoveSubAgentTool } from "./tools/agent_management";
import { makeListModelsTool } from "./tools/model_management"; 

import { Monitor } from "./infrastructure/monitor";
import { updateToolCapableModels } from "./utils/model-utils";

const agentManager = new AgentManager();

let voltInstance: any = null;  

const registerDynamicAgents = (agentMap: Record<string, any>) => { 
  if (voltInstance && typeof voltInstance.registerAgents === 'function') {
    voltInstance.registerAgents(agentMap);
    console.log(`📡 Dynamically registered agents: ${Object.keys(agentMap).join(", ")}`); 
  } 
}; 

// Register all system tools
agentManager.registerTool(internetSearchTool);
agentManager.registerTool(listAgentsTool);
agentManager.registerTool(makeListModelsTool(process.env.OPENROUTER_API_KEY!));
agentManager.registerTool(makeListToolsTool(agentManager.tools));
agentManager.registerTool(makeTestAgentTool(agentManager.get.bind(agentManager)));

agentManager.registerTool(makeCreateAgentTool((config) => {
  const agent = agentManager.createAgent(config);
  registerDynamicAgents({ [config.id]: agent });
}));

agentManager.registerTool(makeAddSubAgentTool(agentManager.addSubAgent.bind(agentManager)));
agentManager.registerTool(makeRemoveSubAgentTool(agentManager.removeSubAgent.bind(agentManager)));

agentManager.registerTool(makeUpdateAgentTool((id, fullConfig) => {
  const agent = agentManager.updateAgent(fullConfig);
  registerDynamicAgents({ [id]: agent });
}));

const originalUpdate = memory.updateWorkingMemory.bind(memory);
const originalClear = memory.clearWorkingMemory.bind(memory);

memory.updateWorkingMemory = async (args: any) => {
  Monitor.logPlan(args.content || args); 
  return originalUpdate(args);
};

memory.clearWorkingMemory = async (args: any) => {
  Monitor.clear();
  return originalClear(args);
};

async function initializeAgents() {
  const rows = await AgentRepository.all();
  agentManager.ensure(rows);      

  if (agentManager.map["controller-agent"]) {
    console.log("✅ Controller Agent loaded from repository.");
  } else {
    console.log("ℹ️ No Controller Agent found in repository. System is active but empty.");
  }

  return agentManager.map;
}

async function learnModels() {
  console.log("🔍 Learning available tool-capable free models from OpenRouter...");
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    const { data } = await response.json();
    
    const toolCapableFreeModels = data
      .filter((m: any) => {
        const p = m.pricing || {};
        const isFree = parseFloat(p.prompt || "0") === 0 && parseFloat(p.completion || "0") === 0;
        const params = m.supported_parameters || [];
        const hasTools = params.includes("tools") || params.includes("functions") || (m.description?.toLowerCase().includes("function calling"));
        return isFree && hasTools;
      })
      .map((m: any) => m.id);

    if (toolCapableFreeModels.length > 0) {
      updateToolCapableModels(toolCapableFreeModels);
    }
  } catch (error) {
    console.warn("⚠️ Failed to learn models from OpenRouter, using fallbacks.", error);
  }
}

const startServer = async () => {
  await learnModels();
  const agentMap = await initializeAgents();

  voltInstance = new VoltAgent({
    server: honoServer({
      port: Number(process.env.PORT || 3141),
      configureApp(app) {
        app.use("/*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE"] }));
        
        // Minimal health check
        app.get("/health", (c) => c.json({ status: "ok" }));
        
        // List all agents (including dynamically spawned ones)
        app.get("/agents", (c) => c.json(Object.keys(agentManager.map)));
      }
    })
  });

  // Initial registration
  if (typeof voltInstance.registerAgents === 'function') {
      voltInstance.registerAgents(agentMap);
  }

  console.log(`🚀 Simplified VoltAgent Server running → http://localhost:${process.env.PORT || 3141}`);
};
startServer().catch(console.error);   
