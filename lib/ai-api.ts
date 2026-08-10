const DEFAULT_AI_API_BASE_URL = "/api";

export function getAiApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_AI_API_BASE_URL?.trim();
  return (configuredBaseUrl || DEFAULT_AI_API_BASE_URL).replace(/\/+$/, "");
}
