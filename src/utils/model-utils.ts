/**
 * Verified list of free models on OpenRouter that support tool/function calling.
 * This list is a fallback and can be supplemented at runtime.
 */
let TOOL_SUPPORTING_FREE_MODELS = [
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-1.5-flash:free",
  "google/gemini-1.5-flash-8b:free",
  "google/gemini-pro-1.5:free",
  "mistralai/mistral-7b-instruct:free",
  "mistralai/mistral-7b-instruct-v0.3:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.2-1b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "deepseek/deepseek-chat:free",
  "deepseek/deepseek-v3:free"
];
  
export const DEFAULT_FREE_MODEL = "google/gemini-2.0-flash-lite-preview-02-05:free";

/**
 * Update the internal registry of tool-capable free models.
 */
export function updateToolCapableModels(newModels: string[]) {
  TOOL_SUPPORTING_FREE_MODELS = Array.from(new Set([...TOOL_SUPPORTING_FREE_MODELS, ...newModels]));
  console.log(`🧠 Learned ${newModels.length} new tool-capable free models.`); 
}

/**
 * Checks if a model ID is a free model that supports tools.
 * Includes a heuristic check for common tool-enabled patterns.
 */
export function isToolCapableFreeModel(modelId: string): boolean {
  if (!modelId.endsWith(":free")) return false;
  
  const normalizedId = modelId.toLowerCase();
  
  // Check exact list
  if (TOOL_SUPPORTING_FREE_MODELS.some(m => normalizedId.includes(m.toLowerCase()))) {
    return true;
  }

  // Heuristic patterns
  const toolHeuristics = [
    "gemini-2.0", "gemini-1.5", "llama-3.1", "llama-3.3", "qwen-2.5", "mistral-7b-instruct"
  ];

  return toolHeuristics.some(p => normalizedId.includes(p));
}
