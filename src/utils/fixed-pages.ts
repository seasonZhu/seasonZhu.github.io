import type { MarkdownInstance } from "astro";

const files = import.meta.glob<MarkdownInstance<{ title: string; showInNav?: boolean; navOrder?: number }>>(
	"../content/pages/*.md",
	{ eager: true },
);

export const fixedPages = Object.entries(files).map(([path, page]) => ({
	slug: path.slice(path.lastIndexOf("/") + 1, -3),
	title: page.frontmatter.title,
	showInNav: page.frontmatter.showInNav !== false,
	navOrder: page.frontmatter.navOrder ?? 0,
	Content: page.Content,
}));
