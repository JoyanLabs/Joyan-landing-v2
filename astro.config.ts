import path from "node:path";
import { fileURLToPath } from "node:url";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import {
	lazyImagesRehypePlugin,
	readingTimeRemarkPlugin,
	responsiveTablesRehypePlugin,
} from "./src/utils/frontmatter";
import joyanlabs from "./vendor/integration";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hasExternalScripts = false;
const whenExternalScripts = (
	items: (() => AstroIntegration) | (() => AstroIntegration)[] = [],
) =>
	hasExternalScripts
		? Array.isArray(items)
			? items.map((item) => item())
			: [items()]
		: [];

export default defineConfig({
	output: "static",

	// Iteration 2: ES at `/`, EN at `/en` — never `/en/`.
	trailingSlash: "never",

	integrations: [
		sitemap(),
		mdx(),
		vue(),
		icon({
			include: {
				tabler: ["*"],
				"flat-color-icons": [
					"template",
					"gallery",
					"approval",
					"document",
					"advertising",
					"currency-exchange",
					"voice-presentation",
					"business-contact",
					"database",
				],
			},
		}),

		...whenExternalScripts(() =>
			partytown({
				config: { forward: ["dataLayer.push"] },
			}),
		),

		joyanlabs({
			config: "./src/config.yaml",
		}),
		react(),
	],

	image: {
		domains: ["cdn.pixabay.com"],
	},

	markdown: {
		processor: unified(),
		remarkPlugins: [readingTimeRemarkPlugin],
		rehypePlugins: [responsiveTablesRehypePlugin, lazyImagesRehypePlugin],
	},

	// Preserve the v5/v6 whitespace behavior (v7 defaults to 'jsx')
	compressHTML: true,

	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				"~": path.resolve(__dirname, "./src"),
			},
		},
	},
});
