import { defineConfig } from "vitepress";

const base = "/review-radar/";

export default defineConfig({
	base,
	title: "Review Radar",
	description: "Spot what needs your attention in GitHub pull requests.",
	head: [["link", { rel: "icon", href: `${base}brand/review-radar-icon.svg` }]],
	themeConfig: {
		logo: {
			light: "/brand/review-radar-lockup-horizontal.svg",
			dark: "/brand/review-radar-lockup-horizontal.svg",
			alt: "Review Radar",
		},
		nav: [
			{ text: "Getting Started", link: "/getting-started" },
			{ text: "Concepts", link: "/concepts" },
			{ text: "Self-hosting", link: "/advanced/self-hosting" },
			{ text: "GitHub", link: "https://github.com/RossBossDev/review-radar" },
		],
		sidebar: [
			{
				text: "Guide",
				items: [
					{ text: "Overview", link: "/" },
					{ text: "Getting Started", link: "/getting-started" },
					{ text: "Concepts", link: "/concepts" },
				],
			},
			{
				text: "Advanced",
				items: [{ text: "Self-hosting", link: "/advanced/self-hosting" }],
			},
		],
		socialLinks: [
			{ icon: "github", link: "https://github.com/RossBossDev/review-radar" },
		],
		editLink: {
			pattern:
				"https://github.com/RossBossDev/review-radar/edit/main/apps/docs/:path",
			text: "Edit this page on GitHub",
		},
		footer: {
			message: "Review Radar product documentation.",
		},
	},
});
