import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://soltalpetmarket.com"),
  title: {
    default:
      "Soltal Pet Market | Tienda para animales y mascotas en República Dominicana",
    template: "%s | Soltal Pet Market",
  },
  description:
    "Soltal Pet Market es una tienda online para animales y mascotas en República Dominicana. Compra alimentos, accesorios, cuidado, higiene, antipulgas y productos para perros, gatos y otros animales.",
  keywords: [
    "tienda para animales",
    "tienda para mascotas",
    "pet shop republica dominicana",
    "productos para perros",
    "productos para gatos",
    "alimentos para mascotas",
    "accesorios para mascotas",
    "Soltal Pet Market",
    "mascotas Republica Dominicana",
    "tienda de animales online",
  ],
  authors: [{ name: "Soltal Pet Market" }],
  creator: "Soltal Pet Market",
  publisher: "Soltal Pet Market",
  applicationName: "Soltal Pet Market",
  alternates: {
    canonical: "https://soltalpetmarket.com",
  },
  openGraph: {
    title:
      "Soltal Pet Market | Tienda para animales y mascotas en República Dominicana",
    description:
      "Compra alimentos, accesorios, cuidado e higiene para perros, gatos y otros animales. Pedidos online, factura digital y seguimiento de pedidos.",
    url: "https://soltalpetmarket.com",
    siteName: "Soltal Pet Market",
    locale: "es_DO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Soltal Pet Market | Tienda para animales y mascotas en República Dominicana",
    description:
      "Tienda online para animales y mascotas. Compra productos para perros, gatos y otros animales en República Dominicana.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-DO">
      <body>{children}</body>
    </html>
  );
}
