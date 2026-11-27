import { getEntry } from "astro:content";
import { getSortedPosts } from "../../utils/content-utils";

export async function GET() {
	const page = await getEntry("pages", "看书清单");
	const books: Record<string, Set<string>> = {};
	let year = "";
	for (const line of (page?.body ?? "").split("\n")) {
		if (line.startsWith("## ")) year = line.match(/^## (20\d{2})\s*年/)?.[1] ?? "";
		const title = line.match(/^[-*+]\s+(.+?)(?:\s+·\s+|$)/)?.[1];
		if (year && title) (books[year] ??= new Set()).add(title.replace(/^《([^》]+)》/, "$1"));
	}
	for (const { data } of await getSortedPosts()) {
		if (data.readingYear && data.readingTitle) {
			const set = (books[data.readingYear] ??= new Set());
			const normalize = (title: string) => title.normalize("NFKC").replace(/[《》\s，,。！!：:]/g, "").toLowerCase();
			if (![...set].some((title) => normalize(title) === normalize(data.readingTitle!))) set.add(data.readingTitle);
		}
	}
	return Response.json(Object.fromEntries(Object.entries(books).map(([key, titles]) => [key, [...titles]])));
}
