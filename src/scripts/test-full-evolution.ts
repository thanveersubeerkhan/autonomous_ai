import "dotenv/config";
import { AgentManager } from "../services/agent-manager";
import { AgentRepository } from "../services/agent-repository";
import { makeCreateAgentTool, makeUpdateAgentTool, listAgentsTool, makeTestAgentTool } from "../tools/agent_management";
import { internetSearchTool } from "../tools/internet_search";

async function testFullManagement() {
  const agentManager = new AgentManager();
  
  // Register tools
  agentManager.registerTool(internetSearchTool);
  agentManager.registerTool(listAgentsTool);
  agentManager.registerTool(makeCreateAgentTool((config) => {
    const agent = agentManager.createAgent(config);
    console.log(`[Manager] Agent ${config.id} created.`);
  }));
  agentManager.registerTool(makeUpdateAgentTool((id, config) => {
    const agent = agentManager.updateAgent(config);
    console.log(`[Manager] Agent ${id} updated.`);
  }));
  agentManager.registerTool(makeTestAgentTool((id) => agentManager.get(id)));

  console.log("🚀 Starting Full Management Test...");

  const testId = "evolution-agent";
  
  // 1. Create agent with minimal setup
  await AgentRepository.create({
    id: testId,
    name: "Evolution Agent",
    instructions: "You are an agent that wants to grow. Check your current config using 'list_agents' and then add 'internet_search' to your tools using 'update_agent' on yourself.",
    model: "nvidia/nemotron-3-nano-30b-a3b:free",
    tools: ["list_agents", "update_agent"],
    memory: true
  });
  agentManager.createAgent(await AgentRepository.update(testId, {}));

  const tester = agentManager.tools["test_agent"];

  // 2. Execution phase: Agent updates its tools
  console.log("📝 Asking agent to evolve (add internet_search)...");
  const result1 = await tester.execute({
    id: testId,
    prompt: "IMMEDIATELY call 'list_agents' to see your current state. THEN, call 'update_agent' on your own ID ('evolution-agent') to add 'internet_search' to your tools array and change your name to 'Super Evolution Agent'. DO NOT just talk about it, EXECUTE the tools."
  });

  console.log("📥 Full Response 1:", JSON.stringify(result1, null, 2));

  // 3. Verify visibility in list_agents
  console.log("🔍 Verifying visibility in list_agents...");
  const listResult = await agentManager.tools["list_agents"].execute({});
  const agentInList = listResult.agents.find((a: any) => a.id === testId);
  
  console.log("Agent in List Name:", agentInList.name);
  console.log("Agent in List Tools:", agentInList.tools);

  if (agentInList.name === "Super Evolution Agent" && agentInList.tools.includes("internet_search")) {
    console.log("✨ SUCCESS: Agent evolved and list_agents showed the full truth!");
  } else {
    console.log("❌ FAILURE: Evolution not reflected correctly.");
  }

  process.exit();
}

testFullManagement().catch(console.error);
