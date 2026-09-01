import {
  t as n,
  r as m,
  j as e,
  C as v,
  B as d,
  b as r,
} from "./index-BIU-6RMI.js?v=20260901-11";
import { A as F } from "./AgentSidebar-BffvVO7a.js?v=20260901-2";
import { I as i } from "./input-maK0rC7f.js";
import { S as M } from "./switch-DFk453nH.js";
import { U as z } from "./user-round-BYvPk1yR.js";
import { M as I } from "./map-pin-3R0WHCs2.js";
import { S as R } from "./save-BWWR3RtX.js";
import { S as A } from "./shield-check-CQZEKJwS.js";
import { M as q } from "./mail-DTOVvRc8.js";
import { S as U } from "./send-u-E2Isyn.js";
import { M as Q } from "./LanguageSelector-DkTXTche.js";
import "./FloatingInternalChat-C-mZ1jql.js";
import "./x-BKidgWlG.js";
import "./chevron-right-DepQZrYR.js";
import "./external-link-CEjUwZyT.js";
const D = {
    provider: "icloud",
    host: "smtp.mail.me.com",
    port: 587,
    secure: !1,
    user: "",
    password: "",
    fromEmail: "",
    fromName: "Affinity Financial",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapUser: "",
  },
  W = {
    name: "",
    email: "",
    contactEmail: "",
    phone: "",
    whatsapp: "",
    address: "",
  },
  $ = { portalEmail: "", password: "" };
