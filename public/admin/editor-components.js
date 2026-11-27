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

function PostPreview({ entry, widgetFor, getAsset }) {
  const data = entry.get("data");
  const image = resolvePreviewImage(data.get("image"), getAsset);
  const date = data.get("published");

  return window.h("article", { className: "season-post-preview" },
    window.h("h1", null, data.get("title") || "文章标题"),
    window.h("div", { className: "season-post-meta" }, [date, data.get("category")].filter(Boolean).join(" · ")),
    image && window.h("img", { className: "season-post-cover", src: image, alt: "文章封面" }),
    window.h("div", { className: "season-post-body" }, widgetFor("body")),
  );
}

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

function getMarkdownBody(contents) {
  const text = contents.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const frontmatter = text.match(/^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/);
  return frontmatter && /^[\w\u3400-\u9fff-]+[ \t]*:/m.test(frontmatter[1])
    ? text.slice(frontmatter[0].length)
    : text;
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
      const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      const base = local ? "" : "https://seasonzhu.github.io";
      const response = await fetch(`${base}/admin/writing-templates.json`, {
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
  insert(text) {
    if (!text?.trim()) {
      this.setState({ status: "没有可插入的正文。" });
      return;
    }
    const current = String(this.props.value ?? "");
    const body = text.replace(/^\n+|\n+$/g, "");
    this.props.onChange(current.trim() ? `${current.replace(/\n+$/, "")}\n\n${body}` : body);
    this.setState(({ revision }) => ({ revision: revision + 1, status: "已追加到正文末尾。", action: null }));
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
      this.insert(getMarkdownBody(await file.text()));
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
    const component = editorComponents.get(this.state.action);
    if (!component) return null;
    const h = window.h;
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
    return h("div", { className: this.props.classNameWrapper },
      h("div", { className: "season-writing-toolbar", role: "group", "aria-label": "正文快捷操作" },
        h("div", { className: "season-writing-row" },
          ...toolbarActions.map(([id, label]) => h("button", { key: id, type: "button", onClick: () => this.showAction(id) }, label)),
          h("button", { type: "button", onClick: () => this.fileInput.click() }, "导入 Markdown"),
          h("input", { type: "file", accept: ".md,.markdown,text/markdown", hidden: true,
            ref: (element) => { this.fileInput = element; }, onChange: this.importMarkdown }),
        ),
        templates.length > 0 && h("div", { className: "season-writing-row" },
          h("span", null, "写作模板"),
          ...templates.map(({ name, body }, index) => h("button", { key: index, type: "button", onClick: () => this.insert(body) }, name)),
        ),
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
