import Link from "next/link";

const tabs = [
  { href: "", label: "Resumo" },
  { href: "database", label: "Banco" },
  { href: "schema", label: "Schema" },
  { href: "mapping", label: "Mapping" },
  { href: "import", label: "Sync" },
  { href: "products", label: "Produtos" },
  { href: "logs", label: "Logs" }
];

export function AgentTabs({ agentId, current }: { agentId: string; current: string }) {
  return (
    <nav className="tabs" aria-label="Navegacao do agente">
      {tabs.map((tab) => {
        const href = tab.href ? `/agents/${agentId}/${tab.href}` : `/agents/${agentId}`;
        const active = current === tab.href || (!current && !tab.href);
        return (
          <Link key={tab.label} className={active ? "active" : ""} href={href}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
