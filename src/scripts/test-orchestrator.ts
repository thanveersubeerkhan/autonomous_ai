import "dotenv/config";
import { AgentManager } from "../services/agent-manager";
import { AgentRepository } from "../services/agent-repository";
import { 
  makeCreateAgentTool, 
  makeUpdateAgentTool, 
  listAgentsTool, 
  makeListToolsTool, 
  makeTestAgentTool, 
  makeAddSubAgentTool, 
  makeRemoveSubAgentTool,
  makeLogMonitorEventTool,
  makeDeleteAgentTool
} from "../tools/agent_management";
import { makeListModelsTool } from "../tools/model_management";
import { internetSearchTool } from "../tools/internet_search";
import { Monitor } from "../infrastructure/monitor";

async function testOrchestrator() {
  const agentManager = new AgentManager();
  
  // Register tools
  agentManager.registerTool(internetSearchTool);
  agentManager.registerTool(listAgentsTool);
  agentManager.registerTool(makeListModelsTool(process.env.OPENROUTER_API_KEY!));
  agentManager.registerTool(makeListToolsTool(agentManager.tools));
  agentManager.registerTool(makeTestAgentTool(agentManager.get.bind(agentManager)));
  agentManager.registerTool(makeLogMonitorEventTool(Monitor.logEvent.bind(Monitor)));
  agentManager.registerTool(makeDeleteAgentTool(agentManager.deleteAgent.bind(agentManager)));
  
  agentManager.registerTool(makeCreateAgentTool((config) => {
    agentManager.createAgent(config);
    console.log(`[Manager] Agent ${config.id} created.`);
  }));
  
  agentManager.registerTool(makeAddSubAgentTool(agentManager.addSubAgent.bind(agentManager)));
  agentManager.registerTool(makeRemoveSubAgentTool(agentManager.removeSubAgent.bind(agentManager)));

  console.log("🚀 Starting Orchestrator Integration Test...");

  // Load orchestrator from DB
  const agents = await AgentRepository.all();
  const orchestratorConfig = agents.find(a => a.id === "orchestrator-agent");
  
  if (!orchestratorConfig) {
    console.error("❌ Orchestrator Agent not found in DB. Run seed-orchestrator.ts first.");
    process.exit(1);
  }

  const orchestrator = agentManager.createAgent(orchestratorConfig);
  
  console.log("📝 Asking Orchestrator to solve a problem...");
  const prompt = "Find the height of the Eiffel Tower and its construction date. Use a sub-agent for this research and then clean up.";
  
  // We'll use the test_agent tool to trigger it, as it handles the LLM call
  const tester = agentManager.tools["test_agent"];
  
  const result = await tester.execute({
    id: "orchestrator-agent",
    prompt: prompt
  });

  console.log("📥 Orchestrator Response:", JSON.stringify(result, null, 2));

  console.log("\n--- Activity Monitor (monitor.md) ---");
  try {
    const monitorContent = require("fs").readFileSync("monitor.md", "utf-8");
    console.log(monitorContent.slice(-1000)); // Show last 1000 chars
  } catch (err) {
    console.log("Could not read monitor.md");
  }

  process.exit();
}

testOrchestrator().catch(console.error);
