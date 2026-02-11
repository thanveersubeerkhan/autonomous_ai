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
    model: z.string().optional().default("openai/gpt-4o-mini").describe("Model ID to use"),
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
      // Updating subagents via this tool is tricky (replace vs append). 
      // For now, let's skip subagents in update or allow full replacement.
      // Let's omit subagents in update for simplicity unless requested.
    }).describe("Fields to update"),
  }),
  execute: async (args) => {
    try {
      const fullConfig = await AgentRepository.update(args.id, args.updates);
      onAgentUpdated(args.id, fullConfig);
      return { success: true, message: `Agent '${args.id}' updated successfully.` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
});

export const listAgentsTool = createTool({
  name: "list_agents",
  description: "List all available agents.",
  parameters: z.object({}),
  execute: async () => {
    try {
      const agents = await AgentRepository.all();
      return {
        success: true,
        agents: agents.map(a => ({ id: a.id, name: a.name, description: a.description }))
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
    parentId: z.string().describe("ID of the parent agent (e.g., 'controller-agent')"),
    subAgentId: z.string().describe("ID of the agent to add as sub-agent"),
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
    parentId: z.string().describe("ID of the parent agent"),
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
