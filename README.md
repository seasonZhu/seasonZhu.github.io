# Season Blog

使用 Astro 官方博客模板搭建，托管于 [GitHub Pages](https://seasonzhu.github.io/)。

## 本地预览

使用 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

运行 `npm run build` 生成静态站点，运行 `npm run preview` 预览构建结果。

## 撰写文章

在 `src/content/blog/` 新建 Markdown 文件，例如 `my-post.md`。

```markdown
---
title: '文章标题'
description: '一段文章摘要'
pubDate: '2026-11-26'
---

从这里开始写正文。
```

文件名对应文章链接，示例文件发布为 `/blog/my-post/`。文章发布后保留文件名即可维持原链接。正文与 `src/layouts/` 下的布局分开管理。

## 发布

提交文章并推送到 `main`。在仓库的 Actions 页面查看构建与部署结果，成功后即可访问线上站点。
