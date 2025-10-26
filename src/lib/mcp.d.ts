// src/types/mcp-alias.d.ts
declare module "@/lib/mcp" {
  export function health(): Promise<any>;
  export function listTools(): Promise<any>;
  export function callTool(
    name: string,
    args?: Record<string, unknown>
  ): Promise<any>;
  export function unwrapText(res: any): string;
}
