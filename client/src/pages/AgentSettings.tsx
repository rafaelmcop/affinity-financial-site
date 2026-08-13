import { useEffect, useState } from "react";
import {
  Mail,
  MapPin,
  MessageCircle,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import AgentSidebar from "@/components/AgentSidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const initialEmail = {
  host: "smtp.mail.me.com",
  port: 587,
  secure: false,
  user: "",
  password: "",
  fromEmail: "",
  fromName: "Affinity Financial",
  imapHost: "imap.mail.me.com",
  imapPort: 993,
  imapUser: "",
};
const initialProfile = {
  name: "",
  email: "",
  contactEmail: "",
  phone: "",
  whatsapp: "",
  address: "",
};

export default function AgentSettings() {
  const emailQuery = trpc.agent.getEmailSettings.useQuery(),
    profileQuery = trpc.agent.getProfile.useQuery();
  const saveEmail = trpc.agent.saveEmailSettings.useMutation(),
    test = trpc.agent.testEmailSettings.useMutation(),
    saveProfile = trpc.agent.updateProfile.useMutation();
  const [emailForm, setEmailForm] = useState(initialEmail),
    [profile, setProfile] = useState(initialProfile),
    [testEmail, setTestEmail] = useState("");
  useEffect(() => {
    if (emailQuery.data)
      setEmailForm(prev => ({ ...prev, ...emailQuery.data, password: "" }));
  }, [emailQuery.data]);
  useEffect(() => {
    if (profileQuery.data)
      setProfile({
        name: profileQuery.data.name,
        email: profileQuery.data.email,
        contactEmail: profileQuery.data.contactEmail || "",
        phone: profileQuery.data.phone || "",
        whatsapp: profileQuery.data.whatsapp || "",
        address: profileQuery.data.address || "",
      });
  }, [profileQuery.data]);
  return (
    <div className="min-h-screen bg-black text-white lg:pl-64">
      <AgentSidebar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Sua conta
          </p>
          <h1 className="mt-2 text-3xl font-bold">Configurações</h1>
          <p className="mt-2 text-gray-400">
            Gerencie seu perfil e os canais usados no acompanhamento dos
            clientes.
          </p>
        </div>
        <Card className="space-y-5 border-gold/20 bg-[#0b1524] p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gold">
            <UserRound />
            Meu perfil
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">
              Nome completo
              <Input
                className="mt-2"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
              />
            </label>
            <label className="text-sm text-gray-300">
              E-mail de acesso
              <Input
                className="mt-2 opacity-70"
                value={profile.email}
                disabled
              />
            </label>
            <label className="text-sm text-gray-300">
              E-mail de contato
              <Input
                className="mt-2"
                type="email"
                value={profile.contactEmail}
                onChange={e =>
                  setProfile({ ...profile, contactEmail: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-300">
              Telefone
              <Input
                className="mt-2"
                type="tel"
                value={profile.phone}
                onChange={e =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-300 sm:col-span-2">
              WhatsApp profissional
              <Input
                className="mt-2"
                type="tel"
                placeholder="Inclua o código do país"
                value={profile.whatsapp}
                onChange={e =>
                  setProfile({ ...profile, whatsapp: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-300 sm:col-span-2">
              Endereço
              <div className="relative mt-2">
                <MapPin
                  className="absolute left-3 top-3 text-gray-500"
                  size={17}
                />
                <Input
                  className="pl-10"
                  value={profile.address}
                  onChange={e =>
                    setProfile({ ...profile, address: e.target.value })
                  }
                />
              </div>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Por segurança, o e-mail usado para entrar somente pode ser alterado
            pelo administrador mestre.
          </p>
          <Button
            className="w-full bg-gold text-black"
            disabled={saveProfile.isPending}
            onClick={async () => {
              try {
                await saveProfile.mutateAsync({
                  name: profile.name,
                  contactEmail: profile.contactEmail,
                  phone: profile.phone,
                  whatsapp: profile.whatsapp,
                  address: profile.address,
                });
                await profileQuery.refetch();
                toast.success("Perfil atualizado");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível atualizar"
                );
              }
            }}
          >
            <Save size={16} className="mr-2" />
            Salvar perfil
          </Button>
        </Card>
        <Card className="space-y-6 border-gold/20 bg-[#0b1524] p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gold">
            <Mail />
            Meu e-mail
          </h2>
          <div className="rounded-lg border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100">
            Para iCloud, use uma senha específica de aplicativo criada na sua
            conta Apple. A mesma senha conecta o envio e o recebimento; sua
            senha normal não deve ser usada.
          </div>
          <h3 className="font-semibold text-gold">Envio (SMTP)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">
              Servidor
              <Input
                className="mt-2"
                value={emailForm.host}
                onChange={e =>
                  setEmailForm({ ...emailForm, host: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-300">
              Porta
              <Input
                className="mt-2"
                type="number"
                value={emailForm.port}
                onChange={e =>
                  setEmailForm({ ...emailForm, port: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-black/30 p-3">
            <Switch
              checked={emailForm.secure}
              onCheckedChange={secure => setEmailForm({ ...emailForm, secure })}
            />
            <span className="text-sm">Usar SSL direto no envio</span>
          </div>
          <label className="block text-sm text-gray-300">
            E-mail/usuário
            <Input
              className="mt-2"
              type="email"
              placeholder="seu-email@icloud.com"
              value={emailForm.user}
              onChange={e =>
                setEmailForm({
                  ...emailForm,
                  user: e.target.value,
                  imapUser: e.target.value,
                })
              }
            />
          </label>
          <label className="block text-sm text-gray-300">
            Senha específica de aplicativo
            <Input
              className="mt-2"
              type="password"
              placeholder={
                emailQuery.data?.passwordConfigured
                  ? "Deixe vazio para manter a senha atual"
                  : "Informe a senha de aplicativo"
              }
              value={emailForm.password}
              onChange={e =>
                setEmailForm({ ...emailForm, password: e.target.value })
              }
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">
              E-mail do remetente
              <Input
                className="mt-2"
                type="email"
                value={emailForm.fromEmail}
                onChange={e =>
                  setEmailForm({ ...emailForm, fromEmail: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-300">
              Nome do remetente
              <Input
                className="mt-2"
                value={emailForm.fromName}
                onChange={e =>
                  setEmailForm({ ...emailForm, fromName: e.target.value })
                }
              />
            </label>
          </div>
          <h3 className="border-t border-white/10 pt-5 font-semibold text-gold">
            Recebimento (iCloud IMAP)
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">
              Servidor de entrada
              <Input
                className="mt-2"
                value={emailForm.imapHost}
                onChange={e =>
                  setEmailForm({ ...emailForm, imapHost: e.target.value })
                }
              />
            </label>
            <label className="text-sm text-gray-300">
              Porta segura
              <Input
                className="mt-2"
                type="number"
                value={emailForm.imapPort}
                onChange={e =>
                  setEmailForm({
                    ...emailForm,
                    imapPort: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <label className="block text-sm text-gray-300">
            Usuário do iCloud
            <Input
              className="mt-2"
              value={emailForm.imapUser}
              onChange={e =>
                setEmailForm({ ...emailForm, imapUser: e.target.value })
              }
            />
          </label>
          <Button
            className="w-full bg-gold text-black"
            disabled={saveEmail.isPending}
            onClick={async () => {
              try {
                await saveEmail.mutateAsync(emailForm);
                await emailQuery.refetch();
                toast.success("Envio e recebimento de e-mail configurados");
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível salvar"
                );
              }
            }}
          >
            <Save size={16} className="mr-2" />
            Salvar e-mail
          </Button>
          <div className="border-t border-white/10 pt-5">
            <p className="mb-3 text-sm text-gray-400">
              Depois de salvar, envie um teste:
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="E-mail que receberá o teste"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={!testEmail || test.isPending}
                onClick={async () => {
                  try {
                    await test.mutateAsync({ email: testEmail });
                    toast.success("E-mail de teste enviado");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Falha no teste"
                    );
                  }
                }}
              >
                <Send size={16} className="mr-2" />
                Testar
              </Button>
            </div>
          </div>
        </Card>
        <Card className="border-green-500/20 bg-[#0b1524] p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-green-400">
            <MessageCircle />
            Meu WhatsApp
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            Você pode usar seu WhatsApp pessoal. Ao clicar em WhatsApp na ficha
            de um cliente, o CRM abre a conversa com a mensagem pronta e
            registra a ação no histórico do atendimento.
          </p>
          <div className="mt-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-200">
            Integração simples ativa após salvar seu número no perfil. Não é
            necessário cadastrar uma conta empresarial.
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            As respostas continuam no seu aplicativo WhatsApp. Se no futuro a
            Affinity quiser receber e responder mensagens dentro do próprio CRM,
            poderemos ativar a integração empresarial sem refazer os cadastros.
          </p>
        </Card>
      </main>
    </div>
  );
}
