---
name: deepseek-ocr
description: Read, OCR, and transcribe the content of images and PDFs into plain text or Markdown using DeepSeek-OCR through an OpenAI-compatible API, for situations where the active model cannot parse image input. Use when the user shares, attaches, or references an image, screenshot, photo, scanned document, table, diagram, chart, or PDF file (local path or URL) and expects the assistant to understand, extract, transcribe, or summarize its textual and layout content, or explicitly asks for OCR, 图片内容提取, 截图转文字, 文档转 Markdown, or reading what is written in an image. Do not use for generating, editing, or creating images.
---

# DeepSeek-OCR Skill

Extracts text and structured content from images and PDFs via DeepSeek-OCR through an OpenAI-compatible API, so a text-only model can "see" documents, screenshots, and photos.

## Rules

- The active model cannot parse image attachments. Never claim to have seen the image directly; always route it through the script and treat the script output as the source of truth.
- If the user's image is not accessible (missing path, unsupported type), report the exact error and ask for a valid local path or URL.

## Workflow

1. Resolve the input: a local absolute path (e.g. `/Users/admin/Desktop/shot.png`), an attached file path, or an `http(s)://` URL.
2. Run the bundled script:

   ```bash
   node scripts/ocr.mjs --image <path-or-url> [--mode document|ocr|table|figure|describe] [--output out.md]
   ```

3. Choose the mode to match the content:
   - `document` – pages, screenshots, scans → Markdown with tables (default)
   - `table` – spreadsheets/tables → Markdown table
   - `figure` – charts/plots inside documents → detailed description
   - `describe` – general photos/UI screenshots → detailed description
   - `ocr` – verbatim text extraction without layout
4. The script prints the extracted text/Markdown to stdout. Present it to the user; if they want a saved file, pass `--output`.
5. On failure (missing key, network error, API error), show the error and the configuration steps below.

## Configuration

The script targets any OpenAI-compatible endpoint. Environment variables:

- `DEEPSEEK_OCR_API_KEY` (required; falls back to `SILICONFLOW_API_KEY`) – API key.
- `DEEPSEEK_OCR_BASE_URL` (default `https://api.siliconflow.cn/v1`) – endpoint root. Point at a self-hosted vLLM server (e.g. `http://localhost:8000/v1`) to use a local DeepSeek-OCR deployment.
- `DEEPSEEK_OCR_MODEL` (default `deepseek-ai/DeepSeek-OCR`) – model id.
- `DEEPSEEK_OCR_MAX_TOKENS` (default `4096`; SiliconFlow caps the total sequence length at `8192`, so keep this below that).

The API key is resolved in this order: `DEEPSEEK_OCR_API_KEY` env → `SILICONFLOW_API_KEY` env → `~/.config/deepseek-ocr/key` file (or `DEEPSEEK_OCR_KEY_FILE` if set). The file fallback is the most reliable for desktop apps, which do not inherit shell profile env vars.

Getting a key (SiliconFlow, free tier for DeepSeek-OCR):

1. Sign in at `https://cloud.siliconflow.cn/account/ak` and create an API key.
2. Store it in the key file:

   ```bash
   mkdir -p ~/.config/deepseek-ocr
   echo 'sk-...' > ~/.config/deepseek-ocr/key
   ```

3. Or export it in the shell: `export DEEPSEEK_OCR_API_KEY="sk-..."` (add to `~/.zshrc` to persist).
4. Ask the user to confirm when the key is ready. Never ask the user to paste the key into chat.

## Backends

See `references/backends.md` for cloud (SiliconFlow) vs. local (vLLM) setup details.
