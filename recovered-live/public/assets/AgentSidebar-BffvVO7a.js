import { c, a as u, r as f, t as g, j as e } from "./index-BIU-6RMI.js?v=20260901-12";
import {
  a as i,
  F as b,
  C as y,
  L as j,
  b as v,
} from "./FloatingInternalChat-C-mZ1jql.js";
import { L as w, S as k } from "./LanguageSelector-DkTXTche.js";
import { C } from "./x-BKidgWlG.js";
import { C as N } from "./chevron-right-DepQZrYR.js";
import { E as z } from "./external-link-CEjUwZyT.js";
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const S = c("ListTodo", [
  ["rect", { x: "3", y: "5", width: "6", height: "6", rx: "1", key: "1defrl" }],
  ["path", { d: "m3 17 2 2 4-4", key: "1jhpwq" }],
  ["path", { d: "M13 6h8", key: "15sg57" }],
  ["path", { d: "M13 12h8", key: "h98zly" }],
  ["path", { d: "M13 18h8", key: "oe0vm4" }],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const M = c("MessagesSquare", [
  [
    "path",
    {
      d: "M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z",
      key: "p1xzt8",
    },
  ],
  [
    "path",
    { d: "M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1", key: "1cx29u" },
  ],
]);
/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const L = c("Settings", [
    [
      "path",
      {
        d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
        key: "1qme2f",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }],
  ]),
  A = [
    ["Agenda", "/agentes/agenda", S],
    ["E-mail", "/agentes/email", M],
    ["Avaliações", "/agentes/avaliacoes", k],
  ];
function E() {
  const [t, s] = u(),
    x = t === "/agentes/crm" || t === "/agentes/mensagens",
    B =
      t === "/agentes/crm" &&
      new URLSearchParams(window.location.search).get("setor") === "leads",
    [l, m] = f.useState(x),
    [P, R] = f.useState(t === "/agentes/clientes"),
    [T, H] = f.useState(t === "/agentes/configuracoes"),
    p = g.auth.logout.useMutation(),
    d = g.agent.pendingCounts.useQuery(void 0, {
      refetchInterval: 6e4,
      staleTime: 3e4,
    }),
    n = d.data?.incompleteProfiles || 0,
    o = d.data?.pendingReviews || 0,
    q = d.data?.newMessages || 0;
  return e.jsxs(e.Fragment, {
    children: [
      e.jsxs("aside", {
        className:
          "w-full border-r border-gold/20 bg-[#0f1f36] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:overflow-y-auto",
        children: [
          e.jsxs("div", {
            className:
              "flex items-start justify-between border-b border-gold/20 p-5",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("div", {
                    className: "text-lg font-bold text-gold",
                    children: "Affinity Financial",
                  }),
                  e.jsx("div", {
                    className: "mt-1 text-xs text-gray-400",
                    children: "Portal do Agente",
                  }),
                ],
              }),
              e.jsx(w, {}),
            ],
          }),
          e.jsxs("nav", {
            className: "space-y-1 p-4",
            children: [
              e.jsxs("button", {
                onClick: () => s("/agentes/dashboard"),
                className: `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${t === "/agentes/dashboard" ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`,
                children: [
                  e.jsx(y, { size: 18 }),
                  e.jsx("span", {
                    className: "flex-1 text-left",
                    children: "Início",
                  }),
                ],
              }),
              e.jsxs("button", {
                type: "button",
                "aria-expanded": l,
                "aria-controls": "agent-crm-menu",
                onClick: () => m(r => !r),
                className: `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${x ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`,
                children: [
                  e.jsx(i, { size: 18 }),
                  e.jsx("span", {
                    className: "flex-1 text-left",
                    children: "CRM",
                  }),
                  l ? e.jsx(C, { size: 16 }) : e.jsx(N, { size: 16 }),
                ],
              }),
              l &&
                e.jsxs("div", {
                  id: "agent-crm-menu",
                  className: "mb-2 ml-5 space-y-1 border-l border-gold/25 pl-3",
                  children: [
                    e.jsxs("button", {
                      onClick: () =>
                        window.location.assign("/agentes/crm?setor=leads"),
                      className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${B ? "bg-white/10 text-gold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`,
                      children: [e.jsx(i, { size: 15 }), " Leads"],
                    }),
                    e.jsxs("button", {
                      onClick: () => s("/agentes/crm"),
                      className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${t === "/agentes/crm" && !B ? "bg-white/10 text-gold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`,
                      children: [
                        e.jsx(i, { size: 15 }),
                        " Clientes e acompanhamento",
                      ],
                    }),
                    e.jsxs("button", {
                      onClick: () => s("/agentes/mensagens"),
                      className: `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${t === "/agentes/mensagens" ? "bg-white/10 text-gold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`,
                      children: [
                        e.jsx(M, { size: 15 }),
                        " Mensagens e automações",
                      ],
                    }),
                  ],
                }),
              e.jsxs("button", {
                type: "button",
                "aria-expanded": P,
                onClick: () => R(r => !r),
                className: `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${t === "/agentes/clientes" ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`,
                children: [
                  e.jsx(i, { size: 18 }),
                  e.jsx("span", {
                    className: "flex-1 text-left",
                    children: "Aplicações",
                  }),
                  P ? e.jsx(C, { size: 16 }) : e.jsx(N, { size: 16 }),
                ],
              }),
              P &&
                e.jsxs("div", {
                  className: "mb-2 ml-5 space-y-1 border-l border-gold/25 pl-3",
                  children: [
                    e.jsx("button", {
                      onClick: () =>
                        window.location.assign("/agent-applications"),
                      className:
                        "flex w-full rounded-lg px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/5 hover:text-white",
                      children: "Novas aplicações",
                    }),
                    e.jsxs("button", {
                      onClick: () => s("/agentes/clientes"),
                      className: `flex w-full items-center rounded-lg px-3 py-2 text-left text-xs ${t === "/agentes/clientes" ? "bg-white/10 text-gold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`,
                      children: [
                        e.jsx("span", {
                          className: "flex-1",
                          children: "Aplicações concluídas",
                        }),
                        n > 0 &&
                          e.jsx("span", {
                            className:
                              "rounded-full bg-amber-400 px-2 text-black",
                            children: n > 99 ? "99+" : n,
                          }),
                      ],
                    }),
                  ],
                }),
              A.map(([r, a, h]) =>
                e.jsxs(
                  "button",
                  {
                    onClick: () =>
                      a === "/agentes/email" ||
                      a === "/agentes/agenda" ||
                      a === "/agent-review-invites.html"
                        ? window.location.assign(a)
                        : s(a),
                    className: `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${t === a ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`,
                    children: [
                      e.jsx(h, { size: 18 }),
                      e.jsx("span", {
                        className: "flex-1 text-left",
                        children: r,
                      }),
                      a === "/agentes/clientes" &&
                        n > 0 &&
                        e.jsx("span", {
                          className:
                            "min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-xs font-black text-black",
                          children: n > 99 ? "99+" : n,
                        }),
                      a === "/agentes/email" &&
                        q > 0 &&
                        e.jsx("span", {
                          className:
                            "min-w-6 rounded-full bg-red-500 px-2 py-0.5 text-center text-xs font-black text-white",
                          children: q > 99 ? "99+" : q,
                        }),
                      a === "/agentes/avaliacoes" &&
                        o > 0 &&
                        e.jsx("span", {
                          className:
                            "min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-xs font-black text-black",
                          children: o > 99 ? "99+" : o,
                        }),
                    ],
                  },
                  a
                )
              ),
              e.jsxs("button", {
                type: "button",
                "aria-expanded": T,
                onClick: () => H(r => !r),
                className: `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${t === "/agentes/configuracoes" ? "bg-gold font-semibold text-black" : "text-gray-300 hover:bg-white/10"}`,
                children: [
                  e.jsx(L, { size: 18 }),
                  e.jsx("span", { className: "flex-1 text-left", children: "Configurações" }),
                  T ? e.jsx(C, { size: 16 }) : e.jsx(N, { size: 16 }),
                ],
              }),
              T && e.jsx("div", {
                className: "mb-2 ml-5 space-y-1 border-l border-gold/25 pl-3",
                children: [
                  ["Perfil e dados pessoais", "/agentes/configuracoes#perfil"],
                  ["Agenda e Calendly", "/agentes/configuracoes-agenda"],
                  ["Página pública do agente", "/agentes/pagina-publica"],
                  ["E-mail", "/agentes/configuracoes#email"],
                  ["Five Rings", "/agentes/configuracoes#five-rings"],
                  ["WhatsApp", "/agentes/configuracoes#whatsapp"],
                  ["Pastas do e-mail", "/agentes/configuracoes-email"],
                ].map(([r, a]) => e.jsx("button", {
                  type: "button",
                  onClick: () => window.location.assign(a),
                  className: "flex w-full rounded-lg px-3 py-2 text-left text-xs text-gray-400 hover:bg-white/5 hover:text-white",
                  children: r,
                }, a)),
              }),
              e.jsx("div", { className: "my-3 border-t border-white/10" }),
              e.jsxs("button", {
                onClick: () => s("/"),
                className:
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/10",
                children: [e.jsx(z, { size: 18 }), "Site principal"],
              }),
              e.jsxs("button", {
                onClick: async () => {
                  (await p.mutateAsync(),
                    localStorage.removeItem("agentSession"),
                    s("/agentes"));
                },
                className:
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10",
                children: [e.jsx(j, { size: 18 }), "Sair"],
              }),
            ],
          }),
        ],
      }),
      e.jsx(v, { mode: "agent" }),
    ],
  });
}
export { E as A };
