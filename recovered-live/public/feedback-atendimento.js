(() => {
  const $ = id => document.getElementById(id), token = new URLSearchParams(location.search).get("token") || "";
  let rating = 0;
  async function api(name, input, mutation = false) {
    const options = { headers: { "content-type": "application/json" } };
    let url = "/api/trpc/" + name;
    if (mutation) { options.method = "POST"; options.body = JSON.stringify({ json: input }); }
    else url += "?input=" + encodeURIComponent(JSON.stringify({ json: input }));
    const response = await fetch(url, options), text = await response.text();
    let payload;
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
      const comment = $("comment").value.trim(), reason = $("reason").value.trim(), doubts = $("doubts").value.trim();
      if (!rating) throw Error("Escolha sua nota nas estrelas.");
      if (comment.length < 10) throw Error("Deixe uma mensagem sobre seu atendimento.");
      if (!reason) throw Error("Conte por que decidiu pensar um pouco mais.");
      await api("serviceFeedback.submit", { token, rating, comment, reason, doubts }, true);
      $("msg").className = "msg"; $("msg").textContent = "Obrigado! Seu feedback foi enviado ao seu consultor."; $("send").disabled = true;
      document.querySelectorAll("textarea,.star").forEach(element => element.disabled = true);
    } catch (error) { $("msg").className = "msg"; $("msg").textContent = error.message; }
  };
  api("serviceFeedback.get", { token }).catch(error => { $("msg").className = "msg"; $("msg").textContent = error.message; $("send").disabled = true; });
  paint();
})();
