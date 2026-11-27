const cms = window.CMS;
const editorComponents = new Map();

function registerEditorComponent(component) {
  editorComponents.set(component.id, component);
  cms.registerEditorComponent(component);
}

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

const decodeHTML = (value) => {
  const container = document.createElement("textarea");
  container.innerHTML = value;
  return container.value;
};

const bilibiliBlock = ({ bvid }) => {
  if (!/^BV[0-9A-Za-z]{10}$/.test(bvid ?? "")) return "";
  return `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&amp;autoplay=0" title="B 站视频" loading="lazy" allowfullscreen style="width: 100%; aspect-ratio: 16 / 9; border: 0"></iframe>`;
};

registerEditorComponent({
  id: "season-bilibili",
  label: "插入 B 站视频",
  fields: [{ name: "bvid", label: "BV 号", widget: "string", pattern: ["^BV[0-9A-Za-z]{10}$", "请输入完整的 BV 号"] }],
  pattern: /^<iframe src="https:\/\/player\.bilibili\.com\/player\.html\?bvid=(BV[0-9A-Za-z]{10})&amp;autoplay=0"[^>]*><\/iframe>$/,
  fromBlock: ([, bvid]) => ({ bvid }),
  toBlock: bilibiliBlock,
  toPreview: ({ bvid }) => `<p>B 站视频：${escapeHTML(bvid)}</p>`,
});

registerEditorComponent({
  id: "season-spoiler",
  label: "剧透折叠",
  fields: [
    { name: "summary", label: "折叠标题", widget: "string", default: "点击展开剧透" },
    { name: "content", label: "剧透内容", widget: "text" },
  ],
  pattern: /^<details><summary>([^<]*)<\/summary><p>([\s\S]*?)<\/p><\/details>$/,
  fromBlock: ([, summary, content]) => ({
    summary: decodeHTML(summary),
    content: decodeHTML(content.replaceAll("<br>", "\n")),
  }),
  toBlock: ({ summary, content }) =>
    `<details><summary>${escapeHTML(summary)}</summary><p>${escapeHTML(content).replace(/\r?\n/g, "<br>")}</p></details>`,
  toPreview: ({ summary, content }) => `<details><summary>${escapeHTML(summary)}</summary><p>${escapeHTML(content).replace(/\r?\n/g, "<br>")}</p></details>`,
});

registerEditorComponent({
  id: "season-code",
  label: "代码块",
  fields: [
    { name: "language", label: "语言", widget: "string", default: "swift", pattern: ["^[a-zA-Z0-9_+-]+$", "请输入代码语言，例如 swift"] },
    { name: "code", label: "代码", widget: "text" },
  ],
  pattern: /^(\x60{3,}|~{3,})([\w+-]+)\n([\s\S]*?)\n\1$/,
  fromBlock: ([, , language, code]) => ({ language, code }),
  toBlock: ({ language, code = "" }) => {
    const longestRun = Math.max(2, ...(code.match(/~+/g) ?? []).map((run) => run.length));
    const fence = "~".repeat(longestRun + 1);
    const info = /^[\w+-]+$/.test(language ?? "") ? language : "text";
    return `${fence}${info}\n${code}\n${fence}`;
  },
  toPreview: ({ code }) => `<pre><code>${escapeHTML(code)}</code></pre>`,
});

const writingTemplates = {
  tech: { label: "技术文", headings: ["问题", "解决过程", "结果"] },
  recipe: { label: "菜谱", headings: ["用料", "步骤", "食材替换"] },
  travel: { label: "游记", headings: ["路线", "花费", "体验"] },
  acg: { label: "ACG 评论", headings: ["无剧透评价", "剧透讨论"] },
};

