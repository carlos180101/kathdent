import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "KathDent | Clínica Dental",
  description: "Portal Clínico Profesional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        {children}
        {/* Este script fuerza el diseño en el navegador, ignorando los errores de Vercel */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </body>
    </html>
  );
}