import type { MarkdownInstance } from "astro";

const files = import.meta.glob<MarkdownInstance<{ title: string }>>(
	"../content/pages/*.md",
	{ eager: true },
);

export const fixedPages = Object.entries(files).map(([path, page]) => ({
	slug: path.slice(path.lastIndexOf("/") + 1, -3),
	title: page.frontmatter.title,
	Content: page.Content,
}));
