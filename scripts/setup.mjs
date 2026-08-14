import { execSync } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");

function run(cmd, cwd = rootDir) {
    console.log(`\n▶ ${cmd}`);
    execSync(cmd, { stdio: "inherit", cwd });
}

console.log("zownload — first-time setup\n");

// 1. Install all workspace dependencies
run("pnpm install");

// 2. Build the shared types package (needed by both apps, and by editors' TS servers)
run("pnpm --filter @zownload/shared build");

// 3. Create frontend's local env file if it doesn't exist yet
const envExample = path.join(rootDir, "apps/frontend/.env.example");
const envLocal = path.join(rootDir, "apps/frontend/.env.local");

if (!existsSync(envLocal) && existsSync(envExample)) {
    copyFileSync(envExample, envLocal);
    console.log("\nCreated apps/frontend/.env.local from .env.example");
} else if (existsSync(envLocal)) {
    console.log("\napps/frontend/.env.local already exists, skipping");
}

console.log("\nSetup complete.");
console.log("Run `pnpm start` to build and launch both services with Docker.\n");