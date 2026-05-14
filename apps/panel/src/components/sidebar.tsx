"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelRealtime } from "./panel-realtime";

const links = [
  { href: "/agents", label: "Farmacias" },
  { href: "/products", label: "Produtos" },
  { href: "/events", label: "Eventos" },
  { href: "/tokens", label: "Acessos" },
  { href: "/tokens/new", label: "Novo acesso" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>Pharma Panel</strong>
        <PanelRealtime />
      </div>
      <nav className="nav">
        {links.map((link) => (
          <Link key={link.href} className={isActive(pathname, link.href) ? "active" : ""} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}
