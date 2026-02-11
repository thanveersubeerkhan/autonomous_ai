import "dotenv/config";
import { AgentRepository } from "../services/agent-repository";

async function checkController() {
  const controller = (await AgentRepository.all()).find(a => a.id === "controller-agent");
  if (controller) {
    console.log("CONTROLLER INSTRUCTIONS:");
    console.log(controller.instructions);
  } else {
    console.log("Controller not found.");
  }
  process.exit();
}

checkController();
