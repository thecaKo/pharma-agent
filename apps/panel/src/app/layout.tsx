import "./globals.css";
import { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";

export const metadata = {
  title: "Pharma Panel",
  description: "Painel PharmaConnector"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <Sidebar />
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
