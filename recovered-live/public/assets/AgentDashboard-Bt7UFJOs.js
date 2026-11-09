import AgentEmailReviews from './AgentEmailReviews.js?v=2';
import BirthdayAlerts from './AgentBirthdayAlerts.js?v=6';
import {
  t as i,
  r as k,
  T as x,
  j as e,
  C as m,
} from "./index-BIU-6RMI.js?v=20261009-setup-1";
import { A as C } from "./AgentSidebar-BffvVO7a.js?v=20260907-menu2";
import { u as A } from "./FloatingInternalChat-C-mZ1jql.js?v=20261107-messenger-layer-2";
import { C as f, M as I } from "./message-square-Bd585pvl.js";
import { S as M } from "./shield-check-CQZEKJwS.js";
import "./LanguageSelector-DkTXTche.js";
import "./x-BKidgWlG.js";
import "./chevron-right-DepQZrYR.js";
import "./external-link-CEjUwZyT.js";
import "./input-maK0rC7f.js";
import "./send-u-E2Isyn.js";
import WeeklyAgenda from "./AgentWeeklyAgenda.js?v=10";
function H() {
  const [calendarVersion,setCalendarVersion]=k.useState(0);
  const birthdayNotices=i.agent.birthdayAlerts.useQuery(undefined,{refetchOnWindowFocus:true,staleTime:60000});
  const [calendarAllowed,setCalendarAllowed]=k.useState(false),[agendaStatus,setAgendaStatus]=k.useState(''),[agendaError,setAgendaError]=k.useState(false);
  k.useEffect(()=>{let active=true;fetch('/api/agent/access',{credentials:'same-origin',cache:'no-store'}).then(res=>res.ok?res.json():null).then(data=>{if(active)setCalendarAllowed(!!data?.features?.includes('calendar'));}).catch(()=>{});return()=>{active=false;};},[]);

  const o = destination => window.location.assign(destination);
  const r = i.agent.homeNotices.useQuery(undefined, {
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
    retry: 1,
  });
  const q = i.agent.syncCalendly.useMutation();
  const p = i.agent.markClientEmailRead.useMutation();
  k.useEffect(() => {
    if (!calendarAllowed || document.documentElement.hasAttribute("data-portal-audit")) return;
    let active = true;
    q.mutateAsync({ quick: true, daily: true })
      .then(result => {if(active&&!result.skipped){setCalendarVersion(v=>v+1);return r.refetch();}})
      .catch(error => {if(active){setAgendaError(true);setAgendaStatus(error instanceof Error ? error.message : "Não foi possível sincronizar. Use o ícone de atualização para tentar novamente.");}});
    return () => { active = false; };
  }, [calendarAllowed]);
  const s = r.data,
    c = (s?.tasks || [])
      .filter(t => t.status === "pending")
      .sort((t, a) => {
        const n = t.title.startsWith("[Pagamento ") ? 0 : 1,
          u = a.title.startsWith("[Pagamento ") ? 0 : 1;
        return n !== u
          ? n - u
          : new Date(String(t.dueAt || 0)).getTime() -
              new Date(String(a.dueAt || 0)).getTime();
      }),
    d =
      (s?.notifications?.length || 0) +
      (birthdayNotices.data?.length||0) +
      c.length;
  A("portal", d, "affinity-agent-pending");
  return e.jsxs("div", {
    className: "min-h-screen bg-black text-white lg:pl-64",
    children: [
      e.jsx(C, {}),
      e.jsxs("main", {
        className: "mx-auto max-w-6xl space-y-4 px-4 py-4",
        children: [
          e.jsx("h1", {
            className: "text-xl font-bold leading-tight",
            style: { margin: "0 0 12px" },
            children: "Início",
          }),
          calendarAllowed && e.jsx(WeeklyAgenda,{version:calendarVersion,syncing:q.isPending,onSync:async()=>{setAgendaError(false);setAgendaStatus('Sincronizando agenda…');try{await q.mutateAsync({quick:true});setCalendarVersion(v=>v+1);await r.refetch();setAgendaStatus('Agenda sincronizada.');}catch(error){setAgendaError(true);setAgendaStatus(error instanceof Error?error.message:'Não foi possível sincronizar.');}}}),
          d > 0 &&
            e.jsxs(m, {
              className: "border-gold/30 bg-[#0b1524] p-6",
              children: [
                e.jsxs("div", {
                  className: "flex items-center justify-between gap-4",
                  children: [
                    e.jsxs("div", {
                      children: [
                        e.jsxs("h2", {
                          className:
                            "flex items-center gap-2 text-xl font-bold text-gold",
                          children: [
                            e.jsx(x, { size: 20 }),
                            " Central de notificações",
                          ],
                        }),
                        e.jsx("p", {
                          className: "mt-1 text-sm text-gray-400",
                          children:
                            "Tudo o que precisa da sua atenção, organizado por prioridade.",
                        }),
                      ],
                    }),
                    e.jsx("span", {
                      className:
                        "rounded-full bg-gold px-3 py-1 text-sm font-bold text-black",
                      children: d,
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "mt-5 grid gap-4 xl:grid-cols-3",
                  children: [e.jsx(AgentEmailReviews,{}),e.jsx(BirthdayAlerts,{}),
                    (s?.notifications?.length || 0) > 0 &&
                      e.jsxs("section", {
                        className:
                          "rounded-2xl border border-red-400/40 bg-red-500/10 p-4",
                        children: [
                          e.jsxs("div", {
                            className: "flex items-start justify-between gap-3",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "text-xs font-bold uppercase tracking-wider text-red-300",
                                    children: "1 · Prioridade máxima",
                                  }),
                                  e.jsxs("h3", {
                                    className:
                                      "mt-1 flex items-center gap-2 font-bold text-white",
                                    children: [
                                      e.jsx(I, { size: 18 }),
                                      " Mensagens de clientes",
                                    ],
                                  }),
                                ],
                              }),
                              e.jsx("span", {
                                className:
                                  "rounded-full bg-red-400 px-2.5 py-1 text-xs font-bold text-black",
                                children: s?.notifications?.length || 0,
                              }),
                            ],
                          }),
                          e.jsx("div", {
                            className:
                              "mt-4 max-h-96 space-y-3 overflow-y-auto pr-1",
                            children: (s?.notifications || []).map(t =>
                              e.jsxs(
                                "div",
                                {
                                  className:
                                    "rounded-xl border border-red-300/25 bg-black/35 p-3 transition hover:border-red-200 hover:bg-red-400/10",
                                  children: [
                                    e.jsxs("button", {
                                      type: "button",
                                      onClick: () =>
                                        o(
                                          `/agentes/email?clientEmailId=${t.id}`
                                        ),
                                      className: "w-full text-left",
                                      children: [
                                        e.jsx("span", {
                                          className:
                                            "block font-semibold text-white",
                                          children: t.clientName,
                                        }),
                                        e.jsx("span", {
                                          className:
                                            "mt-1 block truncate text-sm text-gray-200",
                                          children: t.subject || "E-mail recebido",
                                        }),
                                        e.jsx("span", {
                                          className:
                                            "mt-2 block text-xs text-red-200/80",
                                          children: new Date(
                                            String(t.sentAt)
                                          ).toLocaleString("pt-BR"),
                                        }),
                                      ],
                                    }),
                                    e.jsxs("div", {
                                      className:
                                        "mt-3 flex flex-wrap items-center gap-3 border-t border-red-200/10 pt-3",
                                      children: [
                                        e.jsx("button", {
                                          type: "button",
                                          onClick: () =>
                                            o(
                                              `/agentes/email?clientEmailId=${t.id}`
                                            ),
                                          className:
                                            "text-xs font-bold text-red-200 hover:text-white",
                                          children: "Abrir conversa",
                                        }),
                                        e.jsx("button", {
                                          type: "button",
                                          disabled: p.isPending,
                                          onClick: async () => {
                                            (await p.mutateAsync({ id: t.id }),
                                              await r.refetch());
                                          },
                                          className:
                                            "ml-auto rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-gray-200 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-50",
                                          children: "Excluir notificação",
                                        }),
                                      ],
                                    }),
                                  ],
                                },
                                t.id
                              )
                            ),
                          }),
                        ],
                      }),
                    c.length > 0 &&
                      e.jsxs("section", {
                        className:
                          "rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4",
                        children: [
                          e.jsxs("div", {
                            className: "flex items-start justify-between gap-3",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "text-xs font-bold uppercase tracking-wider text-amber-300",
                                    children: "2 · Atenção necessária",
                                  }),
                                  e.jsxs("h3", {
                                    className:
                                      "mt-1 flex items-center gap-2 font-bold text-white",
                                    children: [
                                      e.jsx(f, { size: 18 }),
                                      " Pagamentos atrasados",
                                    ],
                                  }),
                                ],
                              }),
                              e.jsx("span", {
                                className:
                                  "rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-black",
                                children: c.length,
                              }),
                            ],
                          }),
                          e.jsx("div", {
                            className:
                              "mt-4 max-h-96 space-y-3 overflow-y-auto pr-1",
                            children: c.map(t =>
                              e.jsxs(
                                "div",
                                {
                                  className:
                                    "rounded-xl border border-amber-300/20 bg-black/30 p-3 transition hover:border-amber-300 hover:bg-amber-400/10",
                                  children: [
                                    e.jsxs("button", {
                                      type: "button",
                                      onClick: () =>
                                        o(
                                          t.clientId
                                            ? `/agentes/caso-pagamento?task=${t.id}`
                                            : `/agentes/caso-pagamento?task=${t.id}`
                                        ),
                                      className: "w-full text-left",
                                      children: [
                                        e.jsx("span", {
                                          className:
                                            "block font-semibold text-white",
                                          children: t.title,
                                        }),
                                        e.jsx("span", {
                                          className:
                                            "mt-1 block text-xs text-gray-400",
                                          children: t.dueAt
                                            ? new Date(
                                                String(t.dueAt)
                                              ).toLocaleString("pt-BR")
                                            : "Sem data definida",
                                        }),
                                        e.jsx("span", {
                                          className:
                                            "mt-2 block text-xs font-bold text-amber-300",
                                          children: t.clientId
                                            ? "Abrir conversa e tomar ação"
                                            : "Abrir apólices e tomar ação",
                                        }),
                                      ],
                                    }),
                                  ],
                                },
                                t.id
                              )
                            ),
                          }),
                        ],
                      }),
                  ],
                }),
              ],
            }),
        ],
      }),
    ],
  });
}
export { H as default };
