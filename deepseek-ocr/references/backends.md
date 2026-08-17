# DeepSeek-OCR Backends

## Option A: SiliconFlow (cloud, recommended)

DeepSeek-OCR is hosted on SiliconFlow as an OpenAI-compatible chat model. It accepts image and PDF input (base64 data URL or public URL) and is available on the free tier.

- Console / API keys: `https://cloud.siliconflow.cn/account/ak`
- Endpoint: `https://api.siliconflow.cn/v1`
- Model id: `deepseek-ai/DeepSeek-OCR`
- Docs: `https://docs.siliconflow.cn/en/userguide/capabilities/vision`

```bash
export DEEPSEEK_OCR_API_KEY="sk-..."
node scripts/ocr.mjs --image ./doc.png --mode document
```

Quick check with curl:

```bash
curl https://api.siliconflow.cn/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_OCR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-ai/DeepSeek-OCR","messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":"https://example.com/img.png"}},{"type":"text","text":"Convert the document to markdown."}}]}]}'
```

## Option B: Self-hosted vLLM (local, needs GPU)

Run the open-source model yourself and point the skill at the local server:

```bash
uv venv && source .venv/bin/activate
uv pip install -U vllm --pre --extra-index-url https://wheels.vllm.ai/nightly
vllm serve "deepseek-ai/DeepSeek-OCR"
```

Then configure the skill to use the local endpoint (no API key needed):

```bash
export DEEPSEEK_OCR_BASE_URL="http://localhost:8000/v1"
export DEEPSEEK_OCR_API_KEY="local"
node scripts/ocr.mjs --image ./doc.png --mode document
```

Notes:

- Requires a CUDA GPU (vLLM does not run on Apple Silicon).
- The repo's vLLM example also registers an `NGramPerReqLogitsProcessor` for best OCR quality; the served endpoint handles the base case, but for benchmark-grade quality follow `https://github.com/deepseek-ai/DeepSeek-OCR` (`DeepSeek-OCR-vllm/`).
- Official DeepSeek API (`api.deepseek.com`) does not serve DeepSeek-OCR; use SiliconFlow or a local deployment.
