import { query } from '../infrastructure/db';

export interface AgentConfig {
  id: string;
  name: string;
  instructions: string;
  model?: string;
  description?: string;
  subagents?: AgentConfig[];
  supervisorConfig?: SupervisorConfig;
  memory?: boolean;
  tools?: string[];
}

export interface SupervisorConfig {
  customGuidelines?: string[];
  includeAgentsMemory?: boolean;
  fullStreamEventForwarding?: {
    types: string[]; 
  };
  systemMessage?: string;
}

export class AgentRepository {
  static async all(): Promise<AgentConfig[]> {
    try {
      const { rows } = await query('SELECT * FROM agents ORDER BY created_at ASC');
      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        instructions: row.instructions,
        model: row.model,
        supervisorConfig: row.supervisor_config,
        memory: row.memory,
        tools: row.tools,
        subagents: row.subagents,
      }));
    } catch (error) {
      console.error("Error reading agents from DB:", error);
      return [];
    }
  }

  static async create(agent: AgentConfig): Promise<AgentConfig> {
    const upsertQuery = `
      INSERT INTO agents (id, name, description, instructions, model, supervisor_config, memory, tools, subagents)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        instructions = EXCLUDED.instructions,
        model = EXCLUDED.model,
        supervisor_config = EXCLUDED.supervisor_config,
        memory = EXCLUDED.memory,
        tools = EXCLUDED.tools,
        subagents = EXCLUDED.subagents,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [
      agent.id,
      agent.name,
      agent.description || null,
      agent.instructions,
      agent.model,
      JSON.stringify(agent.supervisorConfig || {}),
      agent.memory || false,
      agent.tools || [],
      JSON.stringify(agent.subagents || [])
    ];

    const { rows } = await query(upsertQuery, values);
    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      model: row.model,
      supervisorConfig: row.supervisor_config,
      memory: row.memory,
      tools: row.tools,
      subagents: row.subagents,
    };
  }

  static async update(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig> {
    const { rows } = await query('SELECT * FROM agents WHERE id = $1', [id]);
    if (rows.length === 0) {
      throw new Error(`Agent with ID ${id} not found.`);
    }

    const current = rows[0];
    const merged: AgentConfig = {
      id: current.id,
      name: updates.name ?? current.name,
      description: updates.description ?? current.description,
      instructions: updates.instructions ?? current.instructions,
      model: updates.model ?? current.model,
      supervisorConfig: updates.supervisorConfig ?? current.supervisor_config,
      memory: updates.memory ?? current.memory,
      tools: updates.tools ?? current.tools,
      subagents: updates.subagents ?? current.subagents,
    };

    return this.create(merged);
  }

  static async delete(id: string): Promise<void> {
    const result = await query('DELETE FROM agents WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      throw new Error(`Agent with ID ${id} not found.`);
    }
  }
}
