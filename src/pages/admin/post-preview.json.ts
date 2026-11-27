import type { APIContext } from "astro";
import { siteConfig } from "../../config";

export function GET({ site, url }: APIContext) {
	const banner = siteConfig.banner.src;
	return Response.json({
		title: siteConfig.title,
		hue: siteConfig.themeColor.hue,
		banner: banner.startsWith("/") ? new URL(banner, site ?? url).href : banner,
	});
}
