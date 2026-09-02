(() => {
  const $ = id => document.getElementById(id), params = new URLSearchParams(location.search), token = params.get("token") || "", followup = params.get("followup") === "1";
  let rating = 0;
  if (followup) $("followup-fields").hidden = false;
  async function api(name, input, mutation = false) {
    const options = { headers: { "content-type": "application/json" } }; let url = "/api/trpc/" + name;
    if (mutation) { options.method = "POST"; options.body = JSON.stringify({ json: input }); }
    else url += "?input=" + encodeURIComponent(JSON.stringify({ json: input }));
    const response = await fetch(url, options), text = await response.text(); let payload;
    try { payload = JSON.parse(text); } catch { throw Error("O servidor não respondeu corretamente"); }
    if (payload.error) throw Error(payload.error.json?.message || "Não foi possível continuar");
    return payload.result.data.json;
  }
  function paint() {
    document.querySelectorAll(".star").forEach((star, index) => star.classList.toggle("filled", index < rating));
    $("rating-text").textContent = rating ? `${rating} de 5 estrelas` : "Selecione de 1 a 5 estrelas";
  }
  $("stars").innerHTML = [1,2,3,4,5].map(number => `<button type="button" class="star" data-rating="${number}" aria-label="${number} estrela${number > 1 ? "s" : ""}">★</button>`).join("");
  document.querySelectorAll(".star").forEach(star => star.onclick = () => { rating = Number(star.dataset.rating); paint(); });
  $("send").onclick = async () => {
    try {
      let quote = $("quote").value.trim();
      if (!rating) throw Error("Escolha sua nota nas estrelas.");
      if (quote.length < 10) throw Error("Deixe uma mensagem sobre seu atendimento.");
      if (followup) {
        const reason = $("reason").value.trim(), doubts = $("doubts").value.trim();
        if (!reason) throw Error("Conte por que decidiu pensar um pouco mais.");
        quote += `\n\nMotivo para ainda não avançar:\n${reason}\n\nDúvidas ou pontos a esclarecer:\n${doubts || "Nenhuma dúvida informada."}`;
      }
      await api("reviewInvites.submit", { token, rating, quote }, true);
      $("msg").className = "msg"; $("msg").textContent = "Muito obrigado! Sua avaliação foi enviada para análise."; $("send").disabled = true;
      document.querySelectorAll("input,textarea,.star").forEach(element => element.disabled = true);
    } catch (error) { $("msg").className = "msg"; $("msg").textContent = error.message; }
  };
  paint();
})();