for (const [id, template] of Object.entries(writingTemplates)) {
  registerEditorComponent({
    id: `season-template-${id}`,
    label: `写作模板 · ${template.label}`,
    fields: [{
      name: "body",
      label: "模板正文",
      widget: "text",
      default: template.headings.map((heading) => `## ${heading}\n\n在这里写正文。`).join("\n\n"),
    }],
    pattern: new RegExp(`^<!-- season-template:${id} -->\\n([\\s\\S]*?)\\n<!-- /season-template:${id} -->$`),
    fromBlock: ([, body]) => ({ body }),
    toBlock: ({ body }) => `<!-- season-template:${id} -->\n\n${(body || template.headings.map((heading) => `## ${heading}`).join("\n\n")).trim()}\n\n<!-- /season-template:${id} -->`,
    toPreview: ({ body }) => `<pre class="season-template-preview">${escapeHTML(body || template.headings.join("\n"))}</pre>`,
  });
}

const calloutLabels = { note: "注意", tip: "小技巧", substitution: "食材替换" };
const calloutBlock = ({ kind, content }) => {
  const type = Object.hasOwn(calloutLabels, kind) ? kind : "note";
  return `<aside class="season-callout" data-kind="${type}"><strong>${calloutLabels[type]}</strong><p>${escapeHTML(content).replace(/\r?\n/g, "<br>")}</p></aside>`;
};

registerEditorComponent({
  id: "season-callout",
  label: "提示框",
  fields: [
    { name: "kind", label: "类型", widget: "select", default: "note", options: Object.entries(calloutLabels).map(([value, label]) => ({ value, label })) },
    { name: "content", label: "内容", widget: "text" },
  ],
  pattern: /^<aside class="season-callout" data-kind="(note|tip|substitution)"><strong>[^<]*<\/strong><p>([\s\S]*?)<\/p><\/aside>$/,
  fromBlock: ([, kind, content]) => ({ kind, content: decodeHTML(content.replaceAll("<br>", "\n")) }),
  toBlock: calloutBlock,
  toPreview: calloutBlock,
});

registerEditorComponent({
  id: "season-divider",
  label: "分隔线",
  fields: [],
  pattern: /^<hr class="season-divider">$/,
  fromBlock: () => ({}),
  toBlock: () => '<hr class="season-divider">',
  toPreview: () => "<hr>",
});

const publicBlogUrl = "https://seasonzhu.github.io";
const cmsPreviewBase = ["localhost", "127.0.0.1"].includes(window.location.hostname) ? "" : publicBlogUrl;

