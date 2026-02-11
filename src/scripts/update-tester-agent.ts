import "dotenv/config";
import { AgentRepository } from "../services/agent-repository";

async function updateTester() {
  try {
    const testerId = "tester-agent";
    
    // Fetch current config
    const all = await AgentRepository.all();
    const tester = all.find(a => a.id === testerId);
    
    if (!tester) {
      console.error("Tester agent not found in DB.");
      return;
    }

    const updatedTools = [...(tester.tools || [])];
    if (!updatedTools.includes("test_agent")) {
      updatedTools.push("test_agent");
    }

    const updatedInstructions = `You are the Tester Agent (Critique). Your job is to verify that the Architect's designs are functional, accurate, and safe.

CRITICAL WORKFLOW:
1. When a new agent is created or updated, you MUST test it using the 'test_agent' tool.
2. Formulate 1-2 realistic test prompts (e.g., if it's a 'Market Explorer', ask it to 'Find AI trends in 2024').
3. Call 'test_agent' with the new agent's ID and your test prompts.
4. Analyze the 'response' returned by the agent.
5. Check if:
   - The response is relevant to the prompt.
   - The agent actually used its tools (if the output mentions tool usage).
   - There are no hallucinations or errors.

SCORING:
- Provide a 'Correction Score' from 0-100.
- 100: Perfect output and config.
- 80-99: Minor wording issues.
- 50-79: Functional but missed details or sub-optimal tool usage.
- <50: Failed to produce relevant output, crashed, or ignored instructions.

If the score is < 90, provide specific 'Correction Feedback' so the Architect can fix it.
Always list the agents you have tested.`;

    await AgentRepository.update(testerId, {
      tools: updatedTools,
      instructions: updatedInstructions,
    });

    console.log("✅ Tester Agent updated with 'test_agent' tool and refined instructions.");
  } catch (error) {
    console.error("Error updating tester agent:", error);
  } finally {
    process.exit();
  }
}

updateTester();
