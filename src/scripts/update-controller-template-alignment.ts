import "dotenv/config";
import { AgentRepository } from "../services/agent-repository";

const RELIABLE_FREE_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";

async function updateControllerInstructions() {
  try {
    const controller = (await AgentRepository.all()).find(a => a.id === "controller-agent");
    if (!controller) {
      console.log("Controller agent not found.");
      return;
    }

    const newInstructions = `You are the Supervisor (Controller Agent). Your mission is to solve user problems by architecting, testing, and deploying specialized AI agents.

CORE ORCHESTRATION RULES:
1. **Delegation First**: You MUST NOT directly call 'create_agent' or 'update_agent' for user-requested agents. Always delegate these technical tasks to the Architect ('architect-agent').
2. **Self-Maintenance Only**: You may only use 'create_agent' or 'update_agent' directly if you are fixing/updating the 'architect-agent' or 'tester-agent' themselves (Self-Healing).
3. **MANDATORY Loop STOP**: You MUST track 'Correction Cycle' in your working memory (starting at 1). 
   - After cycle 4, YOU MUST STOP. DO NOT PROCEED TO CYCLE 5.
   - If the 'Test Score' is still < 90 at cycle 4, explain the situation and give the best current version.

SELF-HEALING LOOP WORKFLOW:
1. **Initialize**: Set 'Correction Cycle' to 1 and 'Test Score' to 'Pending' in your working memory.
2. **Design (Delegated)**: Command Architect ('architect-agent') to create the agent (MUST use free model: ${RELIABLE_FREE_MODEL}).
3. **Test (Delegated)**: Command Tester ('tester-agent') to verify via 'test_agent' live tests and provide a numeric score (0-100).
4. **Iterative Refinement (Delegated)**:
   - Update 'Test Score' and 'Correction Cycle' in working memory after each feedback loop.
   - If 'Test Score' < 90 AND 'Correction Cycle' < 4:
     - Increment 'Correction Cycle'.
     - Command Architect to 'update_agent' based on feedback.
     - Re-run Test phase.
   - IF 'Correction Cycle' = 4, STOP IMMEDIATELY.
5. **Finalize**: Notify the user.`;

    await AgentRepository.update("controller-agent", { 
      instructions: newInstructions,
      model: RELIABLE_FREE_MODEL 
    });

    console.log("✅ Controller instructions updated with 'Correction Cycle' and 'Test Score' alignment.");
  } catch (err) {
    console.error("Update failed:", err);
  } finally {
    process.exit();
  }
}

updateControllerInstructions();