function markdownWithoutCode(body) {
  return body.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm, "")
    .replace(/`[^`\n]+`/g, "");
}

function shortSummary(body) {
  const paragraph = markdownWithoutCode(body).replace(/^ {0,3}#{1,6}[ \t].*$/gm, "").split(/\n\s*\n/).map((part) =>
    part.replace(/<!--[^]*?-->/g, "").replace(/!\[[^\]]*\]\([^\n]*?\)/g, "")
      .replace(/\[([^\]]+)\]\([^\n]*?\)/g, "$1").replace(/<[^>]+>/g, "")
      .replace(/^\s*(?:#+|>|[-*+]\s)\s*/gm, "").trim().replace(/\s+/g, " "),
  ).find(Boolean) ?? "";
  const chars = Array.from(paragraph);
  return chars.length > 120 ? `${chars.slice(0, 120).join("")}…` : paragraph;
}

function articleMetadata(data) {
  const body = String(data.get("body") ?? "");
  const quick = data.get("quickPost") === true;
  return {
    summary: String(data.get("description") ?? "").trim() || (quick ? shortSummary(body) : ""),
    category: data.get("category") || (quick ? "随笔" : ""),
  };
}

cms.registerEventListener({
  name: "preSave",
  handler: ({ entry }) => {
    const data = entry.get("data");
    if (!data.has("published")) return data;
    const { summary, category } = articleMetadata(data);
    const linkedBook = Boolean(String(data.get("readingTitle") ?? "").trim());
    if (linkedBook !== Boolean(data.get("readingYear"))) {
      throw new Error("请同时填写阅读年份和书名，或同时留空。");
    }
    if (!summary) throw new Error("请填写摘要。快捷短文也可以通过一段正文生成摘要。");
    return data.set("description", summary).set("category", category || null);
  },
});

function inspectMarkdown(body, image, pathname) {
  const text = markdownWithoutCode(body);
  const links = [
    ...[...text.matchAll(/(!?)\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))/g)]
      .map(([, imageMarker, enclosed, plain]) => ({ value: enclosed || plain, image: Boolean(imageMarker) })),
    ...[...text.matchAll(/<(img|a)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)]
      .map(([, tag, value]) => ({ value, image: tag.toLowerCase() === "img" })),
  ];
  if (image) links.push({ value: image, image: true });

  const localImages = new Set();
  const internalLinks = new Set();
  const base = new URL(pathname, publicBlogUrl);
  for (const { value, image: isImage } of links) {
    const raw = value.trim();
    if (isImage && (/^(?:file:|[a-z]:[\\/]|~\/|\/(?:Users|home|var\/folders)\/)/i.test(raw) ||
      (!/^(?:\/|https?:|blob:|data:)/i.test(raw)))) {
      localImages.add(raw);
      continue;
    }
    if (!raw || raw.startsWith("#")) continue;
    try {
      const parsed = new URL(raw, base);
      if (parsed.origin === publicBlogUrl) {
        parsed.hash = "";
        internalLinks.add(parsed.href);
      }
    } catch {
      // 无法解析的路径由具体字段或编辑器处理。
    }
  }
  return {
    localImages: [...localImages],
    internalLinks: [...internalLinks],
    hasNotePlaceholder: /<image\b[^>]*\bname\s*=|\[(?:图片|插图|image)(?:占位)?\]/i.test(text),
  };
}

const PostPreview = window.createClass({
  getInitialState() {
    return { mode: "article", checked: null, checking: false };
  },
  componentDidMount() {
    this.previewRequest = new AbortController();
    fetch(`${cmsPreviewBase}/admin/post-preview.json`, { signal: this.previewRequest.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((site) => { if (site && !this.previewRequest.signal.aborted) this.setState({ site }); })
      .catch(() => {});
  },
  componentWillUnmount() {
    this.previewRequest?.abort();
    this.linkRequest?.abort();
    this.linkRequest = undefined;
    this.deploymentRequest?.abort();
    this.deploymentRequest = undefined;
  },
  async checkLinks(links, signature) {
    this.linkRequest?.abort();
    const request = new AbortController();
    const timeout = window.setTimeout(() => request.abort(), 8000);
    this.linkRequest = request;
    this.setState({ checking: true, checked: null });
    const checked = links.slice(0, 30);
    const results = await Promise.all(checked.map(async (hr) => {
      try {
        const response = await fetch(hr, { method: "HEAD", signal: request.signal });
        return { url: hr, status: response.status };
      } catch {
        return { url: hr, status: 0 };
      }
    }));
    window.clearTimeout(timeout);
    if (this.linkRequest === request) this.setState({ checking: false, checked: { signature, results } });
  },
  async checkDeployment(articleUrl) {
    this.deploymentRequest?.abort();
    const request = new AbortController();
    this.deploymentRequest = request;
    const timeout = setTimeout(() => request.abort(), 8000);
    this.setState({ deployment: { articleUrl, loading: true } });
    const actions = "https://api.github.com/repos/seasonZhu/seasonZhu.github.io/actions/workflows/deploy.yml/runs?branch=main&per_page=1";
    const [workflow, publicPage] = await Promise.allSettled([
      fetch(actions, { signal: request.signal, cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()).workflow_runs?.[0];
      }),
      fetch(articleUrl, { method: "HEAD", signal: request.signal, cache: "no-store" }).then((response) => response.status),
    ]);
    clearTimeout(timeout);
    if (this.deploymentRequest !== request) return;
    this.setState({ deployment: {
      articleUrl, run: workflow.value, pageStatus: publicPage.value,
    } });
  },
  async copyArticleUrl(articleUrl) {
    try {
      await navigator.clipboard.writeText(articleUrl);
      this.setState({ copyMessage: "已复制文章链接。" });
    } catch {
      const link = this.publicLink;
      if (link) {
        const selection = link.ownerDocument.createRange();
        selection.selectNodeContents(link);
        const current = link.ownerDocument.getSelection();
        current?.removeAllRanges();
        current?.addRange(selection);
      }
      this.setState({ copyMessage: "浏览器禁止自动复制，请手动复制选中的地址。" });
    }
  },
  render() {
    const { entry, widgetFor, getAsset } = this.props;
    const data = entry.get("data");
    const h = window.h;
    const image = resolvePreviewImage(data.get("image"), getAsset);
    const title = data.get("title") || "文章标题";
    const { summary, category } = articleMetadata(data);
    const date = data.get("published");
    const slug = data.get("permalink") || entry.get("slug");
    const { localImages, internalLinks, hasNotePlaceholder } = inspectMarkdown(
      String(data.get("body") ?? ""), String(data.get("image") ?? ""), slug ? `/blog/${slug}/` : "/blog/",
    );
    const { mode, checked, checking, site, copyMessage } = this.state;
    const articleUrl = slug && !data.get("draft")
      ? `${publicBlogUrl}/blog/${slug.split("/").map(encodeURIComponent).join("/")}/` : "";
    const deployment = this.state.deployment?.articleUrl === articleUrl ? this.state.deployment : null;
    const run = deployment?.run;
    const workflowUrl = "https://github.com/seasonZhu/seasonZhu.github.io/actions/workflows/deploy.yml";
    const buildStatus = !run ? "见工作流状态徽章"
      : run.status !== "completed" ? (run.status === "queued" ? "排队中" : "部署处理中")
      : ({ success: "成功", failure: "失败", cancelled: "已取消" }[run.conclusion] ?? "已结束，请查看日志");
    const pageStatus = deployment?.pageStatus;
    const online = pageStatus >= 200 && pageStatus < 300;
    const release = articleUrl && h("aside", { className: "season-publish-checklist", "aria-label": "文章链接与部署" },
      h("h2", null, "文章链接与部署"),
      h("p", { className: "season-release-url" }, h("a", { href: articleUrl, ref: (element) => { this.publicLink = element; }, target: "_blank", rel: "noopener noreferrer" }, articleUrl)),
      h("button", { type: "button", onClick: () => this.copyArticleUrl(articleUrl) }, "复制链接"), " ",
      h("button", { type: "button", disabled: deployment?.loading,
        onClick: () => this.checkDeployment(articleUrl) }, deployment?.loading ? "检查中…" : "检查部署状态"), " ",
      h("a", { href: run?.html_url || workflowUrl, target: "_blank", rel: "noopener noreferrer" }, "GitHub Actions 日志"),
      h("p", null, h("a", { href: workflowUrl, target: "_blank", rel: "noopener noreferrer" },
        h("img", { src: `${workflowUrl}/badge.svg?branch=main`, alt: "GitHub Actions 的 main 部署状态" }))),
      online && h("p", null, h("a", { href: `${articleUrl}#article-share`, target: "_blank", rel: "noopener noreferrer" }, "打开文章的分享图区")),
      deployment && !deployment.loading && h("p", { role: "status" },
        `main 最新部署：${buildStatus}。文章地址：${online ? "已可访问" : pageStatus === 404 ? "尚未上线" : "暂时无法确认"}。`),
      copyMessage && h("p", { role: "status" }, copyMessage),
    );
    const signature = internalLinks.join("\n");
    const results = checked?.signature === signature ? checked.results : [];
    const warnings = results.filter(({ status }) => status === 404 || status === 410);
    const unknown = results.filter(({ status }) => status === 0 || status >= 400 && status !== 404 && status !== 410);
    const extra = Boolean(data.get("readingYear")) !== Boolean(String(data.get("readingTitle") ?? "").trim());
    const checklist = h("aside", { className: "season-publish-checklist", "aria-label": "发布前检查" },
      h("h2", null, "发布前检查"),
      h("ul", null,
        h("li", null, `摘要 · ${summary ? (data.get("description") ? "已填写" : "保存时自动生成") : "建议用一句话概括文章"}`),
        h("li", null, `栏目 · ${category ? (data.get("category") ? "已选择" : "保存时使用随笔") : "建议选择一个栏目"}`),
        h("li", null, `封面替代文字 · ${!image ? "无封面，跳过" : String(data.get("imageAlt") ?? "").trim() ? "已填写" : "建议描述图片主体，装饰图可留空"}`),
        extra && h("li", null, "书单关联 · 请同时填写阅读年份和书名。"),
        hasNotePlaceholder && h("li", null, "便签导入 · 正文仍有便签图片占位符。"),
        ...localImages.map((src) => h("li", { key: src }, `图片路径需要核对：${src}`)),
      ),
      h("button", {
        type: "button", disabled: checking || !internalLinks.length,
        onClick: () => this.checkLinks(internalLinks, signature),
      }, checking ? "检查中…" : `检查站内链接（${internalLinks.length}）`),
      results.length > 0 && h("p", { role: "status" },
        `检查了 ${results.length} 条：${warnings.length} 条未找到，${unknown.length} 条无法确认。按当前线上站点判断，未发布页面可能尚不可访问。`,
      ),
      ...warnings.map(({ url }) => h("p", { key: url }, `线上链接未找到：${url}`)),
    );
    const tabs = h("div", { className: "season-preview-modes", role: "group", "aria-label": "预览模式" },
      ...[["article", "文章"], ["phone", "手机"], ["poster", "分享图"]].map(([key, label]) =>
        h("button", { type: "button", key, "aria-pressed": mode === key, onClick: () => this.setState({ mode: key }) }, label),
      ),
    );
    const content = mode === "poster"
      ? h("div", { className: "season-poster-preview", style: { "--poster-hue": site?.hue ?? 255 } },
          h("strong", null, site?.title || "Season Blog"),
          h("img", { src: image || site?.banner || `${publicBlogUrl}/images/presets/starry.webp`, alt: "分享图封面裁剪预览" }),
          h("h1", null, title),
          h("p", null, summary),
          h("footer", null, "正式二维码在文章发布后生成"),
        )
      : h("div", { className: mode === "phone" ? "season-phone-preview" : undefined },
          h("h1", null, title),
          h("div", { className: "season-post-meta" }, [date, category].filter(Boolean).join(" · ")),
          image && h("img", { className: "season-post-cover", src: image, alt: String(data.get("imageAlt") ?? "").trim() }),
          h("div", { className: "season-post-body" }, widgetFor("body")),
        );

    return h("article", { className: "season-post-preview" }, checklist, release, tabs, content);
  },
});

