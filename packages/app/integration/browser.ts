import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const run = promisify(execFile);
const cli = createRequire(import.meta.url).resolve("agent-browser/bin/agent-browser.js");

interface CliResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/** A headless Chrome session driven through the agent-browser CLI. */
export interface Browser {
  open(path: string): Promise<void>;
  title(): Promise<string>;
  url(): Promise<string>;
  text(selector: string): Promise<string>;
  count(selector: string): Promise<number>;
  /** Waits until `text` is visible anywhere on the page. */
  waitForText(text: string): Promise<void>;
  clickLink(name: string): Promise<void>;
  waitForUrl(pattern: string): Promise<void>;
  close(): Promise<void>;
}

/** `name` isolates the session (own browser, cookies, tabs) from other test files. */
export function openBrowser(baseUrl: string, name: string): Browser {
  const session = `devmentor-it-${name}-${process.pid}`;

  async function command<T>(...args: string[]): Promise<T> {
    let stdout: string;
    try {
      ({ stdout } = await run(process.execPath, [cli, "--session", session, "--json", ...args]));
    } catch (error) {
      // Failed commands exit non-zero but still print the JSON error.
      stdout = (error as { stdout?: string }).stdout ?? "";
      if (!stdout) throw error;
    }
    const response = JSON.parse(stdout) as CliResponse<T>;
    if (!response.success || response.data === null) {
      throw new Error(`agent-browser ${args.join(" ")} failed: ${response.error}`);
    }
    return response.data;
  }

  return {
    open: async (path) => void (await command("open", new URL(path, baseUrl).href)),
    title: async () => (await command<{ title: string }>("get", "title")).title,
    url: async () => (await command<{ url: string }>("get", "url")).url,
    text: async (selector) => (await command<{ text: string }>("get", "text", selector)).text,
    count: async (selector) => (await command<{ count: number }>("get", "count", selector)).count,
    waitForText: async (text) => void (await command("wait", "--text", text)),
    clickLink: async (name) => void (await command("find", "role", "link", "click", "--name", name)),
    waitForUrl: async (pattern) => void (await command("wait", "--url", pattern)),
    close: async () => void (await run(process.execPath, [cli, "--session", session, "close"])),
  };
}
