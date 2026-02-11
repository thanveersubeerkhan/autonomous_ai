import { Agent } from "@voltagent/core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { memory } from "../infrastructure/memory";
import { defaultHooks } from "../hooks/agent-hooks";
import { Monitor } from "../infrastructure/monitor";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  headers: {
    "HTTP-Referer": "https://voltagentfrontenddbconnection-production.up.railway.app/",
    "X-Title": "Fazzai",
  }
});


/**
 * Agent Manager
 */
export class AgentManager {
  map: Record<string, Agent> = {};
  tools: Record<string, any> = {};

  registerTool(tool: any) {
    this.tools[tool.name] = tool;
  }

  createAgent(config: any) {
    const agent = this.buildAgentTree(config);
    this.map[config.id] = agent;
    return agent;
  }

  updateAgent(config: any) {
    // For now, update is just recreating the agent
    return this.createAgent(config);
  }

  ensure(rows: any[]) {
    if (!Array.isArray(rows)) return;
    for (const r of rows) {
      if (!this.map[r.id]) this.createAgent(r);
    }
  }

  get(id: string) {
    return this.map[id];
  }

  addSubAgent(parentId: string, subAgentId: string) {
    const parent = this.map[parentId];
    const sub = this.map[subAgentId];
    if (parent && sub) {
      // @ts-ignore - addSubAgent exists at runtime
      parent.addSubAgent(sub);
      Monitor.logEvent("➕", `Sub-agent [${subAgentId}] added to [${parentId}]`);
      return true;
    }
    return false;
  }

  removeSubAgent(parentId: string, subAgentId: string) {
    const parent = this.map[parentId];
    if (parent) {
      // @ts-ignore - removeSubAgent exists at runtime
      parent.removeSubAgent(subAgentId);
      Monitor.logEvent("➖", `Sub-agent [${subAgentId}] removed from [${parentId}]`);
      return true;
    } 
    return false;
  }

  /**
   * Recursively build agent tree
   */
  private buildAgentTree(config: any): Agent {
    const subAgents = config.subagents?.map((s: any) => this.buildAgentTree(s)) || [];
    
    // Assign tools if provided in config
    const toolNames = config.tools || [];
    const agentTools = toolNames.map((name: string) => this.tools[name]).filter(Boolean);

    console.log(`🛠️ Assigned ${agentTools.length} tools to agent [${config.id}]: ${agentTools.map((t: any) => t.name).join(", ")}`);

    return new Agent({
      id: config.id,
      name: config.name,
      instructions: config.instructions,
      model: openrouter(config.model || "nvidia/nemotron-3-nano-30b-a3b:free"),
      // Map description to purpose for supervisor visibility
      purpose: config.description, 
      // Pass configured subagents
      subAgents: subAgents,
      // Pass supervisor configuration only if subagents exist
      supervisorConfig: subAgents.length > 0 ? config.supervisorConfig : undefined,
      // Pass memory only if enabled in configuration
      memory: config.memory ? memory : undefined,
      // Attach tools
      tools: agentTools,
      // Attach default logging hooks
      hooks: defaultHooks,
      maxSteps:20
    });
  }
}
