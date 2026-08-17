#!/usr/bin/env node
/**
 * DeepSeek-OCR helper: send an image/PDF to an OpenAI-compatible multimodal
 * endpoint and print the extracted text/Markdown.
 *
 * Usage:
 *   node ocr.mjs --image <path-or-url> [--mode document|ocr|table|figure|describe]
 *                [--prompt <text>] [--output <file>] [--json]
 *
 * Environment:
 *   DEEPSEEK_OCR_API_KEY    API key (falls back to SILICONFLOW_API_KEY, then
 *                           ~/.config/deepseek-ocr/key or $DEEPSEEK_OCR_KEY_FILE)
 *   DEEPSEEK_OCR_BASE_URL   default https://api.siliconflow.cn/v1
 *   DEEPSEEK_OCR_MODEL      default deepseek-ai/DeepSeek-OCR
 *   DEEPSEEK_OCR_MAX_TOKENS default 4096 (SiliconFlow caps total seq len at 8192)
 *
 * Requires Node.js >= 18 (built-in fetch). No npm dependencies.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

const PROMPTS = {
  document: "Convert the document to markdown, preserving the layout with tables where appropriate.",
  ocr: "OCR this image. Output the text verbatim.",
  table: "Convert the table to markdown, preserving every cell's content.",
  figure: "Parse the figure and describe it in detail, including axes, labels, and data trends.",
  describe: "Describe this image in detail.",
};

const HELP = `DeepSeek-OCR helper

Usage:
  node ocr.mjs --image <path-or-url> [options]

Options:
  --image <path-or-url>   Local image/PDF path or http(s) URL (required)
  --mode <mode>           document | ocr | table | figure | describe (default: document)
  --prompt <text>         Override the instruction sent to the model
  --output <file>         Also write the result to a file
  --json                  Print a JSON envelope { text, model, mode } instead of raw text
  -h, --help              Show this help

Environment:
  DEEPSEEK_OCR_API_KEY    API key (falls back to SILICONFLOW_API_KEY, then
                          ~/.config/deepseek-ocr/key or $DEEPSEEK_OCR_KEY_FILE)
  DEEPSEEK_OCR_BASE_URL   Endpoint root, default https://api.siliconflow.cn/v1
  DEEPSEEK_OCR_MODEL      Model id, default deepseek-ai/DeepSeek-OCR
  DEEPSEEK_OCR_MAX_TOKENS Max output tokens, default 4096 (platform caps at 8192)
`;

function parseArgs(argv) {
  const args = { mode: "document" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--image":
        args.image = next();
        break;
      case "--mode":
        args.mode = next();
        break;
      case "--prompt":
        args.prompt = next();
        break;
      case "--output":
        args.output = next();
        break;
      case "--json":
        args.json = true;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        if (!args.image) args.image = a;
        else throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (args.prompt === undefined && PROMPTS[args.mode]) args.prompt = PROMPTS[args.mode];
  return args;
}

async function toDataUrl(image) {
  if (/^https?:\/\//i.test(image)) return image;
  if (!existsSync(image)) throw new Error(`File not found: ${image}`);
  const ext = path.extname(image).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    throw new Error(`Unsupported file type "${ext || "(none)"}". Supported: png, jpg, jpeg, webp, bmp, gif, pdf`);
  }
  const b64 = (await readFile(image)).toString("base64");
  return `data:${mime};base64,${b64}`;
}

async function resolveApiKey() {
  if (process.env.DEEPSEEK_OCR_API_KEY || process.env.SILICONFLOW_API_KEY) {
    return process.env.DEEPSEEK_OCR_API_KEY || process.env.SILICONFLOW_API_KEY;
  }
  const keyFile =
    process.env.DEEPSEEK_OCR_KEY_FILE || path.join(os.homedir(), ".config", "deepseek-ocr", "key");
  try {
    const key = (await readFile(keyFile, "utf8")).trim().split("\n")[0];
    if (key) return key;
  } catch {
    // fall through to the error below
  }
  throw new Error(
    "No API key found. Set DEEPSEEK_OCR_API_KEY (or SILICONFLOW_API_KEY), or create " +
      "~/.config/deepseek-ocr/key containing the key, or point DEEPSEEK_OCR_BASE_URL at a local vLLM server."
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (!args.image) {
    process.stderr.write("Missing required --image <path-or-url>.\n\n" + HELP);
    process.exit(1);
  }
  if (typeof fetch !== "function") {
    throw new Error("Node.js >= 18 is required (built-in fetch is missing).");
  }

  const apiKey = await resolveApiKey();
  const baseUrl = (process.env.DEEPSEEK_OCR_BASE_URL || "https://api.siliconflow.cn/v1").replace(/\/+$/, "");
  const model = process.env.DEEPSEEK_OCR_MODEL || "deepseek-ai/DeepSeek-OCR";
  const maxTokens = Number(process.env.DEEPSEEK_OCR_MAX_TOKENS || 4096);

  const dataUrl = await toDataUrl(args.image);
  const body = {
    model,
    max_tokens: maxTokens,
    temperature: 0.0,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          { type: "text", text: args.prompt },
        ],
      },
    ],
  };

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error calling ${baseUrl}/chat/completions: ${e.message}`);
  }

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${raw.slice(0, 2000)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON response: ${raw.slice(0, 2000)}`);
  }

  const content = data?.choices?.[0]?.message?.content ?? "";
  if (args.output) {
    await writeFile(args.output, content.endsWith("\n") ? content : content + "\n");
    process.stderr.write(`[deepseek-ocr] wrote ${args.output}\n`);
  }
  if (args.json) {
    process.stdout.write(JSON.stringify({ text: content, model, mode: args.mode }) + "\n");
  } else {
    process.stdout.write(content.endsWith("\n") ? content : content + "\n");
  }
}

main().catch((e) => {
  process.stderr.write(`[deepseek-ocr] ${e.message}\n`);
  process.exit(1);
});