function se() {
  const u = n.agent.getEmailSettings.useQuery(),
    c = n.agent.getProfile.useQuery(),
    s = n.agent.getFiveRingsConnection.useQuery(),
    j = n.agent.saveEmailSettings.useMutation(),
    y = n.agent.testEmailSettings.useMutation(),
    C = n.agent.updateProfile.useMutation(),
    w = n.agent.saveFiveRingsConnection.useMutation(),
    E = n.agent.verifyFiveRingsConnection.useMutation(),
    S = n.agent.submitFiveRingsCode.useMutation(),
    x = n.agent.syncFiveRings.useMutation(),
    k = n.agent.resetFiveRingsChallenge.useMutation(),
    [t, l] = m.useState(D),
    [o, p] = m.useState(W),
    [g, h] = m.useState($),
    [f, b] = m.useState(""),
    [N, P] = m.useState("");
  return (
    m.useEffect(() => {
      u.data && l(a => ({ ...a, ...u.data, password: "" }));
    }, [u.data]),
    m.useEffect(() => {
      c.data &&
        p({
          name: c.data.name,
          email: c.data.email,
          contactEmail: c.data.contactEmail || "",
          phone: c.data.phone || "",
          whatsapp: c.data.whatsapp || "",
          address: c.data.address || "",
        });
    }, [c.data]),
    m.useEffect(() => {
      s.data && h({ portalEmail: s.data.portalEmail, password: "" });
    }, [s.data]),
    e.jsxs("div", {
      className: "min-h-screen bg-black text-white lg:pl-64",
      children: [
        e.jsx(F, {}),
        e.jsxs("main", {
          className: "mx-auto max-w-3xl space-y-6 px-4 py-8",
          children: [
            e.jsxs("div", {
              children: [
                e.jsx("p", {
                  className:
                    "text-sm font-bold uppercase tracking-[.2em] text-gold",
                  children: "Sua conta",
                }),
                e.jsx("h1", {
                  className: "mt-2 text-3xl font-bold",
                  children: "Configurações",
                }),
                e.jsx("p", {
                  className: "mt-2 text-gray-400",
                  children:
                    "Gerencie seu perfil e os canais usados no acompanhamento dos clientes.",
                }),
              ],
            }),
            e.jsxs(v, {
              id: "perfil",
              className: "space-y-5 border-gold/20 bg-[#0b1524] p-6",
              children: [
                e.jsxs("h2", {
                  className:
                    "flex items-center gap-2 text-xl font-bold text-gold",
                  children: [e.jsx(z, {}), "Meu perfil"],
                }),
                e.jsxs("div", {
                  className: "grid gap-4 sm:grid-cols-2",
                  children: [
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Nome completo",
                        e.jsx(i, {
                          className: "mt-2",
                          value: o.name,
                          onChange: a => p({ ...o, name: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "E-mail de acesso",
                        e.jsx(i, {
                          className: "mt-2 opacity-70",
                          value: o.email,
                          disabled: !0,
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "E-mail de contato",
                        e.jsx(i, {
                          className: "mt-2",
                          type: "email",
                          value: o.contactEmail,
                          onChange: a =>
                            p({ ...o, contactEmail: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Telefone",
                        e.jsx(i, {
                          className: "mt-2",
                          type: "tel",
                          value: o.phone,
                          onChange: a => p({ ...o, phone: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300 sm:col-span-2",
                      children: [
                        "WhatsApp profissional",
                        e.jsx(i, {
                          className: "mt-2",
                          type: "tel",
                          placeholder: "Inclua o código do país",
                          value: o.whatsapp,
                          onChange: a => p({ ...o, whatsapp: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300 sm:col-span-2",
                      children: [
                        "Endereço",
                        e.jsxs("div", {
                          className: "relative mt-2",
                          children: [
                            e.jsx(I, {
                              className: "absolute left-3 top-3 text-gray-500",
                              size: 17,
                            }),
                            e.jsx(i, {
                              className: "pl-10",
                              value: o.address,
                              onChange: a =>
                                p({ ...o, address: a.target.value }),
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsx("p", {
                  className: "text-xs text-gray-500",
                  children:
                    "Por segurança, o e-mail usado para entrar somente pode ser alterado pelo administrador mestre.",
                }),
                e.jsxs(d, {
                  className: "w-full bg-gold text-black",
                  disabled: C.isPending,
                  onClick: async () => {
                    try {
                      (await C.mutateAsync({
                        name: o.name,
                        contactEmail: o.contactEmail,
                        phone: o.phone,
                        whatsapp: o.whatsapp,
                        address: o.address,
                      }),
                        await c.refetch(),
                        r.success("Perfil atualizado"));
                    } catch (a) {
                      r.error(
                        a instanceof Error
                          ? a.message
                          : "Não foi possível atualizar"
                      );
                    }
                  },
                  children: [
                    e.jsx(R, { size: 16, className: "mr-2" }),
                    "Salvar perfil",
                  ],
                }),
                s.data &&
                  e.jsx(d, {
                    className: "w-full bg-gold text-black hover:bg-yellow-300",
                    disabled: x.isPending,
                    onClick: async () => {
                      try {
                        const a = await x.mutateAsync();
                        if ((await s.refetch(), a.requiresCode)) {
                          r.info("Informe o código enviado pelo Five Rings");
                          return;
                        }
                        r.success(
                          `${a.found || 0} registros encontrados no Five Rings · ${a.importedClients} clientes novos · ${a.importedPolicies} apólices novas · ${a.updatedPolicies} apólices conferidas/atualizadas`
                        );
                      } catch (a) {
                        (await s.refetch(),
                          r.error(
                            a instanceof Error
                              ? a.message
                              : "Não foi possível sincronizar"
                          ));
                      }
                    },
                    children: x.isPending
                      ? "Sincronizando..."
                      : "Sincronizar clientes e apólices",
                  }),
                s.data &&
                  e.jsx(d, {
                    variant: "outline",
                    className: "w-full border-sky-300/50 text-sky-200",
                    disabled: E.isPending,
                    onClick: async () => {
                      try {
                        const a = await E.mutateAsync();
                        (await s.refetch(),
                          a.success
                            ? r.success(
                                "Login confirmado em modo somente leitura"
                              )
                            : a.requiresCode &&
                              r.info(
                                "Informe o código enviado pelo Five Rings"
                              ));
                      } catch (a) {
                        (await s.refetch(),
                          r.error(
                            a instanceof Error
                              ? a.message
                              : "Não foi possível verificar o login"
                          ));
                      }
                    },
                    children: "Apenas verificar conexão",
                  }),
                s.data?.requiresCode &&
                  e.jsxs("div", {
                    className:
                      "space-y-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4",
                    children: [
                      e.jsx("p", {
                        className: "text-sm text-amber-100",
                        children:
                          "O Five Rings enviou um código por e-mail. Informe-o abaixo para concluir o acesso.",
                      }),
                      e.jsx(i, {
                        inputMode: "numeric",
                        autoComplete: "one-time-code",
                        placeholder: "Código de confirmação",
                        value: f,
                        onChange: a =>
                          b(a.target.value.replace(/\D/g, "").slice(0, 10)),
                      }),
                      e.jsx(d, {
                        className:
                          "w-full bg-amber-300 text-black hover:bg-amber-200",
                        disabled: f.length < 4 || S.isPending,
                        onClick: async () => {
                          try {
                            (await S.mutateAsync({ code: f })).success &&
                              (b(""),
                              await s.refetch(),
                              r.success(
                                "Código confirmado. Five Rings conectado."
                              ));
                          } catch (a) {
                            r.error(
                              a instanceof Error ? a.message : "Código inválido"
                            );
                          }
                        },
                        children: "Confirmar código",
                      }),
                      e.jsx(d, {
                        type: "button",
                        variant: "outline",
                        className: "w-full border-amber-200/50 text-amber-100",
                        disabled: k.isPending || x.isPending,
                        onClick: async () => {
                          try {
                            (await k.mutateAsync(), b(""), await s.refetch());
                            const a = await x.mutateAsync();
                            (await s.refetch(),
                              a.requiresCode
                                ? r.info("Novo código solicitado por e-mail")
                                : r.success(
                                    "Conexão reiniciada e sincronizada"
                                  ));
                          } catch (a) {
                            (await s.refetch(),
                              r.error(
                                a instanceof Error
                                  ? a.message
                                  : "Não foi possível reiniciar"
                              ));
                          }
                        },
                        children: "Reiniciar e enviar por e-mail",
                      }),
                    ],
                  }),
                s.data?.lastError &&
                  e.jsx("p", {
                    className:
                      "rounded-lg bg-red-500/10 p-3 text-sm text-red-200",
                    children: s.data.lastError,
                  }),
              ],
            }),
            e.jsxs(v, {
              id: "five-rings",
              className: "space-y-5 border-sky-400/20 bg-[#0b1524] p-6",
              children: [
                e.jsxs("h2", {
                  className:
                    "flex items-center gap-2 text-xl font-bold text-sky-300",
                  children: [e.jsx(A, {}), "Portal Five Rings"],
                }),
                e.jsx("div", {
                  className:
                    "rounded-lg border border-sky-400/20 bg-sky-500/10 p-4 text-sm leading-relaxed text-sky-100",
                  children:
                    "Conexão protegida e somente para leitura. O CRM poderá importar clientes e apólices, mas nunca criar, editar ou excluir informações dentro do Five Rings.",
                }),
                e.jsxs("label", {
                  className: "block text-sm text-gray-300",
                  children: [
                    "E-mail do portal Five Rings",
                    e.jsx(i, {
                      className: "mt-2",
                      type: "email",
                      autoComplete: "username",
                      placeholder: "seu-email@exemplo.com",
                      value: g.portalEmail,
                      onChange: a => h({ ...g, portalEmail: a.target.value }),
                    }),
                  ],
                }),
                e.jsxs("label", {
                  className: "block text-sm text-gray-300",
                  children: [
                    "Senha do portal",
                    e.jsx(i, {
                      className: "mt-2",
                      type: "password",
                      autoComplete: "current-password",
                      placeholder: s.data?.passwordConfigured
                        ? "Deixe vazio para manter a senha atual"
                        : "Informe sua senha",
                      value: g.password,
                      onChange: a => h({ ...g, password: a.target.value }),
                    }),
                  ],
                }),
                s.data &&
                  e.jsxs("div", {
                    className:
                      "rounded-lg bg-black/30 p-3 text-sm text-gray-300",
                    children: [
                      "Status: ",
                      s.data.status === "connected"
                        ? "Conectado"
                        : "Aguardando verificação",
                      s.data.lastSyncAt
                        ? ` · Última importação: ${new Date(s.data.lastSyncAt).toLocaleString("pt-BR")}`
                        : "",
                    ],
                  }),
                e.jsxs(d, {
                  className:
                    "w-full bg-sky-300 text-slate-950 hover:bg-sky-200",
                  disabled: !g.portalEmail || w.isPending,
                  onClick: async () => {
                    try {
                      (await w.mutateAsync(g),
                        h(a => ({ ...a, password: "" })),
                        await s.refetch(),
                        r.success("Acesso Five Rings salvo com proteção"));
                    } catch (a) {
                      r.error(
                        a instanceof Error
                          ? a.message
                          : "Não foi possível salvar o acesso"
                      );
                    }
                  },
                  children: [
                    e.jsx(A, { size: 16, className: "mr-2" }),
                    "Conectar em modo somente leitura",
                  ],
                }),
                e.jsx("p", {
                  className: "text-xs leading-relaxed text-gray-500",
                  children:
                    "A senha é criptografada e não volta a aparecer nesta tela. Cada agente acessa exclusivamente a própria conexão.",
                }),
              ],
            }),
            e.jsxs(v, {
              id: "email",
              className: "space-y-6 border-gold/20 bg-[#0b1524] p-6",
              children: [
                e.jsxs("h2", {
                  className:
                    "flex items-center gap-2 text-xl font-bold text-gold",
                  children: [e.jsx(q, {}), "Meu e-mail"],
                }),
                e.jsx("div", {
                  className:
                    "rounded-lg border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100",
                  children:
                    "Selecione iCloud ou Gmail e use uma senha específica de aplicativo. A mesma senha conecta envio e recebimento; sua senha normal não deve ser usada.",
                }),
                e.jsx("h3", {
                  className: "font-semibold text-gold",
                  children: "Envio (SMTP)",
                }),
                e.jsxs("div", {
                  className: "grid gap-4 sm:grid-cols-2",
                  children: [
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Servidor",
                        e.jsx(i, {
                          className: "mt-2",
                          value: t.host,
                          onChange: a => l({ ...t, host: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Porta",
                        e.jsx(i, {
                          className: "mt-2",
                          type: "number",
                          value: t.port,
                          onChange: a =>
                            l({ ...t, port: Number(a.target.value) }),
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "flex items-center gap-3 rounded-lg bg-black/30 p-3",
                  children: [
                    e.jsx(M, {
                      checked: t.secure,
                      onCheckedChange: a => l({ ...t, secure: a }),
                    }),
                    e.jsx("span", {
                      className: "text-sm",
                      children: "Usar SSL direto no envio",
                    }),
                  ],
                }),
                e.jsxs("label", {
                  className: "block text-sm text-gray-300",
                  children: [
                    "E-mail/usuário",
                    e.jsx(i, {
                      className: "mt-2",
                      type: "email",
                      placeholder:
                        t.provider === "gmail"
                          ? "seu-email@gmail.com"
                          : "seu-email@icloud.com",
                      value: t.user,
                      onChange: a =>
                        l({
                          ...t,
                          user: a.target.value,
                          imapUser: a.target.value,
                        }),
                    }),
                  ],
                }),
                e.jsxs("label", {
                  className: "block text-sm text-gray-300",
                  children: [
                    "Senha específica de aplicativo",
                    e.jsx(i, {
                      className: "mt-2",
                      type: "password",
                      placeholder: u.data?.passwordConfigured
                        ? "Deixe vazio para manter a senha atual"
                        : "Informe a senha de aplicativo",
                      value: t.password,
                      onChange: a => l({ ...t, password: a.target.value }),
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "grid gap-4 sm:grid-cols-2",
                  children: [
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "E-mail do remetente",
                        e.jsx(i, {
                          className: "mt-2",
                          type: "email",
                          value: t.fromEmail,
                          onChange: a => l({ ...t, fromEmail: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Nome do remetente",
                        e.jsx(i, {
                          className: "mt-2",
                          value: t.fromName,
                          onChange: a => l({ ...t, fromName: a.target.value }),
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsx("h3", {
                  className:
                    "border-t border-white/10 pt-5 font-semibold text-gold",
                  children: "Recebimento (IMAP)",
                }),
                e.jsxs("div", {
                  className: "grid gap-4 sm:grid-cols-2",
                  children: [
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Servidor de entrada",
                        e.jsx(i, {
                          className: "mt-2",
                          value: t.imapHost,
                          onChange: a => l({ ...t, imapHost: a.target.value }),
                        }),
                      ],
                    }),
                    e.jsxs("label", {
                      className: "text-sm text-gray-300",
                      children: [
                        "Porta segura",
                        e.jsx(i, {
                          className: "mt-2",
                          type: "number",
                          value: t.imapPort,
                          onChange: a =>
                            l({ ...t, imapPort: Number(a.target.value) }),
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsxs("label", {
                  className: "block text-sm text-gray-300",
                  children: [
                    "Conta que recebe respostas e avisos das seguradoras",
                    e.jsx(i, {
                      className: "mt-2",
                      type: "email",
                      placeholder:
                        t.provider === "gmail"
                          ? "Ex.: seu-email@gmail.com"
                          : "Ex.: us.rafael@icloud.com",
                      value: t.imapUser,
                      onChange: a => l({ ...t, imapUser: a.target.value }),
                    }),
                    e.jsx("span", {
                      className: "mt-2 block text-xs text-gray-500",
                      children:
                        "Pode ser diferente do e-mail de envio. O sistema usará a mesma senha de aplicativo para acompanhar respostas de clientes e avisos de pagamento de apólices.",
                    }),
                  ],
                }),
                e.jsxs(d, {
                  className: "w-full bg-gold text-black",
                  disabled: j.isPending,
                  onClick: async () => {
                    try {
                      (await j.mutateAsync(t),
                        await u.refetch(),
                        r.success(
                          "Envio e recebimento de e-mail configurados"
                        ));
                    } catch (a) {
                      r.error(
                        a instanceof Error
                          ? a.message
                          : "Não foi possível salvar"
                      );
                    }
                  },
                  children: [
                    e.jsx(R, { size: 16, className: "mr-2" }),
                    "Salvar e-mail",
                  ],
                }),
                e.jsxs("div", {
                  className: "border-t border-white/10 pt-5",
                  children: [
                    e.jsx("p", {
                      className: "mb-3 text-sm text-gray-400",
                      children: "Depois de salvar, envie um teste:",
                    }),
                    e.jsxs("div", {
                      className: "flex gap-2",
                      children: [
                        e.jsx(i, {
                          type: "email",
                          placeholder: "E-mail que receberá o teste",
                          value: N,
                          onChange: a => P(a.target.value),
                        }),
                        e.jsxs(d, {
                          variant: "outline",
                          disabled: !N || y.isPending,
                          onClick: async () => {
                            try {
                              (await y.mutateAsync({ email: N }),
                                r.success("E-mail de teste enviado"));
                            } catch (a) {
                              r.error(
                                a instanceof Error
                                  ? a.message
                                  : "Falha no teste"
                              );
                            }
                          },
                          children: [
                            e.jsx(U, { size: 16, className: "mr-2" }),
                            "Testar",
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            e.jsxs(v, {
              id: "whatsapp",
              className: "border-green-500/20 bg-[#0b1524] p-6",
              children: [
                e.jsxs("h2", {
                  className:
                    "flex items-center gap-2 text-xl font-bold text-green-400",
                  children: [e.jsx(Q, {}), "Meu WhatsApp"],
                }),
                e.jsx("p", {
                  className: "mt-3 text-sm leading-relaxed text-gray-300",
                  children:
                    "Você pode usar seu WhatsApp pessoal. Ao clicar em WhatsApp na ficha de um cliente, o CRM abre a conversa com a mensagem pronta e registra a ação no histórico do atendimento.",
                }),
                e.jsx("div", {
                  className:
                    "mt-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-200",
                  children:
                    "Integração simples ativa após salvar seu número no perfil. Não é necessário cadastrar uma conta empresarial.",
                }),
                e.jsx("p", {
                  className: "mt-3 text-xs leading-relaxed text-gray-500",
                  children:
                    "As respostas continuam no seu aplicativo WhatsApp. Se no futuro a Affinity quiser receber e responder mensagens dentro do próprio CRM, poderemos ativar a integração empresarial sem refazer os cadastros.",
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );
}
export { se as default };