function resolvePreviewImage(value, getAsset) {
  if (!value) return "";
  const source = String(getAsset(value) || value);
  return source.startsWith("/") ? `https://seasonzhu.github.io${source}` : source;
}

function AppearancePreview({ entry, getAsset }) {
  const settings = entry.get("data");
  const amber = settings.get("preset") === "amber";
  const accent = amber ? "#b85a09" : "#4b65d1";
  const position = settings.get("bannerPosition") || "center";
  const avatar = resolvePreviewImage(settings.get("avatar"), getAsset);
  const banner = resolvePreviewImage(settings.get("banner"), getAsset) ||
    `https://seasonzhu.github.io/images/presets/${amber ? "amber" : "starry"}.webp`;
  const previewBanner = (label, height) => window.h("section", { key: label },
    window.h("p", null, label),
    window.h("img", {
      src: banner, alt: "横幅预览",
      style: { width: "100%", height, objectFit: "cover", objectPosition: position, borderRadius: 8 },
    }),
  );

  return window.h("div", { style: { padding: 20, color: "#242733", fontFamily: "system-ui" } },
    window.h("h2", { style: { color: accent } }, amber ? "琥珀街景" : "星间夜色"),
    avatar
      ? window.h("img", { src: avatar, alt: "头像预览", style: { width: 80, height: 80, objectFit: "cover", borderRadius: 12 } })
      : window.h("p", null, "默认头像"),
    previewBanner("桌面横幅", 180),
    window.h("div", { style: { maxWidth: 390 } }, previewBanner("手机横幅", 150)),
  );
}

