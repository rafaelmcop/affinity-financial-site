export const DEFAULT_FLEX_LIFE_REVIEW_SUBJECT =
  "Revisão anual da sua apólice nº {apolice numero}";

export const DEFAULT_FLEX_LIFE_REVIEW_MESSAGE = `Olá, {nome}! Tudo bem? 👋

A sua apólice **nº {apolice numero}** completou mais um aniversário, e chegou o momento de fazermos a sua **Revisão Anual da Apólice**. 📋

Essa revisão é importante para acompanharmos como a apólice se desenvolveu ao longo do último ano, analisar seu desempenho e verificar se existe a necessidade de algum ajuste para mantê-la alinhada aos seus objetivos e buscar um melhor desenvolvimento ao longo do tempo.

Também é uma ótima oportunidade para esclarecer dúvidas e entender melhor a evolução da sua apólice.

Entre em contato comigo para agendarmos sua revisão:

**{agente}**
📞 {telefone do agente}
🌐 www.affinityfc.org

**Affinity Financial Consulting**
Proteção hoje. Planejamento para o futuro. 💙`;

export const LEGACY_POLICY_REVIEW_MESSAGE =
  "Olá {nome}, sua apólice completa mais um ano. Este é um ótimo momento para analisarmos se sua proteção ainda acompanha suas necessidades. Entre em contato conosco ou agende uma reunião diretamente aqui: {agenda}. Estamos à sua disposição para revisar sua apólice.";

export function isFlexLifeProduct(product: unknown) {
  return /flex\s*life/i.test(String(product || ""));
}

export function flexLifeReviewDates(applicationDate: string | Date) {
  const normalized =
    typeof applicationDate === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(applicationDate)
      ? `${applicationDate.replace(" ", "T")}Z`
      : applicationDate;
  const application = new Date(normalized);
  if (Number.isNaN(application.getTime())) return null;
  const reviewAt = new Date(application);
  const originalDay = reviewAt.getUTCDate();
  reviewAt.setUTCDate(1);
  reviewAt.setUTCMonth(reviewAt.getUTCMonth() + 13);
  const lastDay = new Date(
    Date.UTC(reviewAt.getUTCFullYear(), reviewAt.getUTCMonth() + 1, 0)
  ).getUTCDate();
  reviewAt.setUTCDate(Math.min(originalDay, lastDay));
  const noticeAt = new Date(reviewAt.getTime() - 15 * 86400000);
  return { reviewAt, noticeAt };
}
