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
  toPreview: ({ summary }) => `<p>剧透折叠：${escapeHTML(summary)}</p>`,
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

function AppearancePreview({ entry, getAsset }) {
  const settings = entry.get("data");
  const amber = settings.get("preset") === "amber";
  const accent = amber ? "#b85a09" : "#4b65d1";
  const position = settings.get("bannerPosition") || "center";
  const imageSource = (name) => {
    const value = settings.get(name);
    if (!value) return "";
    const source = String(getAsset(value) || value);
    return source.startsWith("/") ? `https://seasonzhu.github.io${source}` : source;
  };
  const avatar = imageSource("avatar");
  const banner = imageSource("banner") ||
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

cms.registerPreviewTemplate("appearance", AppearancePreview);
cms.init();