const markdownWidget = cms.getWidget("markdown");
const toolbarActions = [
  ["season-bilibili", "B 站视频"],
  ["season-spoiler", "剧透折叠"],
  ["season-code", "代码块"],
  ["season-callout", "提示框"],
  ["season-divider", "分隔线"],
];

const fieldUpdates = new EventTarget();
const readingYears = new EventTarget();
let activeReadingYear = "";
const importLabels = { title: "标题", description: "摘要", published: "发布日期", tags: "标签" };

for (const [name, type] of Object.entries({
  title: "string", description: "text", published: "datetime", tags: "list",
  readingYear: "string", readingTitle: "string",
})) {
  const widget = cms.getWidget(type);
  const Control = window.createClass({
    getInitialState() { return { books: {}, year: activeReadingYear }; },
    componentDidMount() {
      fieldUpdates.addEventListener(name, this.applyValue);
      if (name === "readingYear") this.sendYear();
      if (name === "readingTitle") {
        readingYears.addEventListener("change", this.changeYear);
        this.request = new AbortController();
        fetch(`${cmsPreviewBase}/admin/reading-books.json`, { signal: this.request.signal })
          .then((response) => {
            if (!response.ok) throw new Error("书单不可用");
            return response.json();
          })
          .then((books) => this.setState({ books }))
          .catch((error) => {
            if (error.name !== "AbortError") this.setState({ unavailable: true });
          });
      }
    },
    componentDidUpdate(previous) {
      if (name === "readingYear" && previous.value !== this.props.value) this.sendYear();
    },
    componentWillUnmount() {
      fieldUpdates.removeEventListener(name, this.applyValue);
      readingYears.removeEventListener("change", this.changeYear);
      this.request?.abort();
    },
    sendYear() {
      activeReadingYear = String(this.props.value ?? "");
      readingYears.dispatchEvent(new CustomEvent("change", { detail: activeReadingYear }));
    },
    changeYear(event) { this.setState({ year: event.detail }); },
    applyValue(event) {
      this.props.onChange(event.detail);
      if (name === "tags") this.setState(({ revision = 0 }) => ({ revision: revision + 1 }));
    },
    render() {
      const h = window.h;
      const input = h(widget.control, { ...this.props, key: this.state.revision });
      if (name !== "readingTitle") return input;
      const { books, year, unavailable } = this.state;
      const titles = books[year] ?? [];
      return h("div", null, input,
        titles.length > 0 && h("select", {
          "aria-label": "从年度书单选书", className: "season-book-select", value: "",
          onChange: (event) => this.props.onChange(event.currentTarget.value),
        }, h("option", { value: "" }, `从 ${year} 年书单选书`),
        ...titles.map((title) => h("option", { key: title, value: title }, title))),
        unavailable && h("small", null, "书单暂时无法加载，可以手动填写书名。"),
      );
    },
  });
  cms.registerWidget(`season-${name.toLowerCase()}`, Control, widget.preview, widget.schema);
}

