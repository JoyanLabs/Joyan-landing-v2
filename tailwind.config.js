import typographyPlugin from "@tailwindcss/typography";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";

export default {
	darkMode: "class",
	content: ["./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			colors: {
				primary: "var(--aw-color-primary)",
				secondary: "var(--aw-color-secondary)",
				accent: "var(--aw-color-accent)",
				default: "var(--aw-color-text-default)",
				muted: "var(--aw-color-text-muted)",
				// Joyan Custom Colors
				joyan: {
					bg: "var(--joyan-bg)",
					card: "var(--joyan-card)",
					accent: "var(--joyan-accent)",
					muted: "var(--joyan-muted)",
					text: "var(--joyan-text)",
				},
			},
			fontFamily: {
				sans: [
					"var(--aw-font-sans, 'Inter', ui-sans-serif)",
					...defaultTheme.fontFamily.sans,
				],
				serif: [
					"var(--aw-font-serif, ui-serif)",
					...defaultTheme.fontFamily.serif,
				],
				heading: [
					"var(--aw-font-heading, 'Space Grotesk', ui-sans-serif)",
					...defaultTheme.fontFamily.sans,
				],
			},
			animation: {
				fade: "fadeInUp 1s both",
				float: "float 6s ease-in-out infinite",
				aurora: "aurora 60s linear infinite",
				blob: "blob 7s infinite",
			},
			keyframes: {
				fadeInUp: {
					"0%": { opacity: 0, transform: "translateY(2rem)" },
					"100%": { opacity: 1, transform: "translateY(0)" },
				},
				float: {
					"0%, 100%": { transform: "translateY(0)" },
					"50%": { transform: "translateY(-20px)" },
				},
				aurora: {
					from: {
						backgroundPosition: "50% 50%, 50% 50%",
					},
					to: {
						backgroundPosition: "350% 50%, 350% 50%",
					},
				},
				blob: {
					"0%": {
						transform: "translate(0px, 0px) scale(1)",
					},
					"33%": {
						transform: "translate(30px, -50px) scale(1.1)",
					},
					"66%": {
						transform: "translate(-20px, 20px) scale(0.9)",
					},
					"100%": {
						transform: "translate(0px, 0px) scale(1)",
					},
				},
			},
		},
	},
	plugins: [
		typographyPlugin,
		plugin(({ addVariant }) => {
			addVariant("intersect", "&:not([no-intersect])");
		}),
		addVariablesForColors,
	],
};

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
function addVariablesForColors({ addBase, theme }) {
  let allColors = flattenColorPalette(theme("colors"));
  let newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ":root": newVars,
  });
}
