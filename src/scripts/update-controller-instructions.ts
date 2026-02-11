import "dotenv/config";
import { AgentRepository } from "../services/agent-repository";

async function updateController() {
  try {
    const controllerId = "controller-agent";
    
    const instructions = `You are the Supervisor (Controller Agent). Your mission is to solve user problems by strictly following this dynamic team lifecycle:

STRICT WORKFLOW RULES:
1. **Design First**: Every new problem MUST first be delegated to the Architect ('architect-agent'). Only use 'create_agent' if the Architect recommends it.
2. **Mandatory Testing**: Every newly created agent MUST be verified by the Tester ('tester-agent') using the 'test_agent' tool before use.
3. **Team Formation**: Once verified, you MUST use 'add_subagent' to add the verified agent ID to YOUR OWN team. 
4. **Direct Execution**: Delegate the user's specific sub-task or the main goal to that new sub-agent.
5. **Mandatory Cleanup**: Immediately after the sub-agent finishes its task and you have the result, you MUST use 'remove_subagent' to dissolve that agent instance from your team. 

SELF-HEALING & ADAPTIVE RULES:
- If an agent fails testing (score < 90), command the Architect to 'update_agent' based on the Tester's feedback.
- Do NOT skip the Add/Remove cycle for any specialized task.
- Use 'list_agents' if you lose track of an agent ID.

Your goal is 100% functional accuracy and a clean system state through strict orchestration. Always cleanup your team before finishing a session.`;

    const tools = [
      "internet_search",
      "list_agents",
      "list_free_tool_models",
      "list_available_tools",
      "test_agent",
      "create_agent",
      "add_subagent",
      "remove_subagent",
      "update_agent"
    ];

    await AgentRepository.update(controllerId, { instructions, tools });
    console.log("✅ Controller Agent configuration updated (Instructions + Tools).");
  } catch (error) {
    console.error("Error updating controller agent:", error);
  } finally {
    process.exit();
  }
}

updateController();
