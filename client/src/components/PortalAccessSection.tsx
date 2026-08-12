import { ShieldCheck, Users, UserRoundCog } from 'lucide-react';

const portals = [
  { title: 'Portal de Afiliados', text: 'Indique contatos e acompanhe seus leads e pagamentos.', href: '/afiliados', icon: Users },
  { title: 'Portal de Agentes', text: 'Acesse o CRM, cadastre clientes e organize acompanhamentos.', href: '/agentes', icon: UserRoundCog },
  { title: 'Painel Administrativo', text: 'Gerencie usuários, conteúdo, leads e operações.', href: '/admin/login', icon: ShieldCheck },
];
export function PortalAccessSection() { return <section className="bg-[#07101d] px-4 py-16"><div className="mx-auto max-w-6xl"><div className="mb-8 text-center"><p className="text-sm font-bold uppercase tracking-[.2em] text-gold">Acesso aos portais</p><h2 className="mt-2 text-3xl font-bold text-white">Escolha seu painel</h2></div><div className="grid gap-5 md:grid-cols-3">{portals.map(portal => { const Icon = portal.icon; return <a key={portal.href} href={portal.href} className="group rounded-2xl border border-gold/20 bg-black p-6 transition hover:-translate-y-1 hover:border-gold"><Icon className="mb-4 text-gold" size={30} /><h3 className="text-xl font-bold text-white">{portal.title}</h3><p className="mt-2 text-sm leading-relaxed text-gray-400">{portal.text}</p><span className="mt-5 inline-block font-semibold text-gold">Acessar →</span></a>; })}</div></div></section>; }
