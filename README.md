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

网站的 `/admin/` 由 Decap CMS 提供。线上使用 GitHub 登录，需要在 Netlify 项目配置 GitHub OAuth，回调地址为 `https://api.netlify.com/auth/done`，并在 `public/admin/config.yml` 的 `backend.site_domain` 填写 Netlify 项目主机名。OAuth 密钥在 Netlify 项目安全设置中保存。

本地开发时，在项目根目录另开一个终端运行 `npx --yes decap-server@3.11.6`，然后打开开发地址下的 `/admin/`。本地代理会把修改写入工作区。

编辑器中选择栏目、填写日期和正文，外部图床的 HTTPS 链接可以直接插入。草稿开关开启时，Fuwari 会从站点产物排除文章。公开仓库仍可查看已提交的 Markdown 源文件。
