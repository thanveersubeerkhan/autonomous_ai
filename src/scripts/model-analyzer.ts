import "dotenv/config";

async function analyzeModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("No API key found");
    return;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://fazzai.com",
        "X-Title": "Fazzai Analyzer"
      }
    });

    const { data } = await response.json();
    const freeModels = data.filter((m: any) => {
      const p = m.pricing || {};
      return parseFloat(p.prompt || "0") === 0 && parseFloat(p.completion || "0") === 0;
    });

    console.log(`Found ${freeModels.length} free models.\n`);

    const toolCapable = freeModels.filter((m: any) => {
       const params = m.supported_parameters || [];
       const hasTools = params.includes("tools") || params.includes("functions");
       const desc = (m.description || "").toLowerCase();
       const hasToolDesc = desc.includes("tool use") || desc.includes("function calling");
       return hasTools || hasToolDesc;
    });

    console.log("TOOL CAPABLE FREE MODELS:");
    toolCapable.forEach((m: any) => {
      console.log(`- ${m.id} (${m.name})`);
      // console.log(`  Params: ${m.supported_parameters.join(", ")}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

analyzeModels();
