
【设计与 AI 领域翻译规则 — 本平台内容是设计工具、AI 产品与交互、设计研究交叉的行业内容，严格遵守】

1. 歧义默认值：以下词在中文里有多义，**按本站语境取唯一译法**：
   - Agent / Agentic = AI 智能体 / 智能体的（不译“代理人”“中介”）
   - Prompt = 提示词（不译“召唤”“指示”）
   - Token = **看语境**：设计系统与 Style Dictionary、Figma Variables 里译“设计令牌”；模型计费与上下文里保留 token，不译“代币”“令牌”
   - Model = **看语境**：机器学习与生成式工具里译“模型”；“手模/车模/建筑模型”这类实体模型按原义，不要改写成 AI
   - Frame = Figma 里译“画板”；动画与视频里译“帧”；不译“框架”
   - Artboard = 画板；Component = 组件（不译“成分”）；Variants = 变体；Auto Layout = 自动布局
   - Handoff / Design handoff = 设计交付（不直译“移交握手”）
   - Design system = 设计系统（不混用“设计体系”“设计规范体系”）；Design language = 设计语言
   - Wireframe = 线框图；Mockup = 静态样稿；Prototype = 原型；Motion design = 动效设计
   - Affordance = 可供性（HCI 术语，也可写“示能”）；Signifier = 指示符；Mental model = 心智模型
   - Usability = 可用性；Accessibility / a11y = 无障碍（可及性）；Heuristic evaluation = 启发式评估；Persona = 用户画像
   - Diffusion = 扩散模型（AI 生成，不是物理扩散）；Inpainting = 局部重绘；Outpainting = 扩展绘制；Render / Rendering = 渲染
   - Mesh = 网格；Shader = 着色器；Rigging = 绑定；Layout（前端/排版）= 排版或布局，按上下文取一种并全篇一致
   - Alignment = 对齐（AI 安全语境）或对齐（排版语境），按上下文；Inference = 推理（模型生成）；Reasoning = 推理（思考型模型，必要时用“链式推理”区分 CoT）
   - Embedding = 嵌入向量（可保留英文）；Distillation = 知识蒸馏；Fine-tune / Fine-tuning = 微调；Pretrain = 预训练
   - Context window = 上下文窗口；Hallucination = 模型幻觉；Skill / Skills = 技能（Agent 框架的能力包，不译“特长”）
   - Case study = 案例研究；Workshop = 研讨会；Demo = 演示；Poster = 海报（会议语境下指海报展示，不是宣传海报）

2. 以下专有名词**一律保留英文原文**，不翻译不加中文括注：
   - 设计工具与平台：Figma / FigJam / Sketch / Adobe XD / Photoshop / Illustrator / Firefly / Express / Framer / Webflow / Canva / Affinity / Spline / Blender / Rhino / Cinema 4D / Houdini / After Effects / ProtoPie / Zeplin
     **规则**：`Sketch` 是工具名时保留英文，不译“草图”；软件与产品名一律不改写
   - 生成式视觉与 3D：Midjourney / Stable Diffusion / SDXL / Flux / Ideogram / DALL·E / Runway / Kling / Sora / Veo / Imagen / Luma / Unreal / Nanite
   - AI 公司与模型族（举例 + 通用规则）：OpenAI / Anthropic / Google DeepMind / Meta AI / Mistral / DeepSeek / Cohere / Hugging Face；GPT / Claude / Gemini / Llama / Qwen / Grok / o 系列 / DeepSeek / Mixtral / Phi
     **规则**：任何模型族名、产品代号一律保留英文
   - 版本号（举例 + 通用规则）：GPT-5 / Claude 4.7 / Figma 116 / Photoshop 26.11 / Llama 4 / Gemini 3 / o3 / DeepSeek-V4 / Qwen3.7 / Gen-4
     **规则**：版本号一字不改（包括字母数字后缀如 4o / 4.7 / 405B / V4 / R1），绝不“翻译性扩写”（不要把 "405B" 译成“4050 亿”，不要把 "V4" 译成“第 4 代”）
   - 技术缩写（举例 + 通用规则）：AI / ML / LLM / HCI / UX / UI / A11Y / API / SDK / CLI / IDE / MCP / RAG / RLHF / DPO / LoRA / QLoRA / PEFT / MoE / CoT / SOTA / AGI / NPU / GPU / TPU / SVG / CSS / HTML / WebGL / WebGPU / GLSL / PBR / CAD / CNC / IoT / XR / AR / VR
     **规则**：任何 2-5 字母的全大写缩写，默认保留英文；`a11y`、`i18n` 这类数字缩写同样保留
   - 会议与期刊：CHI / UIST / CSCW / DIS / DRS / IUI / TEI / SIGGRAPH / CHI PLAY；ACM TOCHI / IJHCS / International Journal of Human-Computer Studies / Design Studies / She Ji / Interactions / ACM Transactions on Graphics
     **规则**：会议与期刊名保留英文；首次出现可加中文说明（如“ACM CHI 人机交互会议”），后续只用英文原名
   - 评测基准与榜单（举例 + 通用规则）：SWE-bench / MMLU / GPQA / ARC-AGI / Chatbot Arena / GenAI-Bench / Parti Prompts / VBench
     **规则**：以 -bench / -eval 结尾或全大写的评测名一律保留英文
   - 设计与代码工具：Cursor / Copilot / Codex / Claude Code / Windsurf / Devin / v0 / Bolt / Lovable / Replit Agent / Cline / Aider
   - 智能体与开发框架：LangChain / LangGraph / LlamaIndex / CrewAI / AutoGen / MCP / Vercel AI SDK / DSPy
   - 通用技术：SaaS / CDN / SSO / OAuth / JWT / WebSocket / SSE / gRPC / Figma API / Figma Plugin API

3. 中国厂商与产品**优先用官方中文品牌名**（首次出现可双标“即时设计（JsDesign）”，后续选一种保持一致）：
   - 设计工具：即时设计（JsDesign）/ MasterGo（保留英文）/ Pixso（保留英文）/ 蓝湖 / 站酷（ZCOOL）/ 稿定设计 / 创客贴
   - 生成式视觉与视频：可灵（Kling，快手）/ 即梦（Jimeng，字节）/ 通义万相 / 混元（腾讯）/ 文心一言 / 智谱（GLM）/ 月之暗面（Kimi）/ 深度求索（DeepSeek）/ 阶跃星辰（Step）/ 零一万物（Yi）/ MiniMax（不译）/ 生数科技 Vidu / 爱诗 PixVerse / 面壁 MiniCPM / 华为昇腾
   - 机构与院校：清华美院 / 中央美术学院 / 同济大学设计创意学院 / 洛可可（LKK）/ 浪尖（ARTOP）

4. 代码 / 命令 / URL / 数字单位 **一字不改**保留：
   - 反引号代码 `code` 不翻译
   - 命令如 /code-review、pip install、npm run、figma.variables.setVariableModeValue 不译（不要译成“代码审查”）
   - URL 原样
   - 数字+单位：8k context / 175B params / 3.5x speedup / $3 per M tokens / 99.9% / 1080p / 4K / 16:9 / 8pt / 24px / 300dpi
   - 金额、尺寸、分辨率、参数量、比例、区间必须保留原文的阿拉伯数字和单位；不要把 $10B-$100B 改写成“数百亿至数千亿美元”等中文数量词，也不要把 24px 改成“24 像素”以外的其他写法
