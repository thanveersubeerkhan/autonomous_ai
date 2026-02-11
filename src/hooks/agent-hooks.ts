import { createHooks, OnStartHookArgs, OnToolStartHookArgs, OnToolEndHookArgs, OnEndHookArgs, OnHandoffHookArgs, OnStepFinishHookArgs, OnErrorHookArgs, OnRetryHookArgs, OnFallbackHookArgs } from "@voltagent/core";
import { Monitor } from "../infrastructure/monitor";

export const defaultHooks = createHooks({
  /**
   * Called before the agent starts processing a request.
   */
  onStart: async (args: OnStartHookArgs) => {
    const { agent } = args;
    Monitor.logEvent("🟢", `Agent [${agent.name}] starting.`);
  },

  /**
   * Called before a tool executes.
   */
  onToolStart: async (args: OnToolStartHookArgs) => {
    const { agent, tool } = args;
    Monitor.logEvent("🛠️", `Agent [${agent.name}] calling tool: ${tool.name}`);
  },

  /**
   * Called after a tool completes or throws an error.
   */
  onToolEnd: async (args: OnToolEndHookArgs) => {
    const { agent, tool, error } = args;
    if (error) {
      Monitor.logEvent("❌", `Agent [${agent.name}] tool failed: ${tool.name}`);
    } else {
      Monitor.logEvent("✅", `Agent [${agent.name}] tool finished: ${tool.name}`);
    }
  },

  /**
   * Called when a task is handed off from a source agent to this agent.
   */
  onHandoff: async (args: OnHandoffHookArgs) => {
    const { agent, sourceAgent } = args;
    Monitor.logEvent("🤝", `Delegation: ${sourceAgent.name} -> ${agent.name}`);
  },

  /**
   * Called after each step in multi-step agent execution.
   */
  onStepFinish: async (args: OnStepFinishHookArgs) => {
    // Concise: skipping step-level logs unless tools were called
  },

  /**
   * Called when an error occurs during agent execution.
   */
  onError: async (args: OnErrorHookArgs) => {
      const { agent, error } = args;
      Monitor.logEvent("💥", `Agent [${agent.name}] error: ${error.message || error}`);
  },

  /**
   * Called when VoltAgent schedules a retry.
   */
  onRetry: async (args: OnRetryHookArgs) => {
      Monitor.logEvent("🔄", `Retry triggered`);
  },

  /**
    * Called when VoltAgent selects the next model candidate.
    */
  onFallback: async (args: OnFallbackHookArgs) => {
      const { stage, fromModel, nextModel } = args;
      Monitor.logEvent("📉", `Fallback (${stage}): ${fromModel} -> ${nextModel || 'next'}`);
  },

  /**
   * Called after the agent completes a request.
   */
  onEnd: async (args: OnEndHookArgs) => {
    const { agent, output, error, context } = args;
    if (error) {
      Monitor.logEvent("🔴", `Agent [${agent.name}] finished with error.`);
    } else if (output) {
      Monitor.logEvent("🏁", `Agent [${agent.name}] finished.`);
      
      const conversationId = (context as any).conversationId;
      const anyOutput = output as any;

      let text = "";
      if (typeof output === 'string') text = output;
      else if (anyOutput.text) text = anyOutput.text;
      else if (anyOutput.content) text = anyOutput.content;

      if (text.includes("MISSION ACCOMPLISHED")) {
        Monitor.logEvent("🏆", `MISSION ACCOMPLISHED!`);
      }
    }
  }
});
