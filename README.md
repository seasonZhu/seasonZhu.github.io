# Season Blog · 星间生活志

使用 Fuwari 主题，部署到 [GitHub Pages](https://seasonzhu.github.io/)。

## 本地预览

使用 Node.js 24 和 pnpm。首次安装后可以运行开发服务器或构建静态站点。

```sh
npx --yes pnpm@9.14.4 install --frozen-lockfile
npx --yes pnpm@9.14.4 dev
npx --yes pnpm@9.14.4 build
```

## 写作

文章位于 `src/content/posts/`，公开地址为 `/blog/<文件名>/`。已发布的文章应保留文件名。推送到 `main` 后，GitHub Actions 构建并发布站点。

[线上写作后台](https://seasonzhu.netlify.app/admin/) 由 Netlify 托管，使用 GitHub 登录。GitHub Pages 的 `/admin/` 会跳转到同一个后台。文章仍写入 GitHub 仓库，经 GitHub Actions 发布。OAuth 密钥保存在 Netlify 项目的安全设置中。

本地开发时，在项目根目录另开一个终端运行 `npx --yes decap-server@3.11.6`，然后打开开发地址下的 `/admin/`。本地代理会把修改写入工作区。

编辑器中选择栏目、填写日期和正文，外部图床的 HTTPS 链接可以直接插入。草稿开关开启时，Fuwari 会从站点产物排除文章。公开仓库仍可查看已提交的 Markdown 源文件。
