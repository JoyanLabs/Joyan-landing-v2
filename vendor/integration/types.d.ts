declare module "joyanlabs:config" {
	export const SITE: {
		name: string;
		site?: string;
		base?: string;
		trailingSlash?: boolean;
		googleSiteVerificationId?: string;
	};
	export const I18N: {
		language: string;
		textDirection: string;
	};
	export const METADATA: {
		title: { default: string; template: string };
		description: string;
		robots: { index: boolean; follow: boolean };
		openGraph: Record<string, unknown>;
	};
	export const APP_BLOG: {
		isEnabled: boolean;
		postsPerPage: number;
		isRelatedPostsEnabled: boolean;
		relatedPostsCount: number;
		post: {
			isEnabled: boolean;
			permalink: string;
			robots: { index: boolean; follow: boolean };
		};
		list: {
			isEnabled: boolean;
			pathname: string;
			robots: { index: boolean; follow: boolean };
		};
		category: {
			isEnabled: boolean;
			pathname: string;
			robots: { index: boolean; follow: boolean };
		};
		tag: {
			isEnabled: boolean;
			pathname: string;
			robots: { index: boolean; follow: boolean };
		};
	};
	export const UI: { theme: string };
	export const ANALYTICS: {
		vendors: {
			googleAnalytics: { id?: string; partytown?: boolean };
		};
	};
}
