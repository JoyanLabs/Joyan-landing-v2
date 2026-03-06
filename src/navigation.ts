import { getPermalink } from "./utils/permalinks";

export const headerData = {
	links: [
		{
			text: "Home",
			href: "/",
		},
		{
			text: "Soluciones",
			href: getPermalink("/solutions"),
		},
		{
			text: "Casos de Éxito",
			href: "/#success-cases",
		},
		{
			text: "Contacto",
			href: getPermalink("/contact"),
		},
	],
	actions: [
		{
			text: "Inicia tu Transformación",
			href: getPermalink("/contact"),
			variant: "primary" as const,
		},
	],
};

export const footerData = {
	links: [
		{
			title: "Divisiones",
			links: [
				{ text: "Joyan Sec", href: "#" },
				{ text: "Joyan IoT", href: "#" },
				{ text: "Joyan EXP", href: "#" },
				{ text: "Joyan MKT", href: "#" },
			],
		},
		{
			title: "Compañía",
			links: [
				{ text: "Sobre Nosotros", href: "#" },
				{ text: "Carreras", href: "#" },
				{ text: "Blog", href: "#" },
			],
		},
	],
	secondaryLinks: [
		{ text: "Términos", href: getPermalink("/terms") },
		{ text: "Privacidad", href: getPermalink("/privacy") },
	],
	socialLinks: [
		{ ariaLabel: "X", icon: "tabler:brand-x", href: "#" },
		{ ariaLabel: "Instagram", icon: "tabler:brand-instagram", href: "#" },
		{ ariaLabel: "Facebook", icon: "tabler:brand-facebook", href: "#" },
		{ ariaLabel: "LinkedIn", icon: "tabler:brand-linkedin", href: "#" },
	],
	footNote: `
    © 2025 Joyan. Todos los derechos reservados.
  `,
};
