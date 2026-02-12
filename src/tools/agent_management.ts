import { createTool } from "@voltagent/core";
import { z } from "zod";
import { AgentRepository, AgentConfig } from "../services/agent-repository";

// Helper schema for SupervisorConfig
const SupervisorConfigSchema = z.object({
  customGuidelines: z.array(z.string()).optional().describe("Custom guidelines for the supervisor"),
  includeAgentsMemory: z.boolean().optional().describe("Whether to include sub-agent interactions in memory"),
  fullStreamEventForwarding: z.object({
    types: z.array(z.string())
  }).optional().describe("Event types to forward from sub-agents"),
  systemMessage: z.string().optional().describe("Custom system message (overrides generated one)"),
});

// Helper for recursive subagents (basic level or lazy)
// For simplicity in tool calling, we might limit depth or use a simpler structure if needed.
// But lets try a self-referencing schema if possible, or just one level deep for tool calls.
// Most LLMs struggle with deep recursive JSON schema in tool definitions.
// Let's define a simple content schema for subagents.
const SubAgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  instructions: z.string(),
  model: z.string().optional(), 
  tools: z.array(z.string()).optional().describe("IDs of tools this agent can use"),
});

export const makeCreateAgentTool = (onAgentCreated: (config: AgentConfig) => void) => createTool({
  name: "create_agent",
  description: "Create a new AI agent with specific instructions, capabilities, and optional sub-agents.",
  parameters: z.object({
    id: z.string().describe("Unique ID for the agent (kebab-case)"),
    name: z.string().describe("Human readable name"),
    description: z.string().describe("Short description of what the agent does (used as purpose for supervisors)"),
    instructions: z.string().describe("System instructions for the agent behavior"),
    model: z.string().optional().default("nvidia/nemotron-3-nano-30b-a3b:free").describe("Model ID to use"),
    supervisorConfig: SupervisorConfigSchema.optional().describe("Configuration if this agent supervises others"),
    subagents: z.array(SubAgentConfigSchema).optional().describe("List of sub-agents this agent supervises (inline definitions)"),
    memory: z.boolean().optional().describe("Enable long-term memory for this agent"),
    tools: z.array(z.string()).optional().describe("IDs of tools this agent can use"),
  }),
  execute: async (args) => {
    try {
      const config: AgentConfig = {
        id: args.id,
        name: args.name,
        description: args.description,
        instructions: args.instructions,
        model: args.model || "nvidia/nemotron-3-nano-30b-a3b:free",
        // @ts-ignore - types mismatch on exact recursion but structurally compatible
        subagents: args.subagents,
        supervisorConfig: args.supervisorConfig,
        memory: args.memory,
        tools: args.tools,
      };
      const fullConfig = await AgentRepository.create(config);
      onAgentCreated(fullConfig);
      return { success: true, message: `Agent '${args.name}' (${args.id}) created successfully.` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

export const makeUpdateAgentTool = (onAgentUpdated: (id: string, updates: Partial<AgentConfig>) => void) => createTool({
  name: "update_agent",
  description: "Update an existing AI agent's configuration.",
  parameters: z.object({
    id: z.string().describe("ID of the agent to update"),
    updates: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      instructions: z.string().optional(),
      model: z.string().optional(),
      supervisorConfig: SupervisorConfigSchema.optional(),
      memory: z.boolean().optional(),
      tools: z.array(z.string()).optional(),
      subagents: z.array(SubAgentConfigSchema).optional().describe("Replace sub-agents list"),
    }).describe("Fields to update"),
  }),
  execute: async (args) => {
    try {
      const fullConfig = await AgentRepository.update(args.id, args.updates);
      onAgentUpdated(args.id, fullConfig);
      return { 
        success: true, 
        message: `Agent '${args.id}' updated successfully.`,
        config: fullConfig 
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

export const listAgentsTool = createTool({
  name: "list_agents",
  description: "List all available agents with their full configurations.",
  parameters: z.object({}),
  execute: async () => {
    try {
      const agents = await AgentRepository.all();
      return {
        success: true,
        agents: agents // Returning full configs
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});
export const makeListToolsTool = (tools: Record<string, any>) => createTool({
  name: "list_available_tools",
  description: "List all tools registered in the system that can be assigned to agents.",
  parameters: z.object({}),
  execute: async () => {
    try {
      return {
        success: true,
        tools: Object.keys(tools).map(name => ({
          name,
          description: tools[name].description
        }))
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    } 
  },
});

export const makeTestAgentTool = (getAgent: (id: string) => any) => createTool({
  name: "test_agent",
  description: "Execute an agent with a specific prompt to verify its behavior and output. Use this to test if an agent correctly solves tasks or uses tools.",
  parameters: z.object({
    id: z.string().describe("ID of the agent to test"),
    prompt: z.string().describe("The prompt to send to the agent"),
  }),
  execute: async (args) => {
    try {
      const agent = getAgent(args.id);
      if (!agent) {
        return { success: false, error: `Agent '${args.id}' not found.` };
      }
      const result = await agent.generateText(args.prompt);
      return {
        success: true,
        response: result.text
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

export const makeAddSubAgentTool = (addSubAgent: (parentId: string, subAgentId: string) => boolean) => createTool({
  name: "add_subagent",
  description: "Add an existing agent as a sub-agent to another agent (or yourself). Use this to form teams dynamically.",
  parameters: z.object({
    parentId: z.string().describe("ID of the parent agent who will supervise (e.g., 'orchestrator-agent'). Use YOUR OWN ID if you want to be the supervisor."),
    subAgentId: z.string().describe("ID of the existing agent to add as sub-agent"),
  }),
  execute: async (args) => {
    try {
      const success = addSubAgent(args.parentId, args.subAgentId);
      if (success) {
        return { success: true, message: `Agent '${args.subAgentId}' added as sub-agent to '${args.parentId}'.` };
      }
      return { success: false, error: `Failed to add sub-agent. Ensure both IDs are correct and already created.` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

export const makeRemoveSubAgentTool = (removeSubAgent: (parentId: string, subAgentId: string) => boolean) => createTool({
  name: "remove_subagent",
  description: "Remove a sub-agent from a parent agent's supervision. Use this to dissolve teams after tasks are complete.",
  parameters: z.object({
    parentId: z.string().describe("ID of the parent agent. Use YOUR OWN ID if you are the current supervisor."),
    subAgentId: z.string().describe("ID of the sub-agent to remove"),
  }),
  execute: async (args) => {
    try {
      const success = removeSubAgent(args.parentId, args.subAgentId);
      if (success) {
        return { success: true, message: `Agent '${args.subAgentId}' removed from '${args.parentId}'.` };
      }
      return { success: false, error: `Failed to remove sub-agent. Ensure IDs are correct.` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

export const makeLogMonitorEventTool = (logEvent: (icon: string, message: string) => void) => createTool({
  name: "log_monitor_event",
  description: "Log a major task step or event to the activity monitor. Use this to provide transparency on your internal reasoning and progress.",
  parameters: z.object({
    icon: z.string().describe("Emoji icon for the event (e.g., 🔍, 🏗️, ✅, ❌)"),
    message: z.string().describe("Descriptive message of the event or step being taken"),
  }),
  execute: async (args) => {
    try {
      logEvent(args.icon, args.message);
      return { success: true, message: `Logged event to monitor: ${args.message}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});
export const makeDeleteAgentTool = (deleteAgent: (id: string) => Promise<boolean>) => createTool({
  name: "delete_agent",
  description: "Completely delete an agent from the system. Use this to permanently remove specialized agents after their task is finished and they have been removed from any teams.",
  parameters: z.object({
    id: z.string().describe("ID of the agent to delete"),
  }),
  execute: async (args) => {
    try {
      const success = await deleteAgent(args.id);
      if (success) {
        return { success: true, message: `Agent '${args.id}' successfully deleted from the system.` };
      }
      return { success: false, error: `Failed to delete agent '${args.id}'. Agent might not exist.` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});
export const makeReloadAgentsTool = (reload: () => Promise<void>) => createTool({
  name: "reload_agents",
  description: "Synchronize the server's in-memory agents with the database. Use this after making manual database changes or when the system state feels out of sync.",
  parameters: z.object({}),
  execute: async () => {
    try {
      await reload();
      return { success: true, message: "Agents reloaded from database and server state synchronized." };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});
