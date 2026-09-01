import {
  c as I,
  j as e,
  t as p,
  r as v,
  B as m,
  C as N,
  b as h,
} from "./index-BIU-6RMI.js";
import { A as z } from "./AgentSidebar-BffvVO7a.js?v=20260901-2";
import { I as f } from "./input-maK0rC7f.js";
import { P as G } from "./plus-DKqFfTiU.js";
import { P as E } from "./pen-BtFcHMZL.js";
import { T as _ } from "./trash-2-DP0NeSJV.js";
import { R as q } from "./refresh-cw-DKCd_O_1.js";
import { C as F } from "./circle-x-CDonS9qj.js";
import "./FloatingInternalChat-C-mZ1jql.js";
import "./LanguageSelector-DkTXTche.js";
import "./x-BKidgWlG.js";
import "./send-u-E2Isyn.js";
import "./chevron-right-DepQZrYR.js";
import "./external-link-CEjUwZyT.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const L = I("CircleCheck", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const O = I("Clock3", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["polyline", { points: "12 6 12 12 16.5 12", key: "1aq6pp" }],
  ]),
  k = "Atualização importante sobre sua apólice",
  M = `Oi {cliente}, tudo bem?

Estou entrando em contato para avisar que o pagamento da sua apólice nº {apolice} acabou retornando.

Assim que possível, por favor, me ligue para verificarmos isso juntos. Se preferir, você também pode reagendar o pagamento diretamente pelo aplicativo.

É importante regularizarmos o pagamento para manter sua apólice em dia. Qualquer dúvida ou se precisar de ajuda, pode contar comigo.

Um abraço,

{agente}
Affinity Financial Consulting
📞 {telefone}
🌐 www.affinityfc.org`,
  $ = {
    title: "",
    subject: "",
    occasion: "custom",
    audience: "individual",
    recipientGroup: "client",
    selectedClientIds: [],
    message: "Olá {nome},",
    scheduledAt: "",
    deliveryMode: "default",
    isActive: !0,
  },
  S = {
    birthday: "Aniversário",
    thanksgiving: "Dia de Ação de Graças",
    christmas: "Natal",
    new_year: "Ano-Novo",
    policy_anniversary: "Revisão Flex Life (13 meses)",
    monthly: "Início do mês",
    custom: "Data personalizada",
  },
  U = () => {
    const s = new Date();
    return (
      s.setHours(8, 30, 0, 0),
      s.getTime() <= Date.now() && s.setDate(s.getDate() + 1),
      s.toISOString()
    );
  };
