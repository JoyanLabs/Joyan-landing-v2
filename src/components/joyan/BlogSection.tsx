import { Blog8 } from "@/components/blocks/blog8";

const blogData = {
  heading: "Recursos y Casos de Éxito",
  description:
    "Descubre cómo nuestras herramientas y soluciones transforman negocios y hogares. Desde la gestión empresarial hasta la automatización inteligente.",
  posts: [
    {
      id: "post-1",
      title: "Herramientas Empresariales: Potencia tu Gestión con ERP y CRM",
      summary:
        "Explora nuestro catálogo de herramientas Open Source como ERPNext, Odoo Community y Twenty CRM. Aprende cómo integramos Looker Studio y BigQuery para inteligencia de negocios y pipelines ETL.",
      label: "Empresarial",
      author: "Equipo Joyan",
      published: "20 Nov 2024",
      url: "#",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
      tags: ["ERP", "CRM", "Business Intelligence", "Open Source"],
    },
    {
      id: "post-2",
      title: "Domótica Avanzada: El Futuro de tu Hogar con Home Assistant",
      summary:
        "Conectamos lo imposible. Descubre cómo usamos Home Assistant y servidores SBC (Raspberry Pi, Orange Pi) para crear automatizaciones avanzadas, desde escenas inteligentes hasta controles parentales personalizados.",
      label: "Domótica",
      author: "Equipo Joyan",
      published: "18 Nov 2024",
      url: "#",
      image: "https://images.unsplash.com/photo-1558002038-1091a166111c?q=80&w=2370&auto=format&fit=crop",
      tags: ["IoT", "Home Assistant", "Automatización", "Smart Home"],
    },
  ],
};

export default function BlogSection() {
  return <Blog8 {...blogData} />;
}
