import {
  c as v,
  a as w,
  t as i,
  r as k,
  T as x,
  j as e,
  C as m,
} from "./index-BIU-6RMI.js?v=20260901-13";
import { A as C } from "./AgentSidebar-BffvVO7a.js?v=20260901-2";
import { u as A } from "./FloatingInternalChat-C-mZ1jql.js";
import { M as P } from "./mail-DTOVvRc8.js";
import { C as f, M as I } from "./message-square-Bd585pvl.js";
import { S as M } from "./shield-check-CQZEKJwS.js";
import { T as S } from "./trash-2-DP0NeSJV.js";
import "./LanguageSelector-DkTXTche.js";
import "./x-BKidgWlG.js";
import "./chevron-right-DepQZrYR.js";
import "./external-link-CEjUwZyT.js";
import "./input-maK0rC7f.js";
import "./send-u-E2Isyn.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const T = v("CheckCheck", [
  ["path", { d: "M18 6 7 17l-5-5", key: "116fxf" }],
  ["path", { d: "m22 10-7.5 7.5L13 16", key: "ke71qq" }],
]);
function H() {
  const [, o] = w(),
    r = i.agent.dashboard.useQuery(void 0, {
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: !1,
      retry: 3,
    }),
    l = i.agent.pendingCounts.useQuery(void 0, {
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: !1,
      retry: 3,
    }),
    q = i.agent.syncCalendly.useMutation(),
    j = i.agent.syncInbox.useMutation(),
    p = i.agent.markClientEmailRead.useMutation(),
    b = i.agent.toggleTask.useMutation(),
    h = i.agent.deleteTask.useMutation(),
    E = (() => {
      try {
        return JSON.parse(
          localStorage.getItem("affinity-agent-counts") || "{}"
        );
      } catch {
        return {};
      }
    })();
  k.useEffect(() => {
    l.data &&
      localStorage.setItem("affinity-agent-counts", JSON.stringify(l.data));
  }, [l.data]);
  k.useEffect(() => {
    const t = "affinity-calendly-dashboard-sync",
      a = Number(sessionStorage.getItem(t) || 0);
    if (Date.now() - a < 12e4) return;
    sessionStorage.setItem(t, String(Date.now()));
    let n = !0;
    q.mutateAsync({ quick: !0 })
      .then(() => n && Promise.all([r.refetch(), l.refetch()]))
      .catch(() => {});
    return () => {
      n = !1;
    };
  }, []);
  const s = r.data,
    g = (s?.policies || []).filter(
      t => String(t.status || "inactive") === "active"
    ),
    y = g.reduce((t, a) => t + Math.round(Number(a.points || 0)), 0),
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
      c.length +
      (s?.todayMeetings?.length || 0);
  A("portal", d, "affinity-agent-pending");
  const N = [
    ["Agenda de hoje", s?.todayMeetingCount ?? s?.todayMeetings?.length ?? 0, x],
    ["Pontuação atual", l.data?.score ?? E.score ?? y ?? s?.score, M],
    [
      "Pontos de todo o tempo",
      l.data?.lifetimeScore ?? E.lifetimeScore ?? s?.lifetimeScore ?? y,
      M,
    ],
  ];
  return e.jsxs("div", {
    className: "min-h-screen bg-black text-white lg:pl-64",
    children: [
      e.jsx(C, {}),
      e.jsxs("main", {
        className: "mx-auto max-w-6xl space-y-7 px-4 py-8",
        children: [
          e.jsxs("div", {
            children: [
              e.jsx("p", {
                className:
                  "text-sm font-bold uppercase tracking-[.2em] text-gold",
                children: "Visão geral",
              }),
              e.jsx("h1", {
                className: "mt-2 text-3xl font-bold",
                children: "Painel do Agente",
              }),
              e.jsx("p", {
                className: "mt-2 text-gray-400",
                children:
                  "Seus clientes, compromissos e resultados em um só lugar.",
              }),
            ],
          }),
          e.jsx("div", {
            className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
            children: N.map(([t, a, n]) =>
              e.jsxs(
                m,
                {
                  className: "border-gold/20 bg-[#0b1524] p-5",
                  children: [
                    e.jsx(n, { className: "text-gold" }),
                    e.jsx("p", {
                      className: "mt-4 text-sm text-gray-400",
                      children: t,
                    }),
                    e.jsx("p", {
                      className: "mt-1 text-3xl font-bold text-white",
                      children: a ?? (l.isError && r.isError ? "Erro" : "…"),
                    }),
                  ],
                },
                t
              )
            ),
          }),
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
                  children: [
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
                                          `/agentes/clientes?cliente=${t.clientId}`
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
                                          children: t.body,
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
                                              `/agentes/clientes?cliente=${t.clientId}`
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
                                          children: "Marcar como lida",
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
                                      " Tarefas e pagamentos",
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
                                            ? `/agentes/clientes?cliente=${t.clientId}&conversa=1`
                                            : "/agentes/apolices"
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
                                    e.jsxs("div", {
                                      className:
                                        "mt-3 flex flex-wrap gap-2 border-t border-amber-200/10 pt-3",
                                      children: [
                                        e.jsxs("button", {
                                          type: "button",
                                          disabled: b.isPending,
                                          onClick: async () => {
                                            (await b.mutateAsync({
                                              id: t.id,
                                              completed: !0,
                                            }),
                                              await r.refetch());
                                          },
                                          className:
                                            "flex items-center gap-1.5 rounded-full border border-green-300/25 px-3 py-1 text-xs font-semibold text-green-200 transition hover:border-green-300 hover:bg-green-400/10 disabled:opacity-50",
                                          children: [
                                            e.jsx(T, { size: 13 }),
                                            " Resolvido",
                                          ],
                                        }),
                                        t.clientId &&
                                          e.jsx("button", {
                                            type: "button",
                                            onClick: () =>
                                              o(
                                                `/agentes/clientes?cliente=${t.clientId}&completar=1`
                                              ),
                                            className:
                                              "flex items-center gap-1.5 rounded-full border border-sky-300/25 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:border-sky-300 hover:bg-sky-400/10",
                                            children: "Abrir/alterar cadastro",
                                          }),
                                        e.jsxs("button", {
                                          type: "button",
                                          disabled: h.isPending,
                                          onClick: async () => {
                                            window.confirm(
                                              "Excluir esta pendência?"
                                            ) &&
                                              (await h.mutateAsync({
                                                id: t.id,
                                              }),
                                              await r.refetch());
                                          },
                                          className:
                                            "ml-auto flex items-center gap-1.5 rounded-full border border-red-300/25 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-300 hover:bg-red-400/10 disabled:opacity-50",
                                          children: [
                                            e.jsx(S, { size: 13 }),
                                            " Excluir",
                                          ],
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
                    (s?.todayMeetings?.length || 0) > 0 &&
                      e.jsxs("section", {
                        className:
                          "rounded-2xl border border-sky-400/25 bg-sky-400/5 p-4",
                        children: [
                          e.jsxs("div", {
                            className: "flex items-start justify-between gap-3",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "text-xs font-bold uppercase tracking-wider text-sky-300",
                                    children: "3 · Agenda de hoje",
                                  }),
                                  e.jsxs("h3", {
                                    className:
                                      "mt-1 flex items-center gap-2 font-bold text-white",
                                    children: [
                                      e.jsx(x, { size: 18 }),
                                      " Compromissos de hoje",
                                    ],
                                  }),
                                ],
                              }),
                              e.jsx("span", {
                                className:
                                  "rounded-full bg-sky-300 px-2.5 py-1 text-xs font-bold text-black",
                                children: s?.todayMeetings?.length || 0,
                              }),
                            ],
                          }),
                          e.jsx("div", {
                            className:
                              "mt-4 max-h-96 space-y-3 overflow-y-auto pr-1",
                            children: (s?.todayMeetings || []).map(t =>
                              e.jsxs(
                                "div",
                                {
                                  className:
                                    "w-full rounded-xl border border-sky-300/20 bg-black/30 p-3 text-left",
                                  children: [
                                    e.jsx("span", {
                                      className:
                                        "block font-semibold text-white",
                                      children: t.inviteeName || t.eventName || "Compromisso",
                                    }),
                                    e.jsxs("span", {
                                      className:
                                        "mt-1 block text-sm text-sky-100/80",
                                      children: [
                                        new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(t.startTime)),
                                        " · ",
                                        t.eventName || "Reunião",
                                      ],
                                    }),
                                    e.jsx("button", { type: "button", onClick: () => window.location.assign(`/agentes/compromisso?meetingId=${t.id}`), className: "mt-2 block text-xs font-bold text-sky-300 hover:text-white", children: "Abrir cliente" }),
                                  ],
                                },
                                `meeting-${t.id}`
                              )
                            ),
                          }),
                        ],
                      }),
                  ],
                }),
              ],
            }),
          e.jsxs(m, {
            className: "border-gold/20 bg-[#0b1524] p-6",
            children: [
              e.jsx("h2", {
                className: "text-xl font-bold text-gold",
                children: "Suas apólices",
              }),
              e.jsx("p", {
                className: "mt-4 text-5xl font-bold",
                children:
                  l.data?.activePolicyCount ??
                  E.activePolicyCount ??
                  s?.activePolicyCount ??
                  (r.isLoading ? "…" : g.length),
              }),
              e.jsx("p", {
                className: "mt-2 text-sm text-gray-400",
                children:
                  "A pontuação usa o target premium anual de cada apólice.",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
export { H as default };
