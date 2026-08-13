import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mode = "login" | "register" | "forgot";

export default function AgentLogin() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const login = trpc.agent.login.useMutation();
  const register = trpc.agent.register.useMutation();
  const reset = trpc.passwordReset.requestReset.useMutation();
  const pending = login.isPending || register.isPending || reset.isPending;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "login") {
        const result = await login.mutateAsync({ email, password });
        localStorage.setItem("agentSession", JSON.stringify(result));
        setLocation("/agentes/dashboard");
        toast.success("Login realizado");
        return;
      }
      if (mode === "forgot") {
        await reset.mutateAsync({ email, userType: "admin" });
        toast.success(
          "Se o e-mail estiver cadastrado, você receberá o link de redefinição."
        );
        setMode("login");
        return;
      }
      if (password !== confirmation) {
        toast.error("As senhas não coincidem");
        return;
      }
      await register.mutateAsync({ name, email, phone, password });
      toast.success(
        "Conta enviada para aprovação. Você será avisado por e-mail."
      );
      setPassword("");
      setConfirmation("");
      setMode("login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível concluir"
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-gold/20 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-gold">
                Affinity Financial
              </div>
              <span className="hidden text-sm font-semibold text-gold/80 sm:inline">
                Portal do Agente
              </span>
            </div>
            <Button
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => setLocation("/")}
            >
              Voltar ao Site
            </Button>
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-gold/20 bg-black p-8">
          <h1 className="mb-2 text-3xl font-bold text-gold">
            {mode === "login"
              ? "Bem-vindo"
              : mode === "register"
                ? "Criar conta"
                : "Recuperar Senha"}
          </h1>
          <p className="mb-6 text-sm text-gray-400">
            {mode === "login"
              ? "Faça login para acessar o Portal do Agente"
              : mode === "register"
                ? "Preencha seus dados. O acesso será liberado após aprovação administrativa."
                : "Informe seu e-mail para receber um link seguro de redefinição."}
          </p>
          <form method="post" className="space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <>
                <Field label="Nome completo">
                  <Input
                    className="border-gold/30 bg-black text-white"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Telefone">
                  <Input
                    className="border-gold/30 bg-black text-white"
                    type="tel"
                    placeholder="Seu telefone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Email">
              <Input
                className="border-gold/30 bg-black text-white"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </Field>
            {mode !== "forgot" && (
              <Field label="Senha">
                <Input
                  className="border-gold/30 bg-black text-white"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login" ? "Sua senha" : "Crie uma senha forte"
                  }
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </Field>
            )}
            {mode === "register" && (
              <>
                <Field label="Confirmar senha">
                  <Input
                    className="border-gold/30 bg-black text-white"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite a senha novamente"
                    value={confirmation}
                    onChange={e => setConfirmation(e.target.value)}
                    minLength={6}
                    required
                  />
                </Field>
                <p className="text-xs text-gray-500">
                  Use letra maiúscula, minúscula, número e caractere especial.
                </p>
              </>
            )}
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-gold font-semibold text-black hover:bg-gold/90"
            >
              {pending
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : mode === "register"
                    ? "Solicitar acesso"
                    : "Enviar link"}
            </Button>
          </form>
          <div className="mt-6 flex flex-col items-center gap-4 text-sm">
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  className="cursor-pointer text-xs text-gold hover:text-gold/80"
                  onClick={() => setMode("forgot")}
                >
                  Esqueci minha senha
                </button>
                <p className="text-gray-400">
                  Ainda não tem acesso?{" "}
                  <button
                    type="button"
                    className="font-semibold text-gold hover:text-gold/80"
                    onClick={() => setMode("register")}
                  >
                    Criar conta
                  </button>
                </p>
              </>
            ) : (
              <button
                type="button"
                className="text-gold hover:text-gold/80"
                onClick={() => setMode("login")}
              >
                Voltar para o login
              </button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-gold">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
