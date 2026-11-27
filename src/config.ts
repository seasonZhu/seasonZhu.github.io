import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import appearance from "./data/appearance.json";
import profile from "./data/profile.json";
import { LinkPreset } from "./types/config";

const isAmber = appearance.preset === "amber";
const bannerPosition = appearance.bannerPosition;
const validBannerPosition = bannerPosition === "top" || bannerPosition === "bottom"
	? bannerPosition
	: "center";

export const siteConfig: SiteConfig = {
	title: profile.title,
	subtitle: profile.subtitle || "",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: isAmber ? 55 : 255,
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: appearance.banner?.trim() || (isAmber ? "/images/presets/amber.webp" : "/images/presets/starry.webp"),
		position: validBannerPosition,
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: "https://github.com/seasonZhu", // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: appearance.avatar?.trim() || "assets/images/demo-avatar.png",
	name: profile.name,
	bio: profile.bio || "",
	links: (profile.links ?? []).filter((link) => link.url.startsWith("https://")).map((link) => ({
		...link,
		icon: /^https:\/\/github\.com(?:\/|$)/i.test(link.url)
			? "fa6-brands:github"
			: "material-symbols:link",
	})),
};

export const licenseConfig: LicenseConfig = {
	enable: false,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
