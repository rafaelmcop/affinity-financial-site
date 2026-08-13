import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  FileText,
  Users,
  MessageSquareQuote,
  Mail,
  ExternalLink,
  LogOut,
  Star,
  Contact,
  Menu,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import FloatingInternalChat from "@/components/FloatingInternalChat";

type Props = { onLogout?: () => void };

const groups = [
  {
    title: "Visão geral",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 }],
  },
  {
    title: "Operação",
    items: [
      {
        label: "Apólices",
        href: "/admin/dashboard?tab=policies",
        icon: FileText,
        badge: "pendingPolicies",
      },
      {
        label: "Usuários",
        href: "/admin/usuarios",
        icon: Users,
        badge: "pendingUsers",
      },
      { label: "CRM de clientes", href: "/admin/crm", icon: Contact },
      {
        label: "Carteiras dos agentes",
        href: "/admin/carteiras-agentes",
        icon: FileText,
      },
      {
        label: "Leads de afiliados",
        href: "/admin/leads-afiliados",
        icon: Users,
        badge: "pendingLeads",
      },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      {
        label: "Depoimentos",
        href: "/admin/testimonials",
        icon: MessageSquareQuote,
      },
      {
        label: "Avaliações",
        href: "/admin/avaliacoes",
        icon: Star,
        badge: "pendingReviews",
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      { label: "E-mail e iCloud", href: "/admin/smtp-config", icon: Mail },
    ],
  },
];

export default function AdminSidebar({ onLogout }: Props) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const pending = trpc.admin.getStats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const badgeCount = (key?: string) =>
    key
      ? Number(
          (pending.data as Record<string, unknown> | undefined)?.[key] || 0
        )
      : 0;
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open]);
  const navigate = (href: string) => {
    setLocation(href);
    setOpen(false);
  };
  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-gold/20 bg-[#0f1f36]/95 px-4 text-white shadow-lg backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu administrativo"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/30 text-gold transition-colors hover:bg-gold/10"
        >
          <Menu size={25} />
        </button>
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="text-left"
        >
          <div className="font-bold leading-tight text-gold">
            Affinity Financial
          </div>
          <div className="text-xs text-gray-400">Administração</div>
        </button>
      </header>
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(84vw,19rem)] overflow-y-auto border-r border-gold/20 bg-[#0f1f36] text-white shadow-2xl transition-transform duration-300 lg:w-64 lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-5 border-b border-gold/20">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-left"
            >
              <div className="text-gold font-bold text-lg">
                Affinity Financial
              </div>
              <div className="text-xs text-gray-400 mt-1">Administração</div>
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu administrativo"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={23} />
            </button>
          </div>
        </div>
        <nav className="p-3 space-y-5">
          {groups.map(group => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = location === item.href.split("?")[0];
                  const count = badgeCount(
                    "badge" in item ? item.badge : undefined
                  );
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-gold text-black font-semibold" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}
                    >
                      <Icon size={18} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {count > 0 && (
                        <span
                          aria-label={`${count} pendente${count === 1 ? "" : "s"}`}
                          className={`min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-black ${active ? "bg-black text-gold" : "bg-red-500 text-white shadow-sm shadow-red-500/40"}`}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-white/10 space-y-1">
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10"
            >
              <ExternalLink size={18} />
              Site principal
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/10"
              >
                <LogOut size={18} />
                Sair
              </button>
            )}
          </div>
        </nav>
      </aside>
      <FloatingInternalChat mode="admin" />
    </>
  );
}
