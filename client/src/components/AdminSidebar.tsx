import { useLocation } from 'wouter';
import { BarChart3, FileText, Users, MessageSquareQuote, Mail, ShieldCheck, ExternalLink, LogOut, Star } from 'lucide-react';

type Props = { onLogout?: () => void };

const groups = [
  { title: 'Visão geral', items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 }] },
  { title: 'Operação', items: [
    { label: 'Apólices', href: '/admin/dashboard?tab=policies', icon: FileText },
    { label: 'Afiliados', href: '/admin/affiliates', icon: Users },
  ] },
  { title: 'Conteúdo', items: [
    { label: 'Depoimentos', href: '/admin/testimonials', icon: MessageSquareQuote },
    { label: 'Avaliações', href: '/admin/avaliacoes', icon: Star },
  ] },
  { title: 'Configurações', items: [
    { label: 'E-mail e iCloud', href: '/admin/smtp-config', icon: Mail },
    { label: 'Administradores', href: '/admin/administradores', icon: ShieldCheck },
  ] },
];

export default function AdminSidebar({ onLogout }: Props) {
  const [location, setLocation] = useLocation();
  return (
    <aside className="w-full lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 z-50 bg-[#0f1f36] border-r border-gold/20 text-white overflow-y-auto">
      <div className="p-5 border-b border-gold/20">
        <button onClick={() => setLocation('/admin/dashboard')} className="text-left">
          <div className="text-gold font-bold text-lg">Affinity Financial</div>
          <div className="text-xs text-gray-400 mt-1">Administração</div>
        </button>
      </div>
      <nav className="p-3 space-y-5">
        {groups.map(group => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = location === item.href.split('?')[0];
                return <button key={item.href} onClick={() => setLocation(item.href)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-gold text-black font-semibold' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}><Icon size={18} />{item.label}</button>;
              })}
            </div>
          </div>
        ))}
        <div className="pt-3 border-t border-white/10 space-y-1">
          <button onClick={() => setLocation('/')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10"><ExternalLink size={18} />Site principal</button>
          {onLogout && <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/10"><LogOut size={18} />Sair</button>}
        </div>
      </nav>
    </aside>
  );
}