async function readMarkdown(contents) {
  const text = contents.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const frontmatter = text.match(/^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/);
  if (!frontmatter || !/^[\w\u3400-\u9fff-]+[ \t]*:/m.test(frontmatter[1])) {
    return { body: text, fields: {} };
  }
  const body = text.slice(frontmatter[0].length);
  try {
    const { parse } = await import("https://cdn.jsdelivr.net/npm/yaml@2.8.2/browser/index.js");
    const data = parse(frontmatter[1]) ?? {};
    const fields = {};
    for (const name of ["title", "description"]) {
      if (typeof data[name] === "string" && data[name].trim()) fields[name] = data[name].trim();
    }
    const date = data.published ?? data.date;
    const day = typeof date === "string" && date.match(/^\d{4}-\d{2}-\d{2}(?=$|T| )/)?.[0];
    if (day && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day) fields.published = day;
    const tags = typeof data.tags === "string" ? data.tags.split(/[,，]/) : data.tags;
    if (Array.isArray(tags)) {
      const values = [...new Set(tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))];
      if (values.length) fields.tags = values;
    }
    return { body, fields };
  } catch {
    return { body, fields: {}, warning: "无法读取元数据，仍可导入正文。" };
  }
}

function cleanNote(text) {
  return text.replace(/\r\n?/g, "\n")
    .replace(/<image\b[^>]*\bname\s*=[^>]*>(?:<\/image>)?|\[(?:图片|插图|image)(?:占位)?\]/gi, "")
    .replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

const WritingControl = window.createClass({
  getInitialState() {
    return { templates: [], action: null, values: {}, revision: 0, status: "" };
  },
  componentDidMount() {
    this.loadTemplates();
  },
  componentWillUnmount() {
    this.templateRequest?.abort();
  },
  async loadTemplates() {
    this.templateRequest?.abort();
    const request = new AbortController();
    this.templateRequest = request;
    try {
      const response = await fetch(`${cmsPreviewBase}/admin/writing-templates.json`, {
        cache: "no-store",
        signal: request.signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      const { templates } = await response.json();
      this.setState({ templates: templates ?? [], status: "" });
    } catch (error) {
      if (error.name !== "AbortError") this.setState({ status: "写作模板暂时无法加载，请重试。" });
    }
  },
  replaceBody(body, status) {
    this.props.onChange(body);
    this.setState(({ revision }) => ({ revision: revision + 1, status, action: null, pending: null }));
  },
  openImage() {
    const trigger = this.root.querySelector('button[title="添加组件"], button[title="Add component"]');
    if (!trigger) {
      this.setState({ status: "先切换到富文本模式，再插入图片。" });
      return;
    }
    const pickers = () => [...this.root.querySelectorAll("button")].filter((button) =>
      /^(选择图片|Choose an image|Choose image)$/i.test(button.textContent.trim()));
    const previous = new Set(pickers());
    const menuTrigger = trigger.parentElement;
    // 在快捷按钮的点击派发结束后打开菜单，避免 Decap 将它当作外部点击关闭。
    window.setTimeout(() => {
      if (!this.root) return;
      if (menuTrigger.getAttribute("aria-expanded") !== "true") menuTrigger.click();
      requestAnimationFrame(() => {
        const item = [...this.root?.querySelectorAll('[role="menuitem"]') ?? []]
          .find((node) => /^(Image|图片)$/.test(node.textContent.trim()));
        if (!item) {
          this.setState({ status: "选图菜单未打开，请使用编辑器的「添加组件 → Image」。" });
          return;
        }
        item.click();
        requestAnimationFrame(() => {
          if (this.root) pickers().find((button) => !previous.has(button))?.click();
        });
      });
    }, 0);
  },
  insert(text) {
    if (!text?.trim()) {
      this.setState({ status: "没有可插入的正文。" });
      return;
    }
    const current = String(this.props.value ?? "");
    const body = text.replace(/^\n+|\n+$/g, "");
    this.replaceBody(current.trim() ? `${current.replace(/\n+$/, "")}\n\n${body}` : body, "已追加到正文末尾。");
  },
  async importMarkdown(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name)) {
      this.setState({ status: "请选择 .md 或 .markdown 文件。" });
      return;
    }
    try {
      const pending = await readMarkdown(await file.text());
      this.setState({ action: "import", pending, selected: {}, status: "" });
    } catch {
      this.setState({ status: "读取文件失败，请检查文件后重试。" });
    }
  },
  showAction(id) {
    const component = editorComponents.get(id);
    if (component.fields.length === 0) {
      this.insert(component.toBlock({}));
      return;
    }
    this.setState({
      action: id,
      values: Object.fromEntries(component.fields.map((field) => [field.name, field.default ?? ""])),
      status: "",
    });
  },
  renderAction() {
    const { action, pending, selected, note = "" } = this.state;
    const h = window.h;
    const cancel = h("button", { type: "button", onClick: () => this.setState({ action: null, pending: null }) }, "取消");
    if (action === "note") {
      const cleaned = cleanNote(note);
      return h("div", { className: "season-writing-fields" },
        h("label", null, "粘贴便签", h("textarea", { rows: 5, value: note,
          onChange: (event) => this.setState({ note: event.currentTarget.value }) })),
        h("label", null, "整理预览", h("textarea", { rows: 5, value: cleaned, readOnly: true })),
        h("button", { type: "button", disabled: !cleaned, onClick: () => {
          if (!String(this.props.value ?? "").trim() || window.confirm("用整理后的便签替换当前正文？")) {
            this.replaceBody(cleaned, "已替换正文。");
          }
        } }, "替换正文"), cancel);
    }
    if (action === "import" && pending) {
      return h("div", { className: "season-writing-fields" },
        h("p", null, pending.warning || "正文将追加到末尾。勾选的字段会覆盖表单中的对应值。"),
        ...Object.entries(pending.fields).map(([name, value]) =>
          h("label", { key: name, className: "season-import-option" },
            h("input", { type: "checkbox", checked: Boolean(selected[name]),
              onChange: (event) => this.setState({ selected: { ...selected, [name]: event.currentTarget.checked } }) }),
            `${importLabels[name]}：${Array.isArray(value) ? value.join("、") : value}`)),
        h("label", null, "正文预览", h("textarea", { rows: 4, value: pending.body, readOnly: true })),
        h("button", { type: "button", disabled: !pending.body.trim() && !Object.values(selected).some(Boolean),
          onClick: () => {
            for (const [name, value] of Object.entries(pending.fields)) {
              if (selected[name]) fieldUpdates.dispatchEvent(new CustomEvent(name, { detail: value }));
            }
            if (pending.body.trim()) this.insert(pending.body);
            else this.setState({ action: null, pending: null, status: "已带入所选字段。" });
          } }, "确认导入"), cancel);
    }
    const component = editorComponents.get(action);
    if (!component) return null;
    return h("div", { className: "season-writing-fields" },
      ...component.fields.map((field) => {
        const props = {
          value: this.state.values[field.name],
          onChange: (event) => {
            const value = event.currentTarget.value;
            this.setState(({ values }) => ({ values: { ...values, [field.name]: value } }));
          },
        };
        return h("label", { key: field.name }, field.label,
          field.widget === "select"
            ? h("select", props, ...field.options.map(({ value, label }) => h("option", { key: value, value }, label)))
            : h(field.widget === "text" ? "textarea" : "input", props),
        );
      }),
      h("button", { type: "button", onClick: () => {
        const invalid = component.fields.find(({ name, pattern }) => pattern && !new RegExp(pattern[0]).test(this.state.values[name]));
        if (invalid) this.setState({ status: invalid.pattern[1] });
        else this.insert(component.toBlock(this.state.values));
      } }, "插入正文"),
      h("button", { type: "button", onClick: () => this.setState({ action: null, status: "" }) }, "取消"),
    );
  },
  render() {
    const h = window.h;
    const { templates, revision, status } = this.state;
    return h("div", { className: this.props.classNameWrapper, ref: (element) => { this.root = element; } },
      h("div", { className: "season-writing-toolbar", role: "group", "aria-label": "正文快捷操作" },
        h("div", { className: "season-writing-row" },
          h("button", { type: "button", onMouseDown: (event) => event.preventDefault(), onClick: this.openImage }, "插入图片"),
          h("button", { type: "button", onClick: () => this.setState({ action: "note", status: "", note: "" }) }, "整理便签"),
          ...toolbarActions.map(([id, label]) => h("button", { key: id, type: "button", onClick: () => this.showAction(id) }, label)),
          h("button", { type: "button", onClick: () => this.fileInput.click() }, "导入 Markdown"),
          h("input", { type: "file", accept: ".md,.markdown,text/markdown", hidden: true,
            ref: (element) => { this.fileInput = element; }, onChange: this.importMarkdown }),
        ),
        templates.length > 0 && h("div", { className: "season-writing-row" },
          h("span", null, "写作模板"),
          ...templates.map(({ name, body }, index) => h("button", { key: index, type: "button", onClick: () => this.insert(body) }, name)),
        ),
        h("small", { className: "season-local-backup" },
          "未保存的编辑可从当前浏览器的本机备份恢复。跨设备续写请保存到工作流。"),
        this.renderAction(),
        status && h("p", { role: "status" }, status),
        status === "写作模板暂时无法加载，请重试。" &&
          h("button", { type: "button", onClick: this.loadTemplates }, "重新加载模板"),
      ),
      h(markdownWidget.control, { ...this.props, key: revision }),
    );
  },
});

cms.registerWidget("season-writing", WritingControl, markdownWidget.preview, markdownWidget.schema);

cms.registerPreviewStyle("/admin/editor-preview.css");
cms.registerPreviewTemplate("posts", PostPreview);
cms.registerPreviewTemplate("appearance", AppearancePreview);
cms.init();
