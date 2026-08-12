import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";
import { ChevronDown, LockKeyhole, Menu, X } from "lucide-react";
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
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${loginOpen ? "border-gold bg-[#dff2ff] text-[#123f68] shadow-[0_0_24px_rgba(94,177,224,.3)]" : "border-[#8fc8e8] bg-[#eaf7ff] text-[#174c76] hover:border-gold hover:bg-white hover:text-[#8a6600]"}`}
              >
                <LockKeyhole size={17} />
                {loginCopy.login}
                <ChevronDown
                  size={15}
                  className={`transition-transform ${loginOpen ? "rotate-180" : ""}`}
                />
              </button>
              {loginOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-[#8fc8e8] bg-gradient-to-b from-[#eef9ff] to-[#d6efff] p-3 text-[#173f63] shadow-[0_22px_60px_rgba(18,63,99,.28)] ring-1 ring-white/80">
                  <div className="mb-2 border-b border-[#9bc9e5] px-3 pb-3 pt-1">
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-[#17608f]">
                      Área segura
                    </p>
                    <p className="mt-1 text-sm text-[#35698d]">
                      Escolha seu portal de acesso
                    </p>
                  </div>
                  <PortalButton
                    label={loginCopy.client}
                    soon={loginCopy.soon}
                  />
                  <PortalButton
                    label={loginCopy.agent}
                    onClick={() => goToPortal("/agentes")}
                  />
                  <PortalButton
                    label={loginCopy.affiliate}
                    onClick={() => goToPortal("/afiliados")}
                  />
                  <PortalButton
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
            <div className="mt-3 rounded-2xl border border-[#8fc8e8] bg-gradient-to-b from-[#eef9ff] to-[#d6efff] p-2 shadow-xl ring-1 ring-white/80">
              <p className="border-b border-[#9bc9e5] px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#17608f]">
                {loginCopy.login}
              </p>
              <PortalButton label={loginCopy.client} soon={loginCopy.soon} />
              <PortalButton
                label={loginCopy.agent}
                onClick={() => goToPortal("/agentes")}
              />
              <PortalButton
                label={loginCopy.affiliate}
                onClick={() => goToPortal("/afiliados")}
              />
              <PortalButton
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
  label,
  soon,
  onClick,
}: {
  label: string;
  soon?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left text-sm font-semibold text-[#174c76] transition enabled:hover:border-gold enabled:hover:bg-white/85 enabled:hover:text-[#8a6600] enabled:hover:shadow-sm enabled:focus-visible:border-gold enabled:focus-visible:bg-white enabled:focus-visible:text-[#8a6600] disabled:cursor-not-allowed disabled:text-[#6c8da5]"
    >
      <span className="flex-1">{label}</span>
      {soon && (
        <span className="rounded-full border border-[#d7bd64] bg-[#fff8dc] px-2 py-1 text-[9px] font-bold uppercase text-[#806200]">
          {soon}
        </span>
      )}
    </button>
  );
}
