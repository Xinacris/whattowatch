// Through Vercel Deployment Protection on a remote run: the web project's "Protection Bypass for Automation" secret.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export const protectionHeaders: Record<string, string> = bypass ? { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" } : {};