function Q({ scope: s = "all", clientId: u, paymentTemplateCard: x }) {
  const g = p.agent.listMessages.useQuery(),
    o = p.agent.listClients.useQuery(),
    b = p.crm.assignees.useQuery(),
    i = p.agent.scheduleMessage.useMutation(),
    c = p.agent.updateMessage.useMutation(),
    r = p.agent.deleteMessage.useMutation(),
    [t, n] = v.useState(null),
    y = (() => {
      try {
        return JSON.parse(localStorage.getItem("agentSession") || "{}");
      } catch {
        return {};
      }
    })(),
    j = (b.data || []).find(
      a => a.email.toLowerCase() === String(y.email || "").toLowerCase()
    ),
    w = a =>
      String(a || "")
        .replaceAll("{agente_nome}", j?.name || y.name || "Nome do agente")
        .replaceAll(
          "{agente_telefone}",
          j?.phone || j?.whatsapp || "Telefone do agente"
        )
        .replaceAll("{agente}", j?.name || y.name || "Nome do agente")
        .replaceAll(
          "{telefone do agente}",
          j?.phone || j?.whatsapp || "Telefone do agente"
        ),
    C = v.useRef(null);
  v.useEffect(() => {
    t &&
      window.setTimeout(
        () => C.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50
      );
  }, [t?.id, t?.monthNumber, !!t]);
  const P = (g.data || []).filter(a =>
      s === "collective"
        ? ["thanksgiving", "christmas", "new_year", "monthly"].includes(
            a.occasion
          ) && a.audience !== "individual"
        : s === "client"
          ? a.clientId === u ||
            (["birthday", "policy_anniversary"].includes(a.occasion) &&
              !(g.data || []).some(
                l => l.clientId === u && l.occasion === a.occasion
              ))
          : !0
    ),
    T = () =>
      n({
        ...$,
        audience: s === "collective" ? "all" : "individual",
        clientId: s === "client" ? u : void 0,
        occasion: s === "collective" ? "thanksgiving" : "custom",
      }),
    D = async () => {
      if (!t?.title.trim() || !t.subject.trim() || !t.message.trim())
        return h.error("Preencha título, assunto e mensagem");
      if (t.audience === "individual" && !t.clientId)
        return h.error("Selecione um cliente");
      try {
        if (
          t.occasion === "custom" &&
          t.deliveryMode === "scheduled" &&
          !t.scheduledAt
        )
          return h.error("Escolha a data e o horário do envio");
        const a =
            t.occasion !== "custom"
              ? t.scheduledAt
                ? new Date(t.scheduledAt).toISOString()
                : ""
              : t.deliveryMode === "immediate"
                ? new Date().toISOString()
                : t.deliveryMode === "default"
                  ? U()
                  : new Date(t.scheduledAt).toISOString(),
          l = { ...t, channel: "email", scheduledAt: a };
        (t.id
          ? await c.mutateAsync({ ...l, id: t.id })
          : await i.mutateAsync(l),
          await g.refetch(),
          n(null),
          h.success(
            t.occasion === "custom" && t.deliveryMode === "immediate"
              ? "Mensagem enviada imediatamente"
              : "Automação salva"
          ));
      } catch (a) {
        h.error(a instanceof Error ? a.message : "Não foi possível salvar");
      }
    },
    A = a => {
      try {
        return a ? JSON.parse(String(a)) : [];
      } catch {
        return [];
      }
    },
    R = a =>
      n({
        id: s === "client" && a.clientId !== u ? void 0 : a.id,
        title: a.title || "Automação",
        subject: a.subject || a.title || "Mensagem da Affinity",
        occasion: a.occasion,
        audience:
          s === "client"
            ? "individual"
            : a.audience || (a.clientId ? "individual" : "all"),
        clientId: s === "client" ? u : a.clientId || void 0,
        recipientGroup: a.recipientGroup || "client",
        selectedClientIds: a.selectedClientIds
          ? A(a.selectedClientIds)
          : (o.data || [])
              .filter(
                l =>
                  l.email &&
                  (a.audience !== "group" ||
                    (a.recipientGroup === "leads"
                      ? ["new", "contacted", "meeting", "proposal"].includes(
                          l.status
                        )
                      : l.status === a.recipientGroup))
              )
              .map(l => l.id),
        message: a.message,
        scheduledAt: a.scheduledAt ? String(a.scheduledAt).slice(0, 16) : "",
        deliveryMode: "scheduled",
        isActive: !!a.isActive,
        monthNumber: a.monthNumber ? Number(a.monthNumber) : void 0,
      });
  return e.jsxs("section", {
    className: "space-y-5",
    children: [
      e.jsxs("div", {
        className:
          "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-sm font-bold uppercase tracking-[.2em] text-gold",
                children: "Automações do CRM",
              }),
              e.jsx("h1", {
                className: "mt-2 text-3xl font-bold",
                children:
                  s === "collective"
                    ? "Mensagens coletivas"
                    : s === "client"
                      ? "Mensagens deste cliente"
                      : "Mensagens e automações",
              }),
              e.jsxs("p", {
                className: "mt-2 text-sm text-gray-400",
                children: [
                  "Crie mensagens sob demanda ou automáticas, individuais, em grupo ou coletivas. Os envios programados usam 8:30 AM como horário padrão pelo e-mail particular configurado no portal. Use ",
                  e.jsx("b", { children: "{nome}" }),
                  " para o cliente. Nos modelos de revisão Flex Life, use também ",
                  e.jsx("b", { children: "{apolice numero}" }),
                  ", ",
                  e.jsx("b", { children: "{agente}" }),
                  " e ",
                  e.jsx("b", { children: "{telefone do agente}" }),
                  ". Os dados são preenchidos automaticamente.",
                ],
              }),
            ],
          }),
          e.jsxs(m, {
            className: "bg-gold text-black",
            onClick: T,
            children: [
              e.jsx(G, { className: "mr-2 h-4 w-4" }),
              "Nova automação",
            ],
          }),
        ],
      }),
      x,
      t &&
        e.jsxs(N, {
          ref: C,
          className:
            "scroll-mt-4 grid gap-4 border-2 border-gold/50 bg-[#0b1524] p-6 shadow-2xl shadow-black/50 md:grid-cols-2",
          children: [
            e.jsx(f, {
              placeholder: "Nome da automação",
              value: t.title,
              onChange: a => n({ ...t, title: a.target.value }),
            }),
            e.jsx(f, {
              placeholder: "Assunto do e-mail",
              value: t.subject,
              onChange: a => n({ ...t, subject: a.target.value }),
            }),
            e.jsxs("label", {
              className: "text-sm text-gray-300",
              children: [
                "Ocasião",
                e.jsxs("select", {
                  className:
                    "mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3",
                  value: t.occasion,
                  onChange: a => n({ ...t, occasion: a.target.value }),
                  children: [
                    s !== "collective" &&
                      e.jsx("option", {
                        value: "birthday",
                        children: "Aniversário do cliente",
                      }),
                    e.jsx("option", {
                      value: "thanksgiving",
                      children: "Dia de Ação de Graças",
                    }),
                    e.jsx("option", { value: "christmas", children: "Natal" }),
                    e.jsx("option", {
                      value: "new_year",
                      children: "Ano-Novo",
                    }),
                    s !== "collective" &&
                      e.jsx("option", {
                        value: "policy_anniversary",
                        children: "Revisão Flex Life (1 ano e 1 mês)",
                      }),
                    e.jsx("option", {
                      value: "monthly",
                      children: "Início do mês",
                    }),
                    e.jsx("option", {
                      value: "custom",
                      children: "Data personalizada",
                    }),
                  ],
                }),
              ],
            }),
            t.occasion === "monthly" &&
              e.jsxs("label", {
                className: "text-sm text-gray-300",
                children: [
                  "Mês",
                  e.jsx("select", {
                    className:
                      "mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3",
                    value: t.monthNumber || 1,
                    onChange: a =>
                      n({ ...t, monthNumber: Number(a.target.value) }),
                    children: [
                      "Janeiro",
                      "Fevereiro",
                      "Março",
                      "Abril",
                      "Maio",
                      "Junho",
                      "Julho",
                      "Agosto",
                      "Setembro",
                      "Outubro",
                      "Novembro",
                      "Dezembro",
                    ].map((a, l) =>
                      e.jsx("option", { value: l + 1, children: a }, a)
                    ),
                  }),
                ],
              }),
            e.jsxs("label", {
              className: "text-sm text-gray-300",
              children: [
                "Destinatários",
                e.jsxs("select", {
                  className:
                    "mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3",
                  value: t.audience,
                  onChange: a => {
                    const l = a.target.value;
                    n({
                      ...t,
                      audience: l,
                      selectedClientIds:
                        l === "individual" ||
                        (l === "all" && t.occasion !== "custom")
                          ? []
                          : (o.data || []).filter(d => d.email).map(d => d.id),
                    });
                  },
                  children: [
                    s !== "collective" &&
                      e.jsx("option", {
                        value: "individual",
                        children: "Individual",
                      }),
                    s !== "client" &&
                      e.jsx("option", { value: "group", children: "Grupo" }),
                    s !== "client" &&
                      e.jsx("option", {
                        value: "all",
                        children: "Coletiva — todos os clientes",
                      }),
                  ],
                }),
              ],
            }),
            t.audience === "individual" &&
              e.jsxs("label", {
                className: "text-sm text-gray-300 md:col-span-2",
                children: [
                  "Cliente",
                  e.jsxs("select", {
                    className:
                      "mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3",
                    value: t.clientId || "",
                    onChange: a =>
                      n({ ...t, clientId: Number(a.target.value) }),
                    children: [
                      e.jsx("option", { value: "", children: "Selecione" }),
                      (o.data || [])
                        .filter(a => a.email)
                        .map(a =>
                          e.jsxs(
                            "option",
                            { value: a.id, children: [a.name, " — ", a.email] },
                            a.id
                          )
                        ),
                    ],
                  }),
                ],
              }),
            t.audience === "group" &&
              e.jsxs("label", {
                className: "text-sm text-gray-300 md:col-span-2",
                children: [
                  "Grupo",
                  e.jsxs("select", {
                    className:
                      "mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3",
                    value: t.recipientGroup,
                    onChange: a => {
                      const l = a.target.value;
                      n({
                        ...t,
                        recipientGroup: l,
                        selectedClientIds: (o.data || [])
                          .filter(
                            d =>
                              d.email &&
                              (l === "leads"
                                ? [
                                    "new",
                                    "contacted",
                                    "meeting",
                                    "proposal",
                                  ].includes(d.status)
                                : d.status === l)
                          )
                          .map(d => d.id),
                      });
                    },
                    children: [
                      e.jsx("option", {
                        value: "leads",
                        children: "Todos os leads",
                      }),
                      e.jsx("option", { value: "new", children: "Novos" }),
                      e.jsx("option", {
                        value: "contacted",
                        children: "Contatados",
                      }),
                      e.jsx("option", {
                        value: "meeting",
                        children: "Reunião",
                      }),
                      e.jsx("option", {
                        value: "proposal",
                        children: "Proposta",
                      }),
                      e.jsx("option", {
                        value: "client",
                        children: "Clientes",
                      }),
                      e.jsx("option", {
                        value: "closed",
                        children: "Encerrados",
                      }),
                    ],
                  }),
                ],
              }),
            t.audience === "all" && t.occasion !== "custom" &&
              e.jsx("div", {
                className:
                  "rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200 md:col-span-2",
                children:
                  "Lista automática: todos os contatos atuais e todos os novos leads, clientes e agentes serão incluídos sem precisar selecionar novamente.",
              }),
            (t.audience === "group" ||
              (t.audience === "all" && t.occasion === "custom")) &&
              e.jsxs("fieldset", {
                className:
                  "max-h-64 overflow-y-auto rounded-lg border border-white/15 bg-black/30 p-4 md:col-span-2",
                children: [
                  e.jsx("legend", {
                    className: "px-2 text-sm font-semibold text-gold",
                    children: "Para quem vai esta mensagem",
                  }),
                  e.jsx("p", {
                    className: "mb-3 text-xs text-gray-400",
                    children:
                      "Selecione ou desmarque contatos deste grupo.",
                  }),
                  e.jsxs("div", {
                    className: "mb-3 flex gap-2",
                    children: [
                      e.jsx(m, {
                        type: "button",
                        size: "sm",
                        variant: "outline",
                        onClick: () =>
                          n({
                            ...t,
                            selectedClientIds: (o.data || [])
                              .filter(a => a.email)
                              .map(a => a.id),
                          }),
                        children: "Selecionar todos",
                      }),
                      e.jsx(m, {
                        type: "button",
                        size: "sm",
                        variant: "outline",
                        onClick: () => n({ ...t, selectedClientIds: [] }),
                        children: "Desmarcar todos",
                      }),
                    ],
                  }),
                  e.jsx("div", {
                    className: "grid gap-2 sm:grid-cols-2",
                    children: (o.data || [])
                      .filter(a => a.email)
                      .map(a =>
                        e.jsxs(
                          "label",
                          {
                            className:
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5",
                            children: [
                              e.jsx("input", {
                                type: "checkbox",
                                checked: t.selectedClientIds.includes(a.id),
                                onChange: l =>
                                  n({
                                    ...t,
                                    selectedClientIds: l.target.checked
                                      ? [...t.selectedClientIds, a.id]
                                      : t.selectedClientIds.filter(
                                          d => d !== a.id
                                        ),
                                  }),
                              }),
                              a.name,
                              " — ",
                              a.email,
                            ],
                          },
                          a.id
                        )
                      ),
                  }),
                ],
              }),
            t.occasion === "custom" &&
              e.jsxs("div", {
                className: "space-y-3 md:col-span-2",
                children: [
                  e.jsx("p", {
                    className: "text-sm font-semibold text-gray-300",
                    children: "Quando enviar",
                  }),
                  e.jsx("div", {
                    className: "grid gap-3 sm:grid-cols-3",
                    children: [
                      ["default", "Padrão", "Próximo envio às 8:30 AM"],
                      ["immediate", "Imediato", "Enviar assim que salvar"],
                      ["scheduled", "Programado", "Escolher data e horário"],
                    ].map(([a, l, d]) =>
                      e.jsxs(
                        "button",
                        {
                          type: "button",
                          onClick: () => n({ ...t, deliveryMode: a }),
                          className: `rounded-xl border p-4 text-left transition ${t.deliveryMode === a ? "border-gold bg-gold/10" : "border-white/15 bg-black/25 hover:border-gold/40"}`,
                          children: [
                            e.jsx("span", {
                              className: "block font-semibold text-white",
                              children: l,
                            }),
                            e.jsx("span", {
                              className: "mt-1 block text-xs text-gray-400",
                              children: d,
                            }),
                          ],
                        },
                        a
                      )
                    ),
                  }),
                  t.deliveryMode === "scheduled" &&
                    e.jsxs("label", {
                      className: "block text-sm text-gray-300",
                      children: [
                        "Data e horário do envio",
                        e.jsx(f, {
                          className: "mt-2",
                          type: "datetime-local",
                          value: t.scheduledAt,
                          onChange: a =>
                            n({ ...t, scheduledAt: a.target.value }),
                        }),
                      ],
                    }),
                  t.deliveryMode === "default" &&
                    e.jsx("p", {
                      className: "rounded-lg bg-gold/10 p-3 text-sm text-gold",
                      children:
                        "Será enviada no próximo horário padrão: 8:30 AM.",
                    }),
                ],
              }),
            e.jsx("textarea", {
              className:
                "min-h-32 rounded-md border border-white/20 bg-black p-3 md:col-span-2",
              value: t.message,
              onChange: a => n({ ...t, message: a.target.value }),
            }),
            e.jsxs("label", {
              className: "flex items-center gap-2 text-sm",
              children: [
                e.jsx("input", {
                  type: "checkbox",
                  checked: t.isActive,
                  onChange: a => n({ ...t, isActive: a.target.checked }),
                }),
                "Automação ativa",
              ],
            }),
            e.jsxs("div", {
              className: "flex justify-end gap-2 md:col-span-2",
              children: [
                e.jsx(m, {
                  variant: "outline",
                  onClick: () => n(null),
                  children: "Cancelar",
                }),
                e.jsx(m, {
                  className: "bg-gold text-black",
                  onClick: D,
                  children: "Salvar automação",
                }),
              ],
            }),
          ],
        }),
      e.jsx("div", {
        className: "grid gap-4 md:grid-cols-2",
        children: P.map(a =>
          e.jsxs(
            N,
            {
              className: "border-gold/20 bg-[#0b1524] p-5",
              children: [
                e.jsxs("div", {
                  className: "flex justify-between gap-3",
                  children: [
                    e.jsxs("div", {
                      children: [
                        e.jsx("span", {
                          className: `rounded-full px-2 py-1 text-xs ${a.isActive ? "bg-green-500/15 text-green-300" : "bg-gray-500/20 text-gray-400"}`,
                          children: a.isActive ? "Ativa" : "Pausada",
                        }),
                        e.jsx("h3", {
                          className: "mt-3 text-lg font-bold text-gold",
                          children: a.title || S[a.occasion],
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className: "flex gap-2",
                      children: [
                        e.jsx(m, {
                          size: "icon",
                          variant: "outline",
                          onClick: () => R(a),
                          children: e.jsx(E, { size: 16 }),
                        }),
                        e.jsx(m, {
                          size: "icon",
                          variant: "outline",
                          onClick: async () => {
                            window.confirm("Excluir esta automação?") &&
                              (await r.mutateAsync({ id: a.id }),
                              await g.refetch(),
                              h.success("Automação excluída"));
                          },
                          children: e.jsx(_, { size: 16 }),
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsxs("p", {
                  className:
                    "mt-2 text-xs uppercase tracking-wider text-gray-500",
                  children: [
                    S[a.occasion],
                    " · E-mail ·",
                    " ",
                    a.audience === "all"
                      ? "Coletiva"
                      : a.audience === "group"
                        ? "Grupo"
                        : "Individual",
                  ],
                }),
                e.jsx("p", {
                  className: "mt-3 text-sm font-semibold",
                  children: a.subject || a.title,
                }),
                e.jsxs("p", {
                  className: "mt-2 text-xs text-sky-300",
                  children: [
                    "Para:",
                    " ",
                    a.audience === "individual"
                      ? (o.data || []).find(l => l.id === a.clientId)?.name ||
                        "1 cliente"
                      : a.audience === "all" && a.occasion !== "custom"
                        ? "Todos os contatos atuais e futuros"
                        : a.selectedClientIds
                        ? `${A(a.selectedClientIds).length} clientes selecionados`
                        : `Grupo ${a.recipientGroup || "selecionado"}`,
                  ],
                }),
                e.jsx("p", {
                  className: "mt-2 whitespace-pre-wrap text-sm text-gray-300",
                  children: w(a.message),
                }),
              ],
            },
            a.id
          )
        ),
      }),
      s === "all" && e.jsx(J, {}),
    ],
  });
}
function B() {
  const s = p.agent.getPaymentReturnTemplate.useQuery(),
    u = p.agent.savePaymentReturnTemplate.useMutation(),
    [x, g] = v.useState(k),
    [o, b] = v.useState(M),
    [i, c] = v.useState(!1);
  return (
    v.useEffect(() => {
      s.data && (g(s.data.subject), b(s.data.message));
    }, [s.data]),
    e.jsxs(N, {
      className: "border-gold/30 bg-[#0b1524] p-5",
      children: [
        e.jsxs("div", {
          className: "flex items-start justify-between gap-4",
          children: [
            e.jsxs("div", {
              children: [
                e.jsx("span", {
                  className:
                    "rounded-full bg-green-500/15 px-2 py-1 text-xs text-green-300",
                  children: "Ativa",
                }),
                e.jsx("h2", {
                  className: "mt-3 text-lg font-bold text-gold",
                  children: "Pagamento devolvido",
                }),
                e.jsx("p", {
                  className:
                    "mt-2 text-xs uppercase tracking-wider text-gray-500",
                  children: "Modelo automático · E-mail individual",
                }),
                e.jsx("p", {
                  className: "mt-3 text-sm font-semibold text-white",
                  children: x,
                }),
                !i &&
                  e.jsx("p", {
                    className:
                      "mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-gray-300",
                    children: o,
                  }),
              ],
            }),
            e.jsx(m, {
              size: "icon",
              variant: "outline",
              "aria-label": "Editar modelo de pagamento devolvido",
              onClick: () => c(r => !r),
              children: e.jsx(E, { size: 16 }),
            }),
          ],
        }),
        i &&
          e.jsxs("div", {
            className: "mt-5 space-y-4 border-t border-white/10 pt-5",
            children: [
              e.jsxs("p", {
                className: "text-sm text-gray-400",
                children: [
                  "Este texto é enviado quando o sistema identifica com segurança o cliente e a apólice. Use ",
                  e.jsx("b", { children: "{cliente}" }),
                  ", ",
                  e.jsx("b", { children: "{agente}" }),
                  " e ",
                  e.jsx("b", { children: "{telefone}" }),
                  " para preencher os dados automaticamente.",
                ],
              }),
              e.jsxs("label", {
                className: "block text-sm text-gray-300",
                children: [
                  "Assunto",
                  e.jsx(f, {
                    className: "mt-2",
                    value: x,
                    onChange: r => g(r.target.value),
                  }),
                ],
              }),
              e.jsxs("label", {
                className: "block text-sm text-gray-300",
                children: [
                  "Mensagem",
                  e.jsx("textarea", {
                    className:
                      "mt-2 min-h-72 w-full rounded-md border border-white/20 bg-black p-4 text-sm leading-relaxed text-white",
                    value: o,
                    onChange: r => b(r.target.value),
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "flex flex-wrap gap-2",
                children: [
                  e.jsx(m, {
                    className: "bg-gold text-black",
                    disabled: u.isPending || !x.trim() || !o.trim(),
                    onClick: async () => {
                      try {
                        (await u.mutateAsync({ subject: x, message: o }),
                          await s.refetch(),
                          c(!1),
                          h.success("Modelo de pagamento devolvido salvo"));
                      } catch (r) {
                        h.error(
                          r instanceof Error
                            ? r.message
                            : "Não foi possível salvar o modelo"
                        );
                      }
                    },
                    children: "Salvar modelo",
                  }),
                  e.jsx(m, {
                    variant: "outline",
                    onClick: () => {
                      (g(k), b(M));
                    },
                    children: "Restaurar padrão",
                  }),
                  e.jsx(m, {
                    variant: "ghost",
                    onClick: () => c(!1),
                    children: "Cancelar",
                  }),
                ],
              }),
            ],
          }),
      ],
    })
  );
}
function J() {
  const s = p.agent.deliveryLog.useQuery(void 0, { refetchInterval: 3e4 }),
    u = s.data || [],
    [x, g] = v.useState("all"),
    [expandedId, setExpandedId] = v.useState(null),
    o = x === "all" ? u : u.filter(i => i.status === x),
    b = i => {
      if (!i) return "Horário automático";
      const raw = String(i),
        c = new Date(
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
            ? raw.replace(" ", "T") + "Z"
            : raw
        );
      return Number.isNaN(c.getTime())
        ? raw
        : c.toLocaleString("pt-BR", { timeZone: "America/New_York" });
    };
  return e.jsxs(N, {
    className: "border-gold/25 bg-[#0b1524] p-5",
    children: [
      e.jsxs("div", {
        className:
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-sm font-bold uppercase tracking-[.18em] text-gold",
                children: "Controle de saída",
              }),
              e.jsx("h2", {
                className: "mt-1 text-xl font-bold",
                children: "Registro de envios do CRM",
              }),
              e.jsx("p", {
                className: "mt-1 text-sm text-gray-400",
                children:
                  "Veja o que está programado, o que realmente foi enviado e qualquer falha.",
              }),
            ],
          }),
          e.jsxs(m, {
            variant: "outline",
            disabled: s.isFetching,
            onClick: () => s.refetch(),
            children: [
              e.jsx(q, {
                className: `mr-2 h-4 w-4 ${s.isFetching ? "animate-spin" : ""}`,
              }),
              "Atualizar",
            ],
          }),
        ],
      }),
      e.jsx("div", {
        className: "mt-4 flex flex-wrap gap-2",
        children: [
          ["all", "Todos"],
          ["scheduled", "Programados"],
          ["sent", "Enviados"],
          ["failed", "Falhas"],
        ].map(([i, c]) =>
          e.jsx(
            "button",
            {
              onClick: () => g(i),
              className: `rounded-full px-3 py-1.5 text-xs font-bold ${x === i ? "bg-gold text-black" : "bg-white/10 text-gray-300"}`,
              children: c,
            },
            i
          )
        ),
      }),
      e.jsxs("div", {
        className: "mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-1",
        children: [
          o.map(i => {
            const c = i.status === "sent" ? L : i.status === "failed" ? F : O,
              r =
                i.status === "sent"
                  ? "text-green-300"
                  : i.status === "failed"
                    ? "text-red-300"
                    : "text-amber-300";
            return e.jsx(
              "div",
              {
                className: `rounded-xl border border-white/10 bg-black/25 p-4 ${i.status === "sent" ? "cursor-pointer hover:border-gold/40" : ""}`,
                onClick: () =>
                  i.status === "sent" &&
                  setExpandedId(current => (current === i.id ? null : i.id)),
                children: e.jsxs("div", {
                  className: "flex items-start gap-3",
                  children: [
                    e.jsx(c, { className: `mt-0.5 h-5 w-5 shrink-0 ${r}` }),
                    e.jsxs("div", {
                      className: "min-w-0 flex-1",
                      children: [
                        e.jsxs("div", {
                          className:
                            "flex flex-wrap items-center justify-between gap-2",
                          children: [
                            e.jsx("p", {
                              className: "font-bold text-white",
                              children: i.subject,
                            }),
                            e.jsx("span", {
                              className: `text-xs font-bold uppercase ${r}`,
                              children:
                                i.status === "sent"
                                  ? "Enviada"
                                  : i.status === "failed"
                                    ? "Falhou"
                                    : "Programada",
                            }),
                          ],
                        }),
                        e.jsxs("p", {
                          className: "mt-1 text-sm text-gray-300",
                          children: [
                            i.clientName ||
                              "Destinatários definidos pela automação",
                            i.recipientEmail ? ` · ${i.recipientEmail}` : "",
                          ],
                        }),
                        e.jsx("p", {
                          className: "mt-1 text-xs text-gray-500",
                          children: b(i.date),
                        }),
                        i.status === "sent" &&
                          e.jsx("p", {
                            className: "mt-2 text-xs font-semibold text-gold",
                            children:
                              expandedId === i.id
                                ? "Ocultar destinatários"
                                : "Clique para ver quem recebeu",
                          }),
                        i.status === "sent" &&
                          expandedId === i.id &&
                          e.jsx("div", {
                            className:
                              "mt-3 max-h-72 overflow-y-auto rounded-lg border border-white/10 bg-black/35 p-3",
                            children: e.jsx("div", {
                              className: "grid gap-2 sm:grid-cols-2",
                              children: (i.recipients || []).map((recipient, index) =>
                                e.jsxs(
                                  "div",
                                  {
                                    className:
                                      "rounded-md bg-white/5 px-3 py-2 text-xs",
                                    children: [
                                      e.jsx("p", {
                                        className: "font-semibold text-white",
                                        children: recipient.name,
                                      }),
                                      recipient.email &&
                                        e.jsx("p", {
                                          className: "mt-0.5 text-gray-400",
                                          children: recipient.email,
                                        }),
                                    ],
                                  },
                                  `${recipient.email || recipient.name}-${index}`
                                )
                              ),
                            }),
                          }),
                        i.errorMessage &&
                          e.jsxs("p", {
                            className:
                              "mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-200",
                            children: ["Motivo: ", i.errorMessage],
                          }),
                      ],
                    }),
                  ],
                }),
              },
              i.id
            );
          }),
          !s.isLoading &&
            !o.length &&
            e.jsx("p", {
              className: "py-10 text-center text-sm text-gray-500",
              children: "Nenhum registro nesta categoria.",
            }),
          s.isError &&
            e.jsx("p", {
              className: "rounded-lg bg-red-500/10 p-3 text-sm text-red-200",
              children:
                "Não foi possível carregar o registro. Clique em Atualizar para tentar novamente.",
            }),
        ],
      }),
    ],
  });
}
function oe() {
  return e.jsxs("div", {
    className: "min-h-screen bg-black text-white lg:pl-64",
    children: [
      e.jsx(z, {}),
      e.jsx("main", {
        className: "mx-auto max-w-5xl px-4 py-8",
        children: e.jsx(Q, { paymentTemplateCard: e.jsx(B, {}) }),
      }),
    ],
  });
}
export { Q as ScheduledMessagesPanel, oe as default };
