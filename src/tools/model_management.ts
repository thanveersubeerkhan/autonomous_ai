import { tool } from "@voltagent/core";
import { z } from "zod";

/**
 * Tool to list NVIDIA models that are SAFE for autonomous agents
 * Uses NVIDIA /v1/models endpoint (OpenAI-compatible)
 */
export const makeListModelsTool = (apiKey: string) =>
  tool({
    name: "list_free_tool_models",
    description:
      "List NVIDIA models that are compatible with tool/function calling and safe for autonomous agent usage.",

    parameters: z.object({
      family: z
        .enum([
          "nemotron",
          "llama",
          "kimi",
          "mixtral",
        ])
        .optional()
        .describe("Optional model family filter"),
    }),

    execute: async ({ family }) => {
      try {
        const response = await fetch(
          "https://integrate.api.nvidia.com/v1/models",
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`NVIDIA API error: ${response.statusText}`);
        }

        const { data } = await response.json();
        const models = Array.isArray(data) ? data : [];

        const filtered = models
          .map((m: any) => {
            const id = m.id || "";

            // 🧠 Heuristic-based tool support detection
            const supportsTools =
              id.includes("nemotron") ||
              id.includes("llama") ||
              id.includes("kimi") ||
              m.capabilities?.includes("chat");

            // Optional family filter
            if (family && !id.toLowerCase().includes(family)) {
              return null;
            }

            return {
              id,
              owned_by: m.owned_by,
              context_length: m.context_length,
              supports_tools: supportsTools,
              safe_for_agents: supportsTools,
            };
          })
          .filter(Boolean)
          // 🔐 HARD GATE: tools only
          .filter((m: any) => m.supports_tools);

        return {
          count: filtered.length,
          models: filtered,
        };
      } catch (error) {
        console.error("list_nvidia_tool_models error:", error);
        return {
          error: "Failed to fetch NVIDIA models",
        };
      }
    },
  });
