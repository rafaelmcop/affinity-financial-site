import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";
import {
  BriefcaseBusiness,
  ChevronDown,
  Handshake,
  LockKeyhole,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export function Navigation() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const loginCopy = {
    pt: {
      login: "Login",
      client: "Cliente",
      agent: "Agente",
      affiliate: "Afiliado",
      admin: "Administrador",
      soon: "Em breve",
    },
    en: {
      login: "Login",
      client: "Client",
      agent: "Agent",
      affiliate: "Affiliate",
      admin: "Administrator",
      soon: "Coming soon",
    },
    es: {
      login: "Acceso",
      client: "Cliente",
      agent: "Agente",
      affiliate: "Afiliado",
      admin: "Administrador",
      soon: "Próximamente",
    },
  }[language];
  const goToPortal = (path: string) => {
    setLoginOpen(false);
    setIsOpen(false);
    setLocation(path);
  };

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { label: t("nav.home"), id: "home" },
    { label: t("nav.services"), id: "services" },
    { label: t("nav.about"), id: "about" },
    { label: t("nav.testimonials"), id: "testimonials" },
    { label: t("nav.contact"), id: "contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gold/20 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#home" className="hover:opacity-80 transition-opacity">
              <div className="text-lg font-bold text-gold whitespace-nowrap leading-tight">
                <div>Affinity Financial</div>
                <div className="text-xs text-gold/80">Consulting Inc.</div>
              </div>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-white hover:text-gold transition-colors text-sm font-medium"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Side - Language Selector + Mobile Menu */}
          <div className="flex items-center gap-4">
            <LanguageSelector />

            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setLoginOpen(value => !value)}
                aria-expanded={loginOpen}
                className="flex items-center gap-2 rounded-full border border-gold/70 bg-gradient-to-r from-gold to-[#f1d47a] px-4 py-2 text-sm font-bold text-black shadow-[0_0_22px_rgba(212,175,55,.2)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(212,175,55,.3)]"
              >
                <LockKeyhole size={17} />
                {loginCopy.login}
                <ChevronDown
                  size={15}
                  className={`transition-transform ${loginOpen ? "rotate-180" : ""}`}
                />
              </button>
              {loginOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-b from-[#fffaf0] to-[#f4ead2] p-3 text-[#14233a] shadow-[0_22px_70px_rgba(0,0,0,.45)]">
                  <div className="mb-2 rounded-xl bg-[#14233a] px-4 py-3 text-white">
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-gold">
                      Área segura
                    </p>
                    <p className="mt-1 text-sm text-white/75">
                      Escolha seu portal de acesso
                    </p>
                  </div>
                  <PortalButton
                    icon={UserRound}
                    label={loginCopy.client}
                    soon={loginCopy.soon}
                  />
                  <PortalButton
                    icon={BriefcaseBusiness}
                    label={loginCopy.agent}
                    onClick={() => goToPortal("/agentes")}
                  />
                  <PortalButton
                    icon={Handshake}
                    label={loginCopy.affiliate}
                    onClick={() => goToPortal("/afiliados")}
                  />
                  <PortalButton
                    icon={ShieldCheck}
                    label={loginCopy.admin}
                    onClick={() => goToPortal("/admin/login")}
                  />
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-gold hover:text-gold/80"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-gold/20 mt-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left px-4 py-2 text-white hover:bg-gold/10 hover:text-gold transition-colors text-sm font-medium"
              >
                {item.label}
              </button>
            ))}
            <div className="mt-3 rounded-2xl border border-gold/30 bg-gradient-to-b from-[#fffaf0] to-[#f4ead2] p-2 shadow-xl">
              <p className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#8b6b13]">
                {loginCopy.login}
              </p>
              <PortalButton
                icon={UserRound}
                label={loginCopy.client}
                soon={loginCopy.soon}
              />
              <PortalButton
                icon={BriefcaseBusiness}
                label={loginCopy.agent}
                onClick={() => goToPortal("/agentes")}
              />
              <PortalButton
                icon={Handshake}
                label={loginCopy.affiliate}
                onClick={() => goToPortal("/afiliados")}
              />
              <PortalButton
                icon={ShieldCheck}
                label={loginCopy.admin}
                onClick={() => goToPortal("/admin/login")}
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function PortalButton({
  icon: Icon,
  label,
  soon,
  onClick,
}: {
  icon: typeof UserRound;
  label: string;
  soon?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#14233a] transition enabled:hover:bg-white enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#14233a] text-gold transition group-enabled:group-hover:bg-gold group-enabled:group-hover:text-black">
        <Icon size={18} />
      </span>
      <span className="flex-1">{label}</span>
      {soon && (
        <span className="rounded-full bg-[#14233a]/10 px-2 py-1 text-[9px] font-bold uppercase text-[#14233a]/65">
          {soon}
        </span>
      )}
    </button>
  );
}
