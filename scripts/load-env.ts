import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({ path: resolve(process.cwd(), ".env.local"), quiet: true });
config({ path: resolve(process.cwd(), ".env.production"), quiet: true });
