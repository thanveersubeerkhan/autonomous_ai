import * as fs from "fs";
import * as path from "path";

export const Monitor = {
  logPlan: (content: string | object) => {
    try {
      const filePath = path.resolve(process.cwd(), "monitor.md");
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      fs.appendFileSync(filePath, `\n\n### 📋 New Plan/State\n${text}\n---\n`);
    } catch (err) {
      console.error("[Monitor] Failed to write monitor file:", err);
    }
  },

  logEvent: (icon: string, message: string) => {
    try {
      const filePath = path.resolve(process.cwd(), "monitor.md");
      const timestamp = new Date().toLocaleTimeString();
      const line = `[${timestamp}] ${icon} ${message}\n`;
      fs.appendFileSync(filePath, line);
    } catch (err) {
      console.error("[Monitor] Failed to append event to monitor file:", err);
    }
  },
  
  clear: () => {
    try {
      const filePath = path.resolve(process.cwd(), "monitor.md");
      fs.writeFileSync(filePath, "# Activity Monitor\n\n");
    } catch (err) {
      console.error("[Monitor] Failed to clear monitor file:", err);
    }
  }
};
