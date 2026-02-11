import * as fs from "fs";
import * as path from "path";
import * as util from "util";

// Base logs directory
const baseLogDir = path.resolve(process.cwd(), "logs");

let currentLogDate = "";
let logStreamMd: fs.WriteStream | null = null;
let logStreamTxt: fs.WriteStream | null = null;
let logFileMdPath = "";

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function ensureLogStreams() {
  const today = getTodayDateString();
  
  // If date hasn't changed and streams are open, do nothing
  if (today === currentLogDate && logStreamMd && logStreamTxt) {
    return;
  }

  // Close existing streams if any
  if (logStreamMd) logStreamMd.end();
  if (logStreamTxt) logStreamTxt.end();

  // Update current date
  currentLogDate = today;

  // Create daily directory
  const dailyLogDir = path.join(baseLogDir, currentLogDate);
  if (!fs.existsSync(dailyLogDir)) {
    fs.mkdirSync(dailyLogDir, { recursive: true });
  }

  // Open new streams
  logFileMdPath = path.join(dailyLogDir, "logs.md");
  const logFileTxtPath = path.join(dailyLogDir, "app.log");

  // Initialize logs.md header if new
  if (!fs.existsSync(logFileMdPath) || fs.statSync(logFileMdPath).size === 0) {
    fs.writeFileSync(logFileMdPath, `# Application Logs - ${currentLogDate}\n\n`);
  }

  logStreamMd = fs.createWriteStream(logFileMdPath, { flags: "a" });
  logStreamTxt = fs.createWriteStream(logFileTxtPath, { flags: "a" });
  
  // Log rotation event to console (which will be redirected to the new file)
  process.stdout.write(`[Logger] Rotated logs to ${dailyLogDir}\n`);
}

export function initLogger() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Initial stream setup
  ensureLogStreams();

  function formatMessageMd(level: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    let emoji = "ℹ️";
    if (level === "WARN") emoji = "⚠️";
    if (level === "ERROR") emoji = "❌";

    const content = util.format(...args);
    
    const isCodeBlock = content.includes("\n") || content.startsWith("{") || content.startsWith("[");
    
    let searchTags = "";
    if (content.includes("[Hook]")) {
       if (content.includes("Agent")) searchTags += " `AGENT`";
       if (content.includes("Tool")) searchTags += " `TOOL`";
       if (content.includes("Operation ID:")) searchTags += " `OP_ID`";
    }

    if (isCodeBlock) {
      return `### ${emoji} [${timestamp}] ${level} ${searchTags}\n\`\`\`json\n${content}\n\`\`\`\n\n`;
    } else {
      return `- ${emoji} **[${timestamp}]** ${content} ${searchTags}\n`;
    }
  }

  function formatMessageTxt(level: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = util.format(...args);
    return `[${timestamp}] [${level}] ${message}\n`;
  }

  function writeToFiles(level: string, args: any[]) {
    // Check for rotation on every write
    ensureLogStreams();
    
    if (logStreamMd && logStreamTxt) {
        logStreamMd.write(formatMessageMd(level, args));
        logStreamTxt.write(formatMessageTxt(level, args));
    }
  }

  console.log = (...args: any[]) => {
    writeToFiles("INFO", args);
    originalLog(...args);
  };

  console.warn = (...args: any[]) => {
    writeToFiles("WARN", args);
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    writeToFiles("ERROR", args);
    originalError(...args);
  };

  console.log(`Logger initialized. Logs in logs/${currentLogDate}/`);
}
