// 这个行业的分类体系：类别、标签词表、公司与机构（主体）名录，以及防止张冠李戴的身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后就不要再改；标签和名录可以随时增减。

/**
 * 网页上的类别（筛选栏、卡片角标、RSS 分类订阅）。key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题（几个类别可以共用一节，按这里的顺序排）；guide 告诉结构抽取模型这一类收什么、
 * 和相邻类别的边界在哪（总的归类原则写在 prompts/structure.md 里）。
 * commentary 标出评论类（教程、观点）：日报写过的事又有评论类的后续报道，只占一行快讯（报道它的信源够多时除外）。
 * 没归上类的资料在日报里放进第一个 key 为 industry 的类别所在的节（没有就放最后一节）。
 * tagColor 是飞书推送卡片里跟在标题后面的这一类小标签的颜色（飞书 text_tag 的颜色名）。
 * feedLabel 是分类 RSS 标题里的名字（不写就用 label）。公开接口、RSS 和 MCP 里要把一类并进另一类发布，写在站点设置里（site/site.ts 的 PUBLIC_CATEGORIES）。
 */
export const CATEGORIES = [
  { key: "design-tools", tagColor: "indigo", label: "工具", feedLabel: "AI 设计工具", section: "工具与功能", guide: "AI 设计工具本身的能力与版本变化：设计与原型软件的新功能、生成式视觉与 3D 工具、插件与 MCP 接入、设计系统和交付链路里的组件与模板。只公布一次分数不是新工具，只讲怎么用归教程。" },
  { key: "design-products", tagColor: "turquoise", label: "产品", feedLabel: "产品与体验", section: "产品与体验", guide: "可使用的 AI 新产品、新功能与新的交互形态：消费与企业应用、对话与智能体界面、硬件与设备、体验改版和设计语言。工具链里的组件归工具；只有态度和预测而没有可使用的东西归观点。" },
  { key: "design-research", tagColor: "violet", label: "研究", feedLabel: "研究", section: "学术与研究", guide: "以新方法、实验、设计或发现为核心的论文、技术报告、预印本、期刊文章和研究数据集，以及期刊专刊征集的选题。会议本身的日程、征稿与获奖归会议；既有工具或产品的分数与横向比较归工具或产品。" },
  { key: "design-conferences", tagColor: "blue", label: "会议", feedLabel: "会议与征稿", section: "学术与研究", guide: "CHI、UIST、CSCW、DIS、DRS、SIGGRAPH 等会议和展会的日程、征稿与截止、录用与获奖结果、keynote、评委会与主办机构声明。会上某一篇具体论文的内容归研究。" },
  { key: "industry", tagColor: "orange", label: "行业", feedLabel: "行业动态", section: "行业动态", guide: "已发生的公司与机构经营、融资并购、人事与组织、工作室和团队变化、合作、版权与诉讼、政策监管、真实安全事故及其调查进展。新闻由当事人发帖、带有态度，也不因此变成观点。" },
  { key: "design-practice", tagColor: "green", label: "教程", feedLabel: "方法与实践", section: "方法与观点", guide: "读者可以照着做的工作流、提示词、工具用法、设计系统搭建与项目复盘。重点是可复用的做法；单纯发布工具归工具，只有态度和预测而无做法归观点。", commentary: true },
  { key: "design-opinion", tagColor: "purple", label: "观点", feedLabel: "观点", section: "方法与观点", guide: "设计师、研究者和从业者的解释、判断、主张、预测、评论与访谈观点。讨论设计行业不自动归行业，作者是名人不自动归观点。", commentary: true },
] as const satisfies ReadonlyArray<{ key: string; tagColor: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

/**
 * 这个行业最受关注的一类发布（设计＋AI 行业是新工具）：日报报头的“N 个新工具”、改分类后修订已出的报告都按它数。
 * category 是类别，tag 是标签，两者都对上才算；unit 接在数字后面。
 * 没有这样一类的行业设成 null，报头就不显示这个数。
 */
export const RELEASE: { category: string; tag: string; unit: string } | null = { category: "design-tools", tag: "工具更新", unit: "个新工具" };

/** 周报月报的总述可以直接写、不必在报道里找到出处的行业通用词（小写）。站名会自动算进去。 */
export const PLAIN_TERMS: readonly string[] = ["ai", "ui", "ux", "hci", "3d", "ar", "vr", "api", "gpu", "llm", "svg", "css"];

/**
 * 内容理解一步给每篇资料判的“内容类型”（写在 prompts/content-understanding.md 里，改了类型要同步改那份提示词）。
 * 评分提示词（prompts/selection-score.md）按类型给五个维度不同的权重。
 */
export const ITEM_TYPES = ["tool_release", "product_launch", "tool_or_prompt", "research_paper", "conference_event", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

// ── 标签词表 ────────────────────────────────────────────────────────────────────────────

/** 每篇资料的第一个标签必须是这些“分类标签”之一（最后一项是兜底，框架按“最后一个”当兜底用）。 */
export const CATEGORY_TAGS = [
  "工具更新", "产品发布", "论文/研究", "会议/征稿", "开源/仓库", "教程/实践", "现象/趋势", "观点/评论", "评测/基准", "行业动态", "政策/监管",
  "非设计/通用工具", "其他",
] as const;

/** 可选的主题标签。 */
export const TOPIC_TAGS = [
  "Figma 生态", "设计系统", "UI 生成", "设计与代码", "原型与交互", "生成式视觉", "图像视频模型", "3D 与空间", "Agent 交互", "对话式界面",
  "硬件与设备", "多模态", "创意支持", "人机共创", "用户研究", "可及性", "交互范式", "AI 伦理",
] as const;

/** 可选的实体标签（公司、机构、平台与会议）。 */
export const ENTITY_TAGS = ["Figma", "Adobe", "OpenAI", "Anthropic", "Google", "Apple", "Microsoft", "Cursor", "Midjourney", "MIT Media Lab", "arXiv", "CHI", "UIST", "CSCW", "DRS", "SIGGRAPH"] as const;

/** 模型常写的近义词，统一成词表里的写法。 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  "工具发布": "工具更新", "软件更新": "工具更新", "功能更新": "工具更新", 工具: "工具更新", 插件: "工具更新",
  产品: "产品发布", 上线: "产品发布", 改版: "产品发布", 发布: "产品发布",
  "产品更新": "产品发布", "模型发布": "产品发布",
  论文: "论文/研究", 研究: "论文/研究", paper: "论文/研究", papers: "论文/研究", 期刊: "论文/研究",
  会议: "会议/征稿", 征稿: "会议/征稿", cfp: "会议/征稿", 截止: "会议/征稿", 获奖: "会议/征稿", workshop: "会议/征稿",
  教程: "教程/实践", 玩法: "教程/实践", 指南: "教程/实践", 技巧: "教程/实践", 最佳实践: "教程/实践", 实践: "教程/实践", 工作流: "教程/实践",
  观点: "观点/评论", "大佬观点": "观点/评论", 访谈: "观点/评论", 评论: "观点/评论",
  "评测/基准": "评测/基准", 评测: "评测/基准", 基准: "评测/基准", 榜单: "评测/基准", benchmark: "评测/基准",
  趋势: "现象/趋势", 现象: "现象/趋势",
  "open-source": "开源/仓库", 开源: "开源/仓库", 仓库: "开源/仓库", repo: "开源/仓库",
  政策: "政策/监管", 监管: "政策/监管", 法规: "政策/监管", 版权: "行业动态", 诉讼: "行业动态",
  合作: "行业动态", 生态: "行业动态", 融资: "行业动态", 收购: "行业动态", 投资: "行业动态", 并购: "行业动态",
  行业: "行业动态", 动态: "行业动态", 公司动态: "行业动态", "合作/生态": "行业动态", "融资/收购": "行业动态",
  安全: "AI 伦理", 对齐: "AI 伦理", 无障碍: "可及性", a11y: "可及性", 可用性: "用户研究",
  "图像生成": "生成式视觉", 生图: "生成式视觉", 视频生成: "图像视频模型", "3d": "3D 与空间", 空间计算: "3D 与空间",
  智能体: "Agent 交互", agent: "Agent 交互", 非设计: "非设计/通用工具", "non-design": "非设计/通用工具", 通用工具: "非设计/通用工具",
};

// ── 公司与主体 ──────────────────────────────────────────────────────────────────────────

/**
 * 机构主题：id → 显示名、卡片上显示的标签（null 表示只用 entity:<id> 归类）、别名。
 * aliases 给结构抽取模型看；orgNames 是这个机构发消息时开头用的组织名（公司、工作室、实验室、学会），
 * 在它自己的主题页上读者知道说的是谁，可以省去；otherNames 是它的其他称呼（官方账号名、子品牌）。
 * 所有这些名字都用来认出说的是哪家机构，比如把事实的主体对到发布方。
 */
export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; orgNames?: string[]; otherNames?: string[] }> = {
  figma: { name: "Figma", displayTag: "Figma", aliases: ["Figma", "FigJam", "Figma Slides", "Figma Make", "Figma Weave", "Buzz"], orgNames: ["Figma"], otherNames: ["Figma Blog"] },
  adobe: { name: "Adobe", displayTag: "Adobe", aliases: ["Adobe", "Firefly", "Photoshop", "Illustrator", "Express", "Creative Cloud"], orgNames: ["Adobe"], otherNames: ["Adobe Blog", "Adobe Firefly"] },
  openai: { name: "OpenAI", displayTag: "OpenAI", aliases: ["OpenAI", "ChatGPT", "Sora", "Codex", "GPT"], orgNames: ["OpenAI"], otherNames: ["OpenAI Developers"] },
  io: { name: "io（Jony Ive 与 OpenAI 的硬件公司）", displayTag: null, aliases: ["io", "Jony Ive", "io Products"], orgNames: ["io", "io Products"] },
  anthropic: { name: "Anthropic", displayTag: "Anthropic", aliases: ["Anthropic", "Claude"], orgNames: ["Anthropic"], otherNames: ["Claude Code", "Claude Design"] },
  google: { name: "Google", displayTag: "Google", aliases: ["Google", "DeepMind", "Gemini", "Veo", "Stitch", "NotebookLM", "Material Design", "谷歌"], orgNames: ["Google DeepMind", "Google Research", "Google", "DeepMind", "谷歌"], otherNames: ["Google AI", "Google Labs", "Google Design"] },
  apple: { name: "Apple", displayTag: "Apple", aliases: ["Apple", "苹果", "Vision Pro", "Apple Intelligence", "Siri"], orgNames: ["Apple", "苹果"], otherNames: ["Apple Newsroom"] },
  microsoft: { name: "Microsoft", displayTag: "Microsoft", aliases: ["Microsoft", "微软", "Copilot", "Fluent Design"], orgNames: ["Microsoft Research", "Microsoft Design", "Microsoft", "微软"] },
  meta: { name: "Meta", displayTag: null, aliases: ["Meta", "Llama", "Ray-Ban"], orgNames: ["Meta AI", "Meta"], otherNames: ["AI at Meta"] },
  midjourney: { name: "Midjourney", displayTag: "Midjourney", aliases: ["Midjourney"], orgNames: ["Midjourney"] },
  runway: { name: "Runway", displayTag: null, aliases: ["Runway", "Gen-4"], orgNames: ["Runway"] },
  "stability-ai": { name: "Stability AI", displayTag: null, aliases: ["Stability AI", "Stable Diffusion"], orgNames: ["Stability AI"] },
  cursor: { name: "Cursor", displayTag: "Cursor", aliases: ["Cursor", "Anysphere"], orgNames: ["Cursor", "Anysphere"] },
  vercel: { name: "Vercel / v0", displayTag: null, aliases: ["Vercel", "v0"], orgNames: ["Vercel"], otherNames: ["v0"] },
  framer: { name: "Framer", displayTag: null, aliases: ["Framer"], orgNames: ["Framer"] },
  webflow: { name: "Webflow", displayTag: null, aliases: ["Webflow"], orgNames: ["Webflow"] },
  canva: { name: "Canva", displayTag: null, aliases: ["Canva", "Affinity"], orgNames: ["Canva"] },
  "hugging-face": { name: "Hugging Face", displayTag: null, aliases: ["Hugging Face"], orgNames: ["Hugging Face", "HuggingFace"] },
  ideo: { name: "IDEO", displayTag: null, aliases: ["IDEO", "IDEO.org", "IDEO Design Network"], orgNames: ["IDEO", "IDEO.org"] },
  pentagram: { name: "Pentagram", displayTag: null, aliases: ["Pentagram"], orgNames: ["Pentagram"] },
  "teenage-engineering": { name: "Teenage Engineering", displayTag: null, aliases: ["Teenage Engineering", "TE-1", "OB-4"], orgNames: ["Teenage Engineering"] },
  "mit-media-lab": { name: "MIT Media Lab", displayTag: "MIT Media Lab", aliases: ["MIT Media Lab", "Media Lab", "媒体实验室"], orgNames: ["MIT Media Lab", "Media Lab"] },
  acm: { name: "ACM", displayTag: null, aliases: ["ACM", "Association for Computing Machinery", "美国计算机学会"], orgNames: ["ACM", "Association for Computing Machinery", "ACM SIGCHI"] },
};

/**
 * 身份词典：摘要和标题里出现的机构，必须在原文里也出现过，否则退回原标题、丢掉摘要（防止模型张冠李戴）。
 * 行业没有这个问题时可以留空数组。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "figma", name: "Figma", patterns: [/\bfigma\b/i, /\bfigjam\b|\bfigma (?:slides|make|weave|ai|buzz)\b/i] },
  { id: "adobe", name: "Adobe", patterns: [/\badobe\b|火神|firefly/i, /\bphotoshop\b|\billustrator\b|\bcreative cloud\b|\badobe express\b/i] },
  { id: "openai", name: "OpenAI", patterns: [/openai|chatgpt|\bgpt-?[o\d]|\bsora\b|\bcodex\b/i] },
  { id: "io", name: "io（Jony Ive 硬件）", patterns: [/jony ive|\bio products\b/i] },
  { id: "anthropic", name: "Anthropic", patterns: [/anthropic|\bclaude\b/i] },
  { id: "google", name: "Google / DeepMind", patterns: [/google|deepmind|\bgemini\b|\bveo\s?\d|notebooklm|\bstitch\b|material design|谷歌/i] },
  { id: "apple", name: "Apple", patterns: [/\bapple\b|苹果|vision pro|apple intelligence|\bsiri\b/i] },
  { id: "microsoft", name: "Microsoft / Copilot", patterns: [/microsoft|copilot|微软|fluent design/i] },
  { id: "meta", name: "Meta", patterns: [/\bMeta\b/, /\bmeta\s?ai\b|\bllama\b|ray-ban/i] },
  { id: "midjourney", name: "Midjourney", patterns: [/midjourney/i] },
  { id: "runway", name: "Runway", patterns: [/\brunway\b/i, /\bgen-[34]\b/i] },
  { id: "stability-ai", name: "Stability AI", patterns: [/stability\s?ai|stable diffusion/i] },
  { id: "cursor", name: "Cursor", patterns: [/\bcursor\b|anysphere/i] },
  { id: "vercel", name: "Vercel / v0", patterns: [/vercel|\bv0\b/i] },
  { id: "framer", name: "Framer", patterns: [/\bframer\b/i] },
  { id: "webflow", name: "Webflow", patterns: [/webflow/i] },
  { id: "canva", name: "Canva", patterns: [/\bcanva\b|affinity/i] },
  { id: "hugging-face", name: "Hugging Face", patterns: [/hugging\s?face/i] },
  { id: "ideo", name: "IDEO", patterns: [/\bIDEO\b/] },
  { id: "pentagram", name: "Pentagram", patterns: [/pentagram/i] },
  { id: "teenage-engineering", name: "Teenage Engineering", patterns: [/teenage engineering/i] },
  { id: "mit-media-lab", name: "MIT Media Lab", patterns: [/media lab|媒体实验室/i] },
  { id: "acm", name: "ACM", patterns: [/\bACM\b/, /association for computing machinery|sigchi/i] },
];

/** 这些域名上的文章，发布方就是对应的机构（托管平台如 GitHub、arXiv 不算）。 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "figma", domains: ["figma.com"] },
  { entityId: "adobe", domains: ["blog.adobe.com"] },
  { entityId: "openai", domains: ["openai.com"] },
  { entityId: "anthropic", domains: ["anthropic.com", "claude.com"] },
  { entityId: "google", domains: ["deepmind.google", "ai.google", "blog.google"] },
  { entityId: "apple", domains: ["apple.com"] },
  { entityId: "microsoft", domains: ["microsoft.com"] },
  { entityId: "meta", domains: ["ai.meta.com", "about.fb.com"] },
  { entityId: "cursor", domains: ["cursor.com"] },
  { entityId: "canva", domains: ["canva.com"] },
  { entityId: "mit-media-lab", domains: ["media.mit.edu"] },
  { entityId: "acm", domains: ["acm.org"] },
];

/** 原文里的这些写法也算提到了对应机构。 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [
  { entityId: "meta", pattern: /@AIatMeta\b/i },
  { entityId: "acm", pattern: /\bSIGCHI\b/ },
];
