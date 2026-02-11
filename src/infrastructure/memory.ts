import { Memory } from "@voltagent/core";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";

export const memory = new Memory({
  storage: new PostgreSQLMemoryAdapter({
    connection: "postgresql://neondb_owner:npg_otxA1Ubgi9Fe@ep-proud-block-aiau0o0s-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  }),
  workingMemory: {
    enabled: true,
    scope: "conversation",
    template: `
# Workflow State
- Correction Cycle: 1
- Test Score: N/A
`
  }
});
 