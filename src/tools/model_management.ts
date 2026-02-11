import { tool } from "@voltagent/core";
import { z } from "zod";

/**
 * Tool to list ONLY free + tool-capable models from OpenRouter
 * Hard-gated for autonomous agent spawning
 */
export const makeListModelsTool = (apiKey: string) =>
  tool({
    name: "list_free_tool_models",
    description:
      "List ONLY free AI models from OpenRouter that support tool/function calling. Used for safe, zero-cost autonomous sub-agent provisioning.",
    parameters: z.object({
      category: z
        .enum([
          "programming",
          "roleplay",
          "marketing",
          "marketing/seo",
          "technology",
          "science",
          "translation",
          "legal",
          "finance",
          "health",
          "trivia",
          "academia",
        ])
        .optional()
        .describe("Optional category filter"),
    }),
    execute: async ({ category }) => {
      try {
        let url = "https://openrouter.ai/api/v1/models";
        if (category) {
          url += `?category=${encodeURIComponent(category)}`;
        }

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://fazzai.com",
            "X-Title": "Fazzai Mission Control",
          },
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const { data } = await response.json();
        let models = Array.isArray(data) ? data : [];

        // Normalize + enforce constraints
        const filtered = models
          .map((m: any) => {
            const params = m.supported_parameters || [];
            const supportsTools =
              params.includes("tools") ||
              params.includes("functions") ||
              m.description?.toLowerCase().includes("tool") ||
              m.description?.toLowerCase().includes("function calling");

            const promptPrice = parseFloat(m.pricing?.prompt || "0");
            const completionPrice = parseFloat(m.pricing?.completion || "0");
            const isFree = promptPrice === 0 && completionPrice === 0;

            return {
              id: m.id,
              name: m.name,
              context_length: m.context_length,
              pricing: m.pricing,
              supports_tools: supportsTools,
              is_free: isFree,
              description:
                m.description?.slice(0, 200) +
                (m.description?.length > 200 ? "..." : ""),
            };
          })
          // HARD GATES
          .filter((m) => m.is_free && m.supports_tools);

        return {
          count: filtered.length,
          models: filtered,
        };
      } catch (error) {
        console.error("list_free_tool_models error:", error);
        return {
          error: "Failed to fetch free tool-capable models from OpenRouter",  
        };
      }
    },
  });
  