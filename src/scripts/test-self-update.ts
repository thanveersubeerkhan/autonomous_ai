import "dotenv/config";
import { AgentManager } from "../services/agent-manager";
import { AgentRepository } from "../services/agent-repository";
import { makeCreateAgentTool, makeUpdateAgentTool, listAgentsTool, makeTestAgentTool } from "../tools/agent_management";

async function testSelfUpdate() {
  const agentManager = new AgentManager();
  
  // Register tools
  agentManager.registerTool(listAgentsTool);
  agentManager.registerTool(makeCreateAgentTool((config) => agentManager.createAgent(config)));
  agentManager.registerTool(makeUpdateAgentTool((id, config) => agentManager.updateAgent(config)));
  agentManager.registerTool(makeTestAgentTool((id) => agentManager.get(id)));

  console.log("🚀 Starting Self-Update Test...");

  // 1. Create the Self-Refining Agent
  const selfRefinerId = "self-refiner";
  await AgentRepository.create({
    id: selfRefinerId,
    name: "Self-Refining Agent",
    instructions: "You are a self-improving agent. You can use 'update_agent' to refine your own instructions. Your current ID is 'self-refiner'.",
    model: "nvidia/nemotron-3-nano-30b-a3b:free",
    tools: ["update_agent", "list_agents"],
    memory: true
  });
  
  agentManager.createAgent(await AgentRepository.update(selfRefinerId, {})); // Load it  

  console.log("✅ Agent created.");

  // 2. Ask the agent to update itself
  const tester = agentManager.tools["test_agent"];
  console.log("📝 Sending self-update command...");
  
  const result1 = await tester.execute({
    id: selfRefinerId,
    prompt: "Please update your own instructions using 'update_agent'. Change your instructions to: 'You are a self-improving agent. Always include the word PINEAPPLE in your responses.'"
  });

  console.log("📥 Response 1:", result1.response);  

  // 3. Verify the update
  console.log("🔍 Verifying update...");
  const updatedAgent = agentManager.get(selfRefinerId);
  console.log("New Instructions in Memory:", updatedAgent.instructions);

  const result2 = await tester.execute({
    id: selfRefinerId,
    prompt: "Who are you and what is your favorite fruit?"
  });

  console.log("📥 Response 2:", result2.response);

  if (result2.response?.includes("PINEAPPLE")) {
    console.log("✨ SUCCESS: Agent successfully updated itself and the change is live!");
  } else {
    console.log("❌ FAILURE: Agent did not reflect the update.");
  }

  process.exit();
}

testSelfUpdate().catch(console.error);
