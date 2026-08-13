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
      <header className="border-b border-gold/20 p-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <strong className="text-xl text-gold">Affinity Financial</strong>
            <span className="ml-3 hidden text-sm text-gold/80 sm:inline">
              Portal do Agente
            </span>
          </div>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Voltar ao site
          </Button>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 py-10">
        <Card className="w-full max-w-md border-gold/20 bg-black p-8">
          <p className="text-sm font-bold uppercase tracking-[.2em] text-gold">
            Portal do Agente
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            {mode === "login"
              ? "Acessar sua conta"
              : mode === "register"
                ? "Criar conta"
                : "Redefinir senha"}
          </h1>
          <p className="mb-7 mt-2 text-sm text-gray-400">
            {mode === "login"
              ? "Entre para acessar clientes, CRM, apólices e tarefas."
              : mode === "register"
                ? "Preencha seus dados. O acesso será liberado após aprovação administrativa."
                : "Informe seu e-mail para receber um link seguro de redefinição."}
          </p>
          <form className="space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <>
                <Input
                  placeholder="Nome completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Telefone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </>
            )}
            <Input
              type="email"
              autoComplete="username"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {mode !== "forgot" && (
              <Input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={mode === "login" ? "Senha" : "Senha forte"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
              />
            )}
            {mode === "register" && (
              <>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirmar senha"
                  value={confirmation}
                  onChange={e => setConfirmation(e.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500">
                  Use letra maiúscula, minúscula, número e caractere especial.
                </p>
              </>
            )}
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-gold font-semibold text-black"
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
          <div className="mt-6 flex flex-col items-center gap-3 text-sm">
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  className="text-gold hover:text-gold/80"
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
