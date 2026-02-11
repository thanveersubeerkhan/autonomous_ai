import { createTool } from "@voltagent/core";
import { z } from "zod";

export const internetSearchTool = createTool({
  name: "internet_search",
  description: "Search the web for information using Tavily",
  parameters: z.object({
    query: z.string().describe("Search query"),
    maxResults: z.number().optional().default(5),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      const apiKey = process.env.Tavily_api_key || process.env.TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error("Tavily API key not found in environment variables (Tavily_api_key or TAVILY_API_KEY)");
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query, max_results: maxResults }),
      });

      if (!response.ok) {
         const errorText = await response.text();
         return { error: `Tavily API error: ${response.status} ${response.statusText}`, details: errorText };
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      return { error: error.message };
    }
  },
});
