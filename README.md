# agent-see-skill

让不支持图片解析的 AI 助手也能“看懂”图片和 PDF：通过 [DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) 把图片/PDF 内容转成文字或 Markdown。

本仓库是一个开箱即用的 **Codex skill**，含完整安装流程，任何人都可以拿来安装使用。仓库里**不包含任何人的 API key**。

## 仓库结构

```text
agent-see-skill/
├── README.md            # 本说明（安装流程）
└── deepseek-ocr/        # skill 本体
    ├── SKILL.md         # 触发规则与使用说明
    ├── scripts/ocr.mjs  # OCR 脚本（零依赖，Node 18+）
    ├── references/backends.md  # 云端 / 本地 vLLM 后端说明
    └── agents/openai.yaml      # UI 元数据
```

## 安装

### 方式 A：把仓库链接丢给 agent（推荐）

把你的 AI 助手（Codex / Claude 等）与下面这句话一起使用：

> 请帮我安装这个 skill：https://github.com/zimudehub/agent-see-skill
> 1. 获取该仓库中的 `deepseek-ocr` 目录；
> 2. 把它复制到本机 `~/.codex/skills/deepseek-ocr`；
> 3. 检查 `~/.config/deepseek-ocr/key` 是否存在；如果不存在，引导我注册 SiliconFlow、创建我自己的 API key 并存进去。

Codex 用户也可以直接使用官方 skill-installer：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo zimudehub/agent-see-skill --path deepseek-ocr
```

### 方式 B：手动安装

```bash
git clone https://github.com/zimudehub/agent-see-skill.git
mkdir -p ~/.codex/skills
cp -R agent-see-skill/deepseek-ocr ~/.codex/skills/deepseek-ocr
```

## 配置自己的 API key（必需）

DeepSeek-OCR 通过 SiliconFlow（硅基流动，有免费额度）的 OpenAI 兼容接口调用。

1. 打开 <https://cloud.siliconflow.cn/account/ak>，注册并创建一个 API key；
2. 把 key 存到本地文件（文件方式对桌面 App 最稳，不受 shell 环境变量影响）：

```bash
mkdir -p ~/.config/deepseek-ocr
echo 'sk-你的key' > ~/.config/deepseek-ocr/key
chmod 600 ~/.config/deepseek-ocr/key
```

脚本也支持环境变量 `DEEPSEEK_OCR_API_KEY`（或 `SILICONFLOW_API_KEY`）。

## 使用

装好后**新开一个对话**，把图片路径丢给助手即可，例如：

- “帮我读一下 `/Users/xxx/Desktop/截图.png`”
- “把这张图片转成 Markdown”
- “提取这张表格”

支持输入：`png / jpg / jpeg / webp / bmp / gif / PDF`，本地路径或 `http(s)://` 链接。

内置模式（`--mode`）：`document`（默认，转 Markdown）、`ocr`（逐字提取）、`table`（表格转 Markdown）、`figure`（图表详解）、`describe`（详细描述）。

## 常见问题

- **安装后不生效？** skill 在对话开始时加载，请新开一个对话再试。
- **报 `max_tokens ... exceeded`？** SiliconFlow 限制总序列长度 8192，脚本默认 `max_tokens=4096`，无需手动改。
- **想用自己的 GPU 跑？** 部署 vLLM 后设置 `DEEPSEEK_OCR_BASE_URL` 指向本地服务，详见 `deepseek-ocr/references/backends.md`。
- **如何卸载？** 删除 `~/.codex/skills/deepseek-ocr` 即可。

## 安全说明

- 请勿把 API key 提交到任何仓库，也不要粘贴到对话里（脚本支持 key 文件，不需要在对话中出现）。
- 本仓库不含任何人的 API key，请使用**你自己的** SiliconFlow key。
