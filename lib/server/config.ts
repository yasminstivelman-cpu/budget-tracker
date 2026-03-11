import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

export type ContributorConfig = {
  spreadsheetId: string;
  sheetName: string;
  email: string;
  passwordHash: string;
  ownerRefreshToken: string;
};

const configPath = join(process.cwd(), "data", "contributor-config.json");

export function readContributorConfig(): ContributorConfig | null {
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ContributorConfig;
  } catch {
    return null;
  }
}

export function writeContributorConfig(config: ContributorConfig): void {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
