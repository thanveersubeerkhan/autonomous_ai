# 🛠️ System Tools Technical Reference

This document provides a technical overview of the tools available in the autonomous agent ecosystem, including their TypeScript interfaces and parameter schemas.

---

## 🏗️ Core Data Types

### `AgentConfig`
The primary configuration object for any agent in the system.
```typescript
export interface AgentConfig {
  id: string;               // Unique ID (kebab-case)
  name: string;             // Human readable name
  instructions: string;     // System character/behavior
  model?: string;           // Optional OpenRouter model ID
  description?: string;     // Purpose (used by supervisors)
  subagents?: AgentConfig[];// Inline sub-agent definitions
  supervisorConfig?: SupervisorConfig;
  memory?: boolean;         // Enable persistent history
  tools?: string[];         // List of tool IDs
}

export interface SupervisorConfig {
  customGuidelines?: string[];
  includeAgentsMemory?: boolean;
  fullStreamEventForwarding?: { types: string[] };
  systemMessage?: string;
}
```

---

## 🤖 Agent Management Tools

### `create_agent`
**Parameters (Zod Schema):**
```typescript
{
  id: string,
  name: string,
  description: string,
  instructions: string,
  model?: string,           // Default: "openai/gpt-4o-mini"
  supervisorConfig?: SupervisorConfig,
  subagents?: SubAgentConfig[],
  memory?: boolean,
  tools?: string[]          // Array of Tool IDs
}
```
**Returns:** `{ success: boolean, message: string }`

### `update_agent`
**Parameters:**
```typescript
{
  id: string,               // ID of the target agent
  updates: Partial<AgentConfig> // Supporting full configuration rewrites
}
```
**Returns:** `{ success: boolean, message: string, config: AgentConfig }`

### `list_agents`
**Returns:** `{ success: true, agents: AgentConfig[] }`

### `test_agent`
**Parameters:**
```typescript
{
  id: string,               // ID to test
  prompt: string            // Input prompt
}
```
**Returns:** `{ success: boolean, response: string }`

---

## 🌐 Research & Utility Tools

### `internet_search`
**Parameters:**
```typescript
{
  query: string,
  maxResults?: number       // Default: 5
}
```
**Returns (Tavily Structure):**
```typescript
{
  results: Array<{
    title: string,
    url: string,
    content: string,        // Snippet
    score: number
  }>
}
```

---

## 🧠 Memory Tools

### `update_working_memory`
**Parameters:** `{ content: any }` or just the raw `any` data.
**Role**: Persists a JSON or string "whiteboard" state for the mission.

### `get_working_memory`
**Returns:** The current state of the working memory.

---

## ⚙️ Model Governance

### `list_free_tool_models`
**Parameters:** `{ category?: string }`
**Returns:**
```typescript
{
  count: number,
  models: Array<{
    id: string,
    name: string,
    context_length: number,
    pricing: { prompt: string, completion: string },
    supports_tools: boolean,
    is_free: boolean,
    description: string
  }>
}
```

---

## 📡 Live Integration (Hot-Reload)
When an agent successfully calls `update_agent` or `create_agent`, the following runtime injection occurs:
1.  **DB Update**: The configuration is persisted to PostgreSQL.
2.  **In-Memory Update**: `AgentManager` recreates the agent instance.
3.  **Hono Update**: `VoltAgent` is notified via `registerAgents()`.
4.  **Instant Use**: The agent is now available for chat/API requests **immediately** without a server restart.
