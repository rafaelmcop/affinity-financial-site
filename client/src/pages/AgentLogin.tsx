import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AgentLogin() {
  const [, setLocation] = useLocation(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const login = trpc.agent.login.useMutation();
  return <div className="flex min-h-screen flex-col bg-black text-white"><header className="border-b border-gold/20 p-4"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><strong className="text-xl text-gold">Affinity Financial</strong><span className="ml-3 text-sm text-gold/80">Portal do Agente</span></div><Button variant="outline" onClick={() => setLocation('/')}>Voltar ao site</Button></div></header><main className="flex flex-1 items-center justify-center p-4"><Card className="w-full max-w-md border-gold/20 bg-black p-8"><h1 className="text-3xl font-bold text-gold">Acesso de agentes</h1><p className="mb-7 mt-2 text-sm text-gray-400">Entre para acessar clientes, CRM, apólices e tarefas.</p><form className="space-y-4" onSubmit={async event => { event.preventDefault(); try { const result = await login.mutateAsync({ email, password }); localStorage.setItem('agentSession', JSON.stringify(result)); setLocation('/agentes/dashboard'); toast.success('Login realizado'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível entrar'); } }}><Input type="email" autoComplete="username" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required /><Input type="password" autoComplete="current-password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required /><Button type="submit" className="w-full bg-gold text-black">{login.isPending ? 'Entrando...' : 'Entrar'}</Button></form></Card></main></div>;
}
