import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
// Generate once, keep this ignored file private, and store the access key in a password manager.
const destination = path.resolve(process.argv[2] || ".env.analytics.local");
const password = randomBytes(24).toString("base64url"),
  salt = randomBytes(16).toString("hex");
const text = `# Private analytics credentials. Do not commit or share.\n# Owner access key: ${password}\nANALYTICS_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString("hex")}\nANALYTICS_SESSION_SECRET=${randomBytes(48).toString("hex")}\nANALYTICS_SITE_ORIGIN=https://kaseyklimes.com\n`;
writeFileSync(destination, text, { mode: 0o600, flag: "wx" });
console.log(
  `Wrote credentials to ${destination}. No secret values were printed. Keep the owner access key in your password manager.`,
);
