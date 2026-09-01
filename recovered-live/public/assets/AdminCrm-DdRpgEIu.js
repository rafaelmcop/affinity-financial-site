import {
  t as c,
  r as p,
  j as e,
  B as d,
  C as u,
  b as g,
} from "./index-BIU-6RMI.js?v=20260901-12";
import { A as ne } from "./AdminSidebar-CB3x3HMt.js";
import { A as oe } from "./AgentSidebar-BffvVO7a.js?v=20260901-2";
import { I as h } from "./input-maK0rC7f.js";
import {
  DeliveryHistory as be,
  ScheduledMessagesPanel as H,
} from "./AgentMessages-CsNL0JGx.js?v=20260901-6";
import { P as ie } from "./plus-DKqFfTiU.js";
import { S as ce } from "./save-BWWR3RtX.js";
import { P as V } from "./pen-BtFcHMZL.js";
import { C as de, M as me } from "./message-square-Bd585pvl.js";
import { U as _ } from "./user-round-BYvPk1yR.js";
import { M as xe } from "./LanguageSelector-DkTXTche.js";
import { M as pe } from "./mail-DTOVvRc8.js";
import { P as he } from "./phone-zIXn9s-v.js";
import "./FloatingInternalChat-C-mZ1jql.js";
import "./x-BKidgWlG.js";
import "./send-u-E2Isyn.js";
import "./menu-pEVK7Y0F.js";
import "./external-link-CEjUwZyT.js";
import "./chevron-right-DepQZrYR.js";
import "./trash-2-DP0NeSJV.js";
import "./refresh-cw-DKCd_O_1.js";
import "./circle-x-CDonS9qj.js";
const D = {
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    birthDate: "",
    status: "new",
    source: "",
    assignedAdminEmail: "",
    nextFollowUpAt: "",
    notes: "",
  },
  I = [
    {
      value: "new",
      label: "Cliente novo",
      color: "bg-blue-500/15 text-blue-300",
    },
    {
      value: "contacted",
      label: "Contatado",
      color: "bg-cyan-500/15 text-cyan-300",
    },
    {
      value: "meeting",
      label: "Reunião",
      color: "bg-purple-500/15 text-purple-300",
    },
    {
      value: "first_meeting",
      label: "Primeira reunião realizada",
      color: "bg-purple-500/15 text-purple-300",
    },
    {
      value: "followup_documents",
      label: "Follow-up de documentos",
      color: "bg-orange-500/15 text-orange-300",
    },
    {
      value: "followup_service",
      label: "Follow-up de atendimento",
      color: "bg-cyan-500/15 text-cyan-300",
    },
    {
      value: "followup_application",
      label: "Follow-up de aplicativo",
      color: "bg-indigo-500/15 text-indigo-300",
    },
    {
      value: "followup_review",
      label: "Follow-up de avaliação",
      color: "bg-pink-500/15 text-pink-300",
    },
    {
      value: "proposal",
      label: "Proposta",
      color: "bg-amber-500/15 text-amber-300",
    },
    {
      value: "client",
      label: "Cliente com apólice",
      color: "bg-green-500/15 text-green-300",
    },
    {
      value: "completed",
      label: "Cliente concluído",
      color: "bg-green-500/15 text-green-300",
    },
    {
      value: "closed",
      label: "Encerrado",
      color: "bg-gray-500/15 text-gray-300",
    },
  ];
