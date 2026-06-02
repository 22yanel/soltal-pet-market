import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soltal Pet Market",
  description: "Tienda online para mascotas y animales.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
