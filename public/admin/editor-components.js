const cms = window.CMS;

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

cms.registerEditorComponent({
  id: "season-bilibili",
  label: "插入 B 站视频",
  fields: [{ name: "bvid", label: "BV 号", widget: "string", pattern: ["^BV[0-9A-Za-z]{10}$", "请输入完整的 BV 号"] }],
  pattern: /^<iframe src="https:\/\/player\.bilibili\.com\/player\.html\?bvid=(BV[0-9A-Za-z]{10})&amp;autoplay=0"[^>]*><\/iframe>$/,
  fromBlock: ([, bvid]) => ({ bvid }),
  toBlock: bilibiliBlock,
  toPreview: ({ bvid }) => `<p>B 站视频：${escapeHTML(bvid)}</p>`,
});

cms.registerEditorComponent({
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

cms.registerEditorComponent({
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
  cms.registerEditorComponent({
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

cms.registerEditorComponent({
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

cms.registerEditorComponent({
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

cms.registerPreviewStyle("/admin/editor-preview.css");
cms.registerPreviewTemplate("posts", PostPreview);
cms.registerPreviewTemplate("appearance", AppearancePreview);
cms.init();