function ge(a) {
  if (!a) return "";
  const i = new Date(String(a));
  if (Number.isNaN(i.getTime())) return "";
  const m = i.getTimezoneOffset() * 6e4;
  return new Date(i.getTime() - m).toISOString().slice(0, 16);
}
function F(a) {
  return a.replace(/\D/g, "");
}
function j(a) {
  if (!a) return "Não agendado";
  const raw = String(a),
    date = new Date(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
        ? raw.replace(" ", "T") + "Z"
        : raw
    );
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/New_York",
      });
}
function U(a) {
  if (!a) return "Não informado";
  const m = String(a)
    .slice(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : String(a);
}
function ue(a) {
  if (!a) return "";
  const i = a.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return i ? `${i[3]}-${i[1].padStart(2, "0")}-${i[2].padStart(2, "0")}` : a;
}
function Le({ agentMode: a = !1 }) {
  const i = c.crm.list.useQuery(),
    m = c.crm.assignees.useQuery(),
    J = c.crm.create.useMutation(),
    G = c.crm.update.useMutation(),
    K = c.crm.addActivity.useMutation(),
    [r, n] = p.useState(D),
    [R, N] = p.useState(!1),
    [x, P] = p.useState(() => {
      const s = new URLSearchParams(location.search);
      return Number(s.get("clientId") || s.get("cliente") || 0) || null;
    }),
    [y, Q] = p.useState(""),
    [w, X] = p.useState(""),
    [b, M] = p.useState(() =>
      new URLSearchParams(location.search).get("setor") === "leads"
        ? "leads"
        : "clients"
    ),
    [page, setPage] = p.useState(1),
    [loadHistory, setLoadHistory] = p.useState(!1),
    C = c.crm.activities.useQuery(
      { clientId: x || 0 },
      { enabled: !!x && loadHistory, staleTime: 3e4 }
    ),
    Y = c.agent.listPolicies.useQuery(void 0, { enabled: a }),
    Z = c.agent.listMessages.useQuery(void 0, { enabled: a && !!x, staleTime: 3e4 }),
    L = c.agent.clientEmails.useQuery(
      { clientId: x || 0 },
      { enabled: a && !!x && loadHistory, staleTime: 3e4 }
    ),
    [loadRecaps, setLoadRecaps] = p.useState(!1),
    recapQuery = c.agent.calendlyRecaps.useQuery(
      { clientId: x || 0 },
      { enabled: a && !!x && loadRecaps, staleTime: 6e4, retry: !1 }
    ),
    ee = c.agent.listTasks.useQuery(void 0, { enabled: !1 }),
    [O, se] = p.useState("whatsapp"),
    [A, B] = p.useState(""),
    [profileNotes, setProfileNotes] = p.useState(""),
    S = i.data || [],
    t = S.find(s => s.id === x),
    T = (Y.data || []).filter(
      s =>
        s.clientId === x ||
        (!!t?.email && s.clientEmail?.toLowerCase() === t.email.toLowerCase())
    ),
    ae = (Z.data || []).filter(s => s.clientId === x && s.isActive),
    scheduledForClient = (Z.data || []).filter(s => {
      if (!s.isActive) return !1;
      if (s.clientId === x || s.audience === "all") return !0;
      try {
        const ids = Array.isArray(s.selectedClientIds)
          ? s.selectedClientIds
          : JSON.parse(s.selectedClientIds || "[]");
        return ids.map(Number).includes(Number(x));
      } catch {
        return !1;
      }
    }),
    te = (ee.data || []).filter(
      s => s.clientId === x && s.status === "pending"
    ),
    re = (() => {
      try {
        return JSON.parse(
          localStorage.getItem(a ? "agentSession" : "adminSession") || "{}"
        );
      } catch {
        return {};
      }
    })(),
    k = m.data?.find(
      s => s.email.toLowerCase() === String(re.email || "").toLowerCase()
    ),
    W = p.useMemo(() => {
      const s = [
        "new",
        "contacted",
        "meeting",
        "proposal",
        "first_meeting",
        "followup_documents",
        "followup_service",
        "followup_application",
        "followup_review",
      ];
      return S.filter(
        l =>
          (b === "leads"
            ? s.includes(l.status)
            : b === "clients"
              ? !s.includes(l.status)
              : true) &&
          ((l.name || "") + " " + (l.email || "") + " " + (l.phone || ""))
            .toLowerCase()
            .includes(w.toLowerCase())
      );
    }, [S, w, b]),
    totalPages = Math.max(1, Math.ceil(W.length / 10)),
    pageRows = W.slice((page - 1) * 10, page * 10),
    le = async s => {
      s.preventDefault();
      const l = {
        ...r,
        birthDate: ue(r.birthDate),
        nextFollowUpAt: r.nextFollowUpAt
          ? new Date(r.nextFollowUpAt).toISOString()
          : "",
      };
      try {
        (r.id
          ? await G.mutateAsync({ ...l, id: r.id })
          : await J.mutateAsync(l),
          await i.refetch(),
          n(D),
          N(!1),
          g.success(r.id ? "Cliente atualizado" : "Cliente adicionado ao CRM"));
      } catch (o) {
        g.error(o instanceof Error ? o.message : "Não foi possível salvar");
      }
    },
    q = s => {
      (n({
        id: s.id,
        name: s.name,
        email: s.email || "",
        phone: s.phone || "",
        whatsapp: s.whatsapp || "",
        birthDate: U(s.birthDate) === "Não informado" ? "" : U(s.birthDate),
        status: s.status,
        source: s.source || "",
        assignedAdminEmail: s.assignedAdminEmail || "",
        nextFollowUpAt: ge(s.nextFollowUpAt),
        notes: s.notes || "",
      }),
        N(!0));
    },
    E = async (s, l) => {
      if (t)
        try {
          (await K.mutateAsync({ clientId: t.id, type: s, content: l }),
            await C.refetch());
        } catch {
          g.error("Não foi possível registrar a ação");
        }
    },
    f = t
      ? `Olá ${t.name}, tudo bem? Aqui é da Affinity Financial. Estou entrando em contato para dar continuidade ao seu atendimento.`
      : "",
    v = s => {
      if (!t) return;
      let l = "";
      if (s === "email") {
        if (!t.email) return g.error("Este cliente não possui e-mail");
        l = `mailto:${t.email}?subject=${encodeURIComponent("Acompanhamento - Affinity Financial")}&body=${encodeURIComponent(f)}`;
      }
      if (s === "whatsapp") {
        const o = F(t.whatsapp || t.phone || "");
        if (!o) return g.error("Este cliente não possui WhatsApp");
        l = `https://wa.me/${o}?text=${encodeURIComponent(f)}`;
      }
      if (s === "sms") {
        const o = F(t.phone || t.whatsapp || "");
        if (!o) return g.error("Este cliente não possui telefone");
        l = `sms:${o}?body=${encodeURIComponent(f)}`;
      }
      if (s === "call") {
        const o = F(t.phone || t.whatsapp || "");
        if (!o) return g.error("Este cliente não possui telefone");
        l = `tel:${o}`;
      }
      (E(
        s,
        s === "call"
          ? "Ligação iniciada pelo CRM"
          : `${s.toUpperCase()} preparado pelo CRM`
      ),
        window.open(l, "_blank", "noopener,noreferrer"));
    };
  p.useEffect(() => setPage(1), [w, b]);
  p.useEffect(() => setLoadRecaps(!1), [x]);
  p.useEffect(() => setProfileNotes(t?.notes || ""), [t?.id, t?.notes]);
  p.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const saveProfile = async changes => {
    if (!t) return;
    try {
      await G.mutateAsync({ ...t, ...changes });
      await i.refetch();
      g.success("Acompanhamento atualizado");
    } catch (error) {
      g.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o acompanhamento"
      );
    }
  };
  if (t)
    return e.jsxs("div", {
      className: "min-h-screen bg-black text-white lg:pl-64",
      children: [
        a ? e.jsx(oe, {}) : e.jsx(ne, {}),
        e.jsxs("main", {
          className: "mx-auto max-w-5xl px-4 py-8 sm:px-6",
          children: [
            e.jsxs(d, {
              type: "button",
              variant: "outline",
              onClick: () => {
                P(null);
                window.history.back();
              },
              children: ["←", " Voltar"],
            }),
            e.jsxs(u, {
              className: "mt-5 border-gold/20 bg-[#0b1524] p-6",
              children: [
                e.jsx("h1", {
                  className: "text-3xl font-bold text-gold",
                  children: t.name,
                }),
                e.jsx("p", {
                  className: "mt-1 text-sm text-gray-400",
                  children: "Informações e acompanhamento deste cliente",
                }),
                e.jsxs("div", {
                  className: "mt-6 grid gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm sm:grid-cols-2",
                  children: [
                    e.jsxs("p", { children: ["E-mail: ", e.jsx("strong", { children: t.email || "Não informado" })] }),
                    e.jsxs("p", { children: ["Telefone: ", e.jsx("strong", { children: t.phone || "Não informado" })] }),
                    e.jsxs("p", { children: ["WhatsApp: ", e.jsx("strong", { children: t.whatsapp || "Não informado" })] }),
                    e.jsxs("p", { children: ["Nascimento: ", e.jsx("strong", { children: U(t.birthDate) })] }),
                    e.jsxs("p", { children: ["Etapa: ", e.jsx("strong", { children: I.find(s => s.value === t.status)?.label || t.status })] }),
                    e.jsxs("p", { children: ["Próximo acompanhamento: ", e.jsx("strong", { children: j(t.nextFollowUpAt) })] }),
                  ],
                }),
                e.jsxs("div", {
                  className: "mt-4 flex flex-wrap gap-2",
                  children: [
                    e.jsx(d, { variant: "outline", onClick: () => v("whatsapp"), children: "WhatsApp" }),
                    e.jsx(d, { variant: "outline", onClick: () => v("sms"), children: "SMS" }),
                    e.jsx(d, { variant: "outline", onClick: () => v("email"), children: "E-mail" }),
                    e.jsx(d, { variant: "outline", onClick: () => v("call"), children: "Ligar" }),
                  ],
                }),
                e.jsxs("div", {
                  className: "mt-5 rounded-xl border border-white/10 bg-black/30 p-4",
                  children: [
                    e.jsx("label", { className: "text-xs font-bold uppercase tracking-wider text-gold", children: "Etapa do atendimento" }),
                    e.jsx("select", {
                      value: t.status,
                      onChange: event => saveProfile({ status: event.target.value }),
                      className: "mt-2 h-11 w-full rounded-lg border border-white/20 bg-black px-3 text-sm",
                      children: I.map(option => e.jsx("option", { value: option.value, children: option.label }, option.value)),
                    }),
                    e.jsx("label", { className: "mt-4 block text-xs font-bold uppercase tracking-wider text-gold", children: "Observações" }),
                    e.jsx("textarea", {
                      value: profileNotes,
                      onChange: event => setProfileNotes(event.target.value),
                      className: "mt-2 min-h-24 w-full rounded-lg border border-white/20 bg-black p-3 text-sm",
                    }),
                    e.jsx(d, {
                      className: "mt-2 bg-gold text-black",
                      onClick: () => saveProfile({ notes: profileNotes }),
                      children: "Salvar observações",
                    }),
                  ],
                }),
                a && e.jsxs("section", {
                  className: "mt-6 rounded-xl border border-white/10 bg-black/30 p-4",
                  children: [
                    e.jsx("h2", { className: "text-xl font-bold", children: "Reuniões, resumos e gravações" }),
                    !loadRecaps && e.jsx(d, {
                      type: "button",
                      variant: "outline",
                      className: "mt-3",
                      onClick: () => setLoadRecaps(!0),
                      children: "Carregar reuniões",
                    }),
                    recapQuery.isLoading && e.jsx("p", { className: "mt-3 text-sm text-gray-400", children: "Carregando reuniões…" }),
                    (recapQuery.data || []).map(s => e.jsxs("div", {
                      className: "mt-3 rounded-lg border border-white/10 bg-black/35 p-3",
                      children: [
                        e.jsx("p", { className: "font-semibold", children: s.title }),
                        e.jsx("p", { className: "mt-1 text-xs text-gray-400", children: j(s.startTime) }),
                        s.recordingUrl && e.jsx("a", { href: s.recordingUrl, target: "_blank", rel: "noreferrer", className: "mt-2 inline-flex font-bold text-gold", children: "Abrir gravação" }),
                      ],
                    }, s.id)),
                  ],
                }),
                a && e.jsxs("section", {
                  className: "mt-6",
                  children: [
                    e.jsx("h2", { className: "text-xl font-bold", children: "Apólices" }),
                    e.jsx("div", {
                      className: "mt-3 grid gap-3 sm:grid-cols-2",
                      children: T.slice(0, 25).map(s => e.jsxs("div", {
                        className: "rounded-xl border border-white/10 bg-black/30 p-4",
                        children: [
                          e.jsxs("p", { className: "font-semibold", children: ["Apólice ", s.policyNumber] }),
                          e.jsx("p", { className: "mt-1 text-sm text-gray-400", children: s.product || "Produto não informado" }),
                        ],
                      }, s.id)),
                    }),
                    T.length === 0 && e.jsx("p", { className: "mt-3 text-sm text-gray-400", children: "Nenhuma apólice vinculada." }),
                  ],
                }),
                a && e.jsxs("section", {
                  className: "mt-6 rounded-xl border border-white/10 bg-black/30 p-4",
                  children: [
                    e.jsx("h2", { className: "text-xl font-bold", children: "Mensagens automáticas programadas" }),
                    Z.isLoading && e.jsx("p", { className: "mt-3 text-sm text-gray-400", children: "Carregando automações…" }),
                    e.jsx("div", {
                      className: "mt-3 grid gap-3 sm:grid-cols-2",
                      children: scheduledForClient.map(s => e.jsxs("div", {
                        className: "rounded-xl border border-gold/20 bg-black/35 p-4",
                        children: [
                          e.jsx("p", { className: "font-semibold text-gold", children: s.title || s.subject || "Mensagem automática" }),
                          e.jsx("p", { className: "mt-1 text-xs uppercase tracking-wider text-gray-500", children: s.occasion || "programada" }),
                          e.jsx("p", { className: "mt-2 text-sm", children: s.subject || "Sem assunto" }),
                          e.jsx("p", { className: "mt-2 line-clamp-4 whitespace-pre-wrap text-xs text-gray-400", children: s.message || "" }),
                        ],
                      }, s.id)),
                    }),
                    !Z.isLoading && scheduledForClient.length === 0 && e.jsx("p", { className: "mt-3 text-sm text-gray-400", children: "Nenhuma mensagem automática programada para este cliente." }),
                  ],
                }),
                e.jsxs("section", {
                  className: "mt-6 border-t border-white/10 pt-5",
                  children: [
                    e.jsx("h2", { className: "text-xl font-bold", children: "Histórico" }),
                    !loadHistory && e.jsx(d, {
                      type: "button",
                      variant: "outline",
                      className: "mt-3",
                      onClick: () => setLoadHistory(!0),
                      children: "Carregar histórico",
                    }),
                    loadHistory && (C.isLoading || L.isLoading) && e.jsx("p", { className: "mt-3 text-sm text-gray-400", children: "Carregando…" }),
                    loadHistory && e.jsxs("div", {
                      className: "mt-4 space-y-3",
                      children: [
                        ...(L.data || []).map(s => e.jsxs("div", {
                          className: "rounded-xl border border-white/10 bg-black/30 p-3 text-sm",
                          children: [
                            e.jsxs("p", { className: "text-xs text-gray-400", children: [s.direction === "sent" ? "Enviado" : "Recebido", " · ", j(s.sentAt)] }),
                            e.jsx("p", { className: "mt-1 font-semibold", children: s.subject }),
                            e.jsx("p", { className: "mt-1 whitespace-pre-wrap text-gray-300", children: s.body }),
                          ],
                        }, `email-${s.id}`)),
                        ...(C.data || []).map(s => e.jsxs("div", {
                          className: "border-l-2 border-gold/40 pl-3 text-sm",
                          children: [e.jsx("p", { children: s.content }), e.jsx("p", { className: "mt-1 text-xs text-gray-500", children: j(s.createdAt) })],
                        }, `activity-${s.id}`)),
                      ],
                    }),
                  ],
                }),
                a && e.jsxs("section", {
                  className: "mt-6 rounded-xl border border-white/10 bg-black/30 p-4",
                  children: [
                    e.jsx("h2", { className: "text-xl font-bold", children: "Registrar interação" }),
                    e.jsx("select", {
                      value: O,
                      onChange: event => se(event.target.value),
                      className: "mt-3 h-10 rounded-md border border-white/20 bg-black px-3 text-sm",
                      children: [
                        e.jsx("option", { value: "whatsapp", children: "WhatsApp" }),
                        e.jsx("option", { value: "sms", children: "SMS" }),
                        e.jsx("option", { value: "email", children: "E-mail" }),
                        e.jsx("option", { value: "call", children: "Ligação" }),
                        e.jsx("option", { value: "note", children: "Observação" }),
                      ],
                    }),
                    e.jsx("textarea", {
                      value: A,
                      onChange: event => B(event.target.value),
                      placeholder: "Descreva a conversa ou ação realizada",
                      className: "mt-3 min-h-24 w-full rounded-md border border-white/20 bg-black p-3 text-sm",
                    }),
                    e.jsx(d, {
                      className: "mt-2 w-full bg-gold text-black",
                      onClick: async () => {
                        if (!A.trim()) return;
                        await E(O, A.trim());
                        B("");
                        setLoadHistory(!0);
                      },
                      children: "Salvar no histórico",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  return e.jsxs("div", {
    className: "min-h-screen bg-black text-white lg:pl-64",
    children: [
      a ? e.jsx(oe, {}) : e.jsx(ne, {}),
      e.jsxs("main", {
        className: "mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6",
        children: [
          e.jsxs("div", {
            className:
              "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("p", {
                    className:
                      "text-sm font-semibold uppercase tracking-[.2em] text-gold",
                    children: "Relacionamento",
                  }),
                  e.jsx("h1", {
                    className: "mt-2 text-3xl font-bold",
                    children: "CRM de clientes",
                  }),
                  e.jsx("p", {
                    className: "mt-2 text-gray-400",
                    children:
                      "Organize contatos, próximos passos e todo o histórico de acompanhamento.",
                  }),
                ],
              }),
              e.jsxs(d, {
                onClick: () => {
                  (n(D), N(!R));
                },
                className: "bg-gold text-black",
                children: [
                  e.jsx(ie, { size: 17, className: "mr-2" }),
                  "Novo cliente",
                ],
              }),
            ],
          }),
          a &&
            e.jsx("div", {
              className:
                "flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b1524] p-2",
              children: [
                ["leads", "Leads"],
                ["clients", "Clientes e histórico"],
                ["automations", "Mensagens e automações"],
                ["history", "Histórico"],
              ].map(([s, l]) =>
                e.jsx(
                  d,
                  {
                    variant: b === s ? "default" : "ghost",
                    className: b === s ? "bg-gold text-black" : "text-gray-300",
                    onClick: () => M(s),
                    children: l,
                  },
                  s
                )
              ),
            }),
          e.jsxs("div", {
            className:
              a && !["clients", "leads"].includes(b) ? "hidden" : "contents",
            children: [
              e.jsx(u, {
                className: "border-gold/20 bg-[#0b1524] p-4",
                children: e.jsxs("div", {
                  className: "grid gap-3 sm:grid-cols-2",
                  children: [
                    e.jsx(h, {
                      placeholder: "Buscar por nome, e-mail ou telefone",
                      value: w,
                      onChange: s => X(s.target.value),
                    }),
                    e.jsxs("div", {
                      className:
                        "rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300",
                      children: [
                        "Seu envio:",
                        " ",
                        e.jsx("strong", {
                          className: "text-white",
                          children:
                            k?.contactEmail ||
                            k?.email ||
                            "e-mail não configurado",
                        }),
                        " ",
                        "· WhatsApp:",
                        " ",
                        e.jsx("strong", {
                          className: "text-white",
                          children: k?.whatsapp || "não configurado",
                        }),
                      ],
                    }),
                  ],
                }),
              }),
              R &&
                e.jsxs(u, {
                  className: "border-gold/30 bg-[#101b2b] p-6",
                  children: [
                    e.jsx("h2", {
                      className: "mb-4 text-xl font-bold text-gold",
                      children: r.id ? "Editar cliente" : "Adicionar cliente",
                    }),
                    e.jsxs("form", {
                      onSubmit: le,
                      className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
                      children: [
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "Nome completo",
                            e.jsx(h, {
                              className: "mt-2",
                              placeholder: "Nome do cliente",
                              value: r.name,
                              onChange: s => n({ ...r, name: s.target.value }),
                              required: !0,
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "E-mail",
                            e.jsx(h, {
                              className: "mt-2",
                              type: "email",
                              placeholder: "cliente@email.com",
                              value: r.email,
                              onChange: s => n({ ...r, email: s.target.value }),
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "Telefone / SMS",
                            e.jsx(h, {
                              className: "mt-2",
                              type: "tel",
                              placeholder: "Número do telefone",
                              value: r.phone,
                              onChange: s => n({ ...r, phone: s.target.value }),
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "WhatsApp",
                            e.jsx(h, {
                              className: "mt-2",
                              type: "tel",
                              placeholder: "Número do WhatsApp",
                              value: r.whatsapp,
                              onChange: s =>
                                n({ ...r, whatsapp: s.target.value }),
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "Data de nascimento (MM/DD/AAAA)",
                            e.jsx(h, {
                              className: "mt-2",
                              inputMode: "numeric",
                              placeholder: "MM/DD/AAAA",
                              value: r.birthDate,
                              onChange: s =>
                                n({ ...r, birthDate: s.target.value }),
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "Origem do contato",
                            e.jsx(h, {
                              className: "mt-2",
                              placeholder: "Ex.: PC Sheet, indicação",
                              value: r.source,
                              onChange: s =>
                                n({ ...r, source: s.target.value }),
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "Etapa do atendimento",
                            e.jsx("select", {
                              value: r.status,
                              onChange: s =>
                                n({ ...r, status: s.target.value }),
                              className:
                                "mt-2 h-10 w-full rounded-md border border-white/20 bg-black px-3",
                              children: I.map(s =>
                                e.jsx(
                                  "option",
                                  { value: s.value, children: s.label },
                                  s.value
                                )
                              ),
                            }),
                          ],
                        }),
                        !a &&
                          e.jsxs("select", {
                            value: r.assignedAdminEmail,
                            onChange: s =>
                              n({ ...r, assignedAdminEmail: s.target.value }),
                            className:
                              "h-10 rounded-md border border-white/20 bg-black px-3",
                            children: [
                              e.jsx("option", {
                                value: "",
                                children: "Sem responsável",
                              }),
                              (m.data || [])
                                .filter(s => s.isActive)
                                .map(s =>
                                  e.jsx(
                                    "option",
                                    { value: s.email, children: s.name },
                                    s.id
                                  )
                                ),
                            ],
                          }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300",
                          children: [
                            "Próximo acompanhamento (data e hora)",
                            e.jsx(h, {
                              className: "mt-2",
                              type: "datetime-local",
                              value: r.nextFollowUpAt,
                              onChange: s =>
                                n({ ...r, nextFollowUpAt: s.target.value }),
                            }),
                          ],
                        }),
                        e.jsxs("label", {
                          className: "text-sm text-gray-300 lg:col-span-3",
                          children: [
                            "Observações gerais",
                            e.jsx("textarea", {
                              placeholder:
                                "Informações importantes para o acompanhamento",
                              value: r.notes,
                              onChange: s => n({ ...r, notes: s.target.value }),
                              className:
                                "mt-2 min-h-24 w-full rounded-md border border-white/20 bg-black p-3 text-sm",
                            }),
                          ],
                        }),
                        e.jsxs("div", {
                          className: "flex gap-3 lg:col-span-3",
                          children: [
                            e.jsxs(d, {
                              type: "submit",
                              className: "bg-gold text-black",
                              children: [
                                e.jsx(ce, { size: 16, className: "mr-2" }),
                                "Salvar",
                              ],
                            }),
                            e.jsx(d, {
                              type: "button",
                              variant: "outline",
                              onClick: () => N(!1),
                              children: "Cancelar",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              e.jsxs("div", {
                className:
                  "grid items-start gap-6 lg:grid-cols-[minmax(260px,.62fr)_minmax(0,1.38fr)]",
                children: [
                  e.jsxs("div", {
                    className: "space-y-3",
                    children: [
                      W.length === 0 &&
                        e.jsx(u, {
                          className:
                            "border-white/10 bg-[#0b1524] p-8 text-center text-gray-400",
                          children: "Nenhum cliente encontrado.",
                        }),
                      pageRows.map(s => {
                        const l = I.find($ => $.value === s.status),
                          o =
                            s.nextFollowUpAt &&
                            new Date(String(s.nextFollowUpAt)).getTime() <
                              Date.now() &&
                            s.status !== "closed";
                        return e.jsxs(
                          u,
                          {
                            className: `cursor-pointer border bg-[#0b1524] p-4 transition ${x === s.id ? "border-gold" : "border-white/10 hover:border-gold/50"}`,
                            onClick: () => {
                              window.history.pushState(
                                {},
                                "",
                                `${window.location.pathname}?setor=${b}&clientId=${s.id}`
                              );
                              P(s.id);
                              setLoadHistory(!1);
                              setLoadRecaps(!1);
                            },
                            children: [
                              e.jsxs("div", {
                                className:
                                  "flex items-start justify-between gap-3",
                                children: [
                                  e.jsx("div", {
                                    children: e.jsx("p", {
                                      className: "text-base font-bold",
                                      children: s.name,
                                    }),
                                  }),
                                  e.jsx("button", {
                                    type: "button",
                                    onClick: $ => {
                                      ($.stopPropagation(), q(s));
                                    },
                                    className:
                                      "rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white",
                                    children: e.jsx(V, { size: 17 }),
                                  }),
                                ],
                              }),
                              e.jsx("span", {
                                className: `mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${l.color}`,
                                children: l.label,
                              }),
                            ],
                          },
                          s.id
                        );
                      }),
                      W.length > 0 &&
                        e.jsxs("div", {
                          className:
                            "flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1524] p-3",
                          children: [
                            e.jsx(d, {
                              variant: "outline",
                              size: "sm",
                              disabled: page <= 1,
                              onClick: () => setPage(s => Math.max(1, s - 1)),
                              children: "Anterior",
                            }),
                            e.jsxs("span", {
                              className: "text-xs text-gray-400",
                              children: ["Página ", page, " de ", totalPages],
                            }),
                            e.jsx(d, {
                              variant: "outline",
                              size: "sm",
                              disabled: page >= totalPages,
                              onClick: () =>
                                setPage(s => Math.min(totalPages, s + 1)),
                              children: "Próxima",
                            }),
                          ],
                        }),
                    ],
                  }),
                  e.jsx(u, {
                    id: "crm-client-profile",
                    className:
                      "h-fit max-h-[calc(100vh-3rem)] overflow-y-auto border-gold/20 bg-[#0b1524] p-5 lg:sticky lg:top-6",
                    children: t
                      ? e.jsxs(e.Fragment, {
                          children: [
                            e.jsx("h2", {
                              className: "text-xl font-bold text-gold",
                              children: t.name,
                            }),
                            e.jsx("p", {
                              className: "mt-1 text-sm text-gray-400",
                              children:
                                "Cadastro, apólice, automações e histórico em um só lugar",
                            }),
                            e.jsx("div", {
                              className:
                                "sticky top-0 z-10 mt-4 flex flex-wrap gap-2 border-b border-white/10 bg-[#0b1524] pb-3",
                              children: [
                                ["Dados", "crm-profile-data"],
                                ["Reuniões", "crm-profile-meetings"],
                                ["Histórico", "crm-profile-history"],
                              ].map(([label, target]) =>
                                e.jsx(
                                  d,
                                  {
                                    type: "button",
                                    variant: "outline",
                                    size: "sm",
                                    onClick: () => {
                                      label === "Histórico" && setLoadHistory(!0);
                                      label === "Reuniões" && setLoadRecaps(!0);
                                      window.requestAnimationFrame(() =>
                                        document
                                          .getElementById(target)
                                          ?.scrollIntoView({ block: "nearest" })
                                      );
                                    },
                                    children: label,
                                  },
                                  target
                                )
                              ),
                            }),
                            e.jsxs("div", {
                              id: "crm-profile-data",
                              className:
                                "mt-4 grid gap-2 rounded-xl border border-white/10 bg-black/30 p-4 text-sm",
                              children: [
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "E-mail:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: t.email || "Não informado",
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "Telefone / SMS:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: t.phone || "Não informado",
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "WhatsApp:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: t.whatsapp || "Não informado",
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "Data de nascimento:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: U(t.birthDate),
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "Origem do contato:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: t.source || "Não informada",
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "Etapa do atendimento:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children:
                                        I.find(s => s.value === t.status)
                                          ?.label || t.status,
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "Próximo acompanhamento:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: j(t.nextFollowUpAt),
                                    }),
                                  ],
                                }),
                                e.jsxs("p", {
                                  children: [
                                    e.jsx("span", {
                                      className: "text-gray-500",
                                      children: "Observações:",
                                    }),
                                    " ",
                                    e.jsx("strong", {
                                      children: t.notes || "Nenhuma observação",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              className:
                                "mt-4 rounded-xl border border-gold/20 bg-black/30 p-4",
                              children: [
                                e.jsx("label", {
                                  className:
                                    "text-xs font-bold uppercase tracking-wider text-gold",
                                  children: "Etapa atual do cliente",
                                }),
                                e.jsx("select", {
                                  value: t.status,
                                  onChange: event =>
                                    saveProfile({ status: event.target.value }),
                                  className:
                                    "mt-2 h-11 w-full rounded-lg border border-white/20 bg-black px-3 text-sm text-white",
                                  children: I.map(option =>
                                    e.jsx(
                                      "option",
                                      {
                                        value: option.value,
                                        children: option.label,
                                      },
                                      option.value
                                    )
                                  ),
                                }),
                                e.jsx("label", {
                                  className:
                                    "mt-4 block text-xs font-bold uppercase tracking-wider text-gold",
                                  children: "Observações deste cliente",
                                }),
                                e.jsx("textarea", {
                                  value: profileNotes,
                                  onChange: event =>
                                    setProfileNotes(event.target.value),
                                  placeholder:
                                    "Registre o que aconteceu, documentos pendentes e o próximo passo.",
                                  className:
                                    "mt-2 min-h-28 w-full rounded-lg border border-white/20 bg-black p-3 text-sm text-white",
                                }),
                                e.jsx(d, {
                                  type: "button",
                                  className: "mt-2 w-full bg-gold text-black",
                                  disabled: G.isPending,
                                  onClick: () =>
                                    saveProfile({ notes: profileNotes }),
                                  children: G.isPending
                                    ? "Salvando…"
                                    : "Salvar observações",
                                }),
                              ],
                            }),
                            e.jsxs(d, {
                              className: "mt-3 w-full bg-gold text-black",
                              onClick: () => q(t),
                              children: [
                                e.jsx(V, { size: 16, className: "mr-2" }),
                                "Editar informações do cliente",
                              ],
                            }),
                            a &&
                              e.jsxs(e.Fragment, {
                                children: [
                                  e.jsxs("div", {
                                    className: "mt-5 space-y-2",
                                    children: [
                                      T.map(s =>
                                        e.jsxs(
                                          "div",
                                          {
                                            className:
                                              "rounded-lg border border-gold/20 bg-black/35 p-3",
                                            children: [
                                              e.jsxs("p", {
                                                className: "font-semibold",
                                                children: [
                                                  "Apólice ",
                                                  s.policyNumber,
                                                ],
                                              }),
                                              e.jsxs("p", {
                                                className:
                                                  "mt-1 text-xs text-gray-300",
                                                children: [
                                                  s.product ||
                                                    "Produto não informado",
                                                  " · Premium $",
                                                  Number(
                                                    s.premiumAmount || 0
                                                  ).toFixed(2),
                                                  " ",
                                                  s.premiumFrequency || "",
                                                ],
                                              }),
                                              e.jsxs("p", {
                                                className:
                                                  "mt-1 text-xs text-gray-300",
                                                children: [
                                                  "Cobertura $",
                                                  Number(
                                                    s.coverageAmount || 0
                                                  ).toLocaleString(),
                                                  " ",
                                                  "· Beneficiário:",
                                                  " ",
                                                  s.beneficiaries ||
                                                    "não informado",
                                                ],
                                              }),
                                            ],
                                          },
                                          s.id
                                        )
                                      ),
                                      T.length === 0 &&
                                        e.jsx("p", {
                                          className:
                                            "rounded-lg bg-white/5 p-3 text-xs text-gray-400",
                                          children:
                                            "Nenhuma apólice vinculada.",
                                        }),
                                    ],
                                  }),
                                  e.jsxs("div", {
                                    className:
                                      "mt-3 grid grid-cols-2 gap-2 text-xs",
                                    children: [
                                      e.jsxs("div", {
                                        className:
                                          "rounded-lg bg-green-500/10 p-3 text-green-200",
                                        children: [
                                          e.jsx("b", { children: ae.length }),
                                          e.jsx("br", {}),
                                          "mensagens programadas",
                                        ],
                                      }),
                                      e.jsxs("div", {
                                        className:
                                          "rounded-lg bg-amber-500/10 p-3 text-amber-200",
                                        children: [
                                          e.jsx("b", { children: te.length }),
                                          e.jsx("br", {}),
                                          "acompanhamentos pendentes",
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            a &&
                              e.jsxs("div", {
                                id: "crm-profile-meetings",
                                className:
                                  "mt-5 scroll-mt-16 rounded-xl border border-white/10 bg-black/25 p-4",
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "text-xs font-bold uppercase tracking-wider text-gold",
                                    children: "Reuniões, resumos e gravações",
                                  }),
                                  !loadRecaps &&
                                    e.jsx(d, {
                                      type: "button",
                                      size: "sm",
                                      variant: "outline",
                                      className: "mt-3",
                                      onClick: () => setLoadRecaps(!0),
                                      children: "Carregar resumos e gravações",
                                    }),
                                  recapQuery.isLoading &&
                                    e.jsx("p", {
                                      className: "mt-3 text-sm text-gray-400",
                                      children: "Carregando reuniões…",
                                    }),
                                  (recapQuery.data || []).map(s =>
                                    e.jsxs(
                                      "div",
                                      {
                                        className:
                                          "mt-3 rounded-lg border border-white/10 bg-black/35 p-3",
                                        children: [
                                          e.jsx("p", {
                                            className: "font-semibold",
                                            children: s.title,
                                          }),
                                          e.jsx("p", {
                                            className:
                                              "mt-1 text-xs text-gray-400",
                                            children: j(s.startTime),
                                          }),
                                          s.recordingUrl &&
                                            e.jsx("a", {
                                              href: s.recordingUrl,
                                              target: "_blank",
                                              rel: "noreferrer",
                                              className:
                                                "mt-2 inline-flex text-sm font-bold text-gold hover:underline",
                                              children: "Abrir gravação",
                                            }),
                                        ],
                                      },
                                      s.id
                                    )
                                  ),
                                  loadRecaps &&
                                    !recapQuery.isLoading &&
                                    !(recapQuery.data || []).length &&
                                    e.jsx("p", {
                                      className: "mt-3 text-sm text-gray-500",
                                      children:
                                        "Nenhum resumo ou gravação encontrado para este cliente.",
                                    }),
                                ],
                              }),
                            e.jsxs("div", {
                              className: "mt-5 grid grid-cols-2 gap-2",
                              children: [
                                e.jsxs(d, {
                                  variant: "outline",
                                  onClick: () => v("whatsapp"),
                                  children: [
                                    e.jsx(xe, { size: 16, className: "mr-2" }),
                                    "WhatsApp",
                                  ],
                                }),
                                e.jsxs(d, {
                                  variant: "outline",
                                  onClick: () => v("sms"),
                                  children: [
                                    e.jsx(me, { size: 16, className: "mr-2" }),
                                    "SMS",
                                  ],
                                }),
                                e.jsxs(d, {
                                  variant: "outline",
                                  onClick: () => v("email"),
                                  children: [
                                    e.jsx(pe, { size: 16, className: "mr-2" }),
                                    "E-mail",
                                  ],
                                }),
                                e.jsxs(d, {
                                  variant: "outline",
                                  onClick: () => v("call"),
                                  children: [
                                    e.jsx(he, { size: 16, className: "mr-2" }),
                                    "Ligar",
                                  ],
                                }),
                              ],
                            }),
                            a &&
                              e.jsxs("div", {
                                className:
                                  "mt-4 rounded-xl border border-white/10 bg-black/30 p-3",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex gap-2",
                                    children: [
                                      e.jsxs("select", {
                                        value: O,
                                        onChange: s => se(s.target.value),
                                        className:
                                          "h-10 rounded-md border border-white/20 bg-black px-3 text-sm",
                                        children: [
                                          e.jsx("option", {
                                            value: "whatsapp",
                                            children: "WhatsApp",
                                          }),
                                          e.jsx("option", {
                                            value: "sms",
                                            children: "SMS",
                                          }),
                                          e.jsx("option", {
                                            value: "email",
                                            children: "E-mail",
                                          }),
                                        ],
                                      }),
                                      e.jsx("span", {
                                        className:
                                          "flex items-center text-xs text-green-300",
                                        children:
                                          "A ação será salva no histórico",
                                      }),
                                    ],
                                  }),
                                  e.jsx("textarea", {
                                    value: A,
                                    onChange: s => B(s.target.value),
                                    placeholder:
                                      "Escreva a mensagem ou cole o conteúdo enviado",
                                    className:
                                      "mt-3 min-h-24 w-full rounded-md border border-white/20 bg-black p-3 text-sm",
                                  }),
                                  e.jsx(d, {
                                    className: "mt-2 w-full bg-gold text-black",
                                    onClick: async () => {
                                      A.trim() &&
                                        (await E(O, A.trim()),
                                        B(""),
                                        g.success(
                                          "Interação salva no histórico"
                                        ));
                                    },
                                    children: "Salvar interação",
                                  }),
                                ],
                              }),
                            e.jsx("p", {
                              className:
                                "mt-3 rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-gray-300",
                              children: f,
                            }),
                            e.jsxs("div", {
                              className: "mt-5 flex gap-2",
                              children: [
                                e.jsx(h, {
                                  placeholder: "Registrar observação",
                                  value: y,
                                  onChange: s => Q(s.target.value),
                                }),
                                e.jsx(d, {
                                  onClick: async () => {
                                    y.trim() &&
                                      (await E("note", y.trim()), Q(""));
                                  },
                                  className: "bg-gold text-black",
                                  children: "Salvar",
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              id: "crm-profile-history",
                              className: "mt-5 scroll-mt-16 space-y-3",
                              children: [
                                !loadHistory &&
                                  e.jsx(d, {
                                    type: "button",
                                    variant: "outline",
                                    className: "w-full",
                                    onClick: () => setLoadHistory(!0),
                                    children: "Carregar histórico deste cliente",
                                  }),
                                loadHistory && (C.isLoading || L.isLoading) &&
                                  e.jsx("p", {
                                    className: "text-sm text-gray-400",
                                    children: "Carregando histórico…",
                                  }),
                                a &&
                                  loadHistory &&
                                  (L.data || []).length > 0 &&
                                  e.jsxs("div", {
                                    className:
                                      "mb-4 space-y-2 border-b border-white/10 pb-4",
                                    children: [
                                      e.jsx("p", {
                                        className:
                                          "text-xs font-bold uppercase tracking-wider text-gold",
                                        children:
                                          "Histórico de mensagens deste cliente",
                                      }),
                                      (L.data || []).map(s =>
                                        e.jsxs(
                                          "div",
                                          {
                                            className: `rounded-xl p-3 text-sm ${s.direction === "sent" ? "ml-5 bg-gold/15" : "mr-5 bg-sky-500/15"}`,
                                            children: [
                                              e.jsxs("p", {
                                                className:
                                                  "text-xs font-semibold text-gray-400",
                                                children: [
                                                  s.direction === "sent"
                                                    ? "Enviado"
                                                    : "Recebido",
                                                  " · ",
                                                  j(s.sentAt),
                                                ],
                                              }),
                                              e.jsx("p", {
                                                className: "mt-1 font-semibold",
                                                children: s.subject,
                                              }),
                                              e.jsx("p", {
                                                className:
                                                  "mt-1 whitespace-pre-wrap text-gray-300",
                                                children: s.body,
                                              }),
                                            ],
                                          },
                                          s.id
                                        )
                                      ),
                                    ],
                                  }),
                                loadHistory && (C.data || []).map(s =>
                                  e.jsxs(
                                    "div",
                                    {
                                      className:
                                        "border-l-2 border-gold/40 pl-3",
                                      children: [
                                        e.jsx("p", {
                                          className: "text-sm text-white",
                                          children: s.content,
                                        }),
                                        e.jsxs("p", {
                                          className:
                                            "mt-1 text-xs text-gray-500",
                                          children: [
                                            s.type.toUpperCase(),
                                            " · ",
                                            s.createdBy,
                                            " ·",
                                            " ",
                                            j(s.createdAt),
                                          ],
                                        }),
                                      ],
                                    },
                                    s.id
                                  )
                                ),
                                loadHistory && C.data?.length === 0 &&
                                  e.jsx("p", {
                                    className: "text-sm text-gray-500",
                                    children: "Ainda não há ações registradas.",
                                  }),
                              ],
                            }),
                          ],
                        })
                      : e.jsxs("div", {
                          className: "py-12 text-center text-gray-400",
                          children: [
                            e.jsx(_, { className: "mx-auto mb-3" }),
                            "Selecione um cliente para abrir o acompanhamento.",
                          ],
                        }),
                  }),
                ],
              }),
            ],
          }),
          a &&
            b === "automations" &&
            e.jsx(H, { showHistory: !1 }),
          a && b === "history" && e.jsx(be, {}),
        ],
      }),
    ],
  });
}
export { Le as default };
