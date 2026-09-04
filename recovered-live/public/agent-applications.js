(() => {
  const $ = id => document.getElementById(id),
    states = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
      "DC",
    ],
    sections = [...document.querySelectorAll(".section")],
    inputs = [
      ...document.querySelectorAll(
        "#form input:not([type=hidden]):not([type=file]),#form select:not(#documentCategory),#form textarea"
      ),
    ];
  let rows = [],
    tab = "open",
    step = 0,
    beneficiaries = [],
    contacts = [],
    attachments = [];
  const digits = value => String(value || "").replace(/\D/g, ""),
    formatPhone = value => {
      let d = digits(value);
      if (d.length === 11 && d[0] === "1") d = d.slice(1);
      d = d.slice(0, 10);
      if (d.length < 4) return d;
      if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    },
    formatSsn = value => {
      if (String(value).trim() === "0") return "0";
      const d = digits(value).slice(0, 9);
      return d.length <= 3
        ? d
        : d.length <= 5
          ? `${d.slice(0, 3)}-${d.slice(3)}`
          : `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    },
    upper = value => String(value || "").toUpperCase();
  const currencyIds = new Set([
      "coverageRequested",
      "premiumBudget",
      "existingCoverage",
      "personalWeeklyIncome",
      "personalWeeklyExpenses",
      "weeklyIncome",
      "weeklyFixedExpenses",
    ]),
    currencyNumber = input => {
      const value = Number(String(input ?? "").replace(/[^0-9.-]/g, ""));
      return Number.isFinite(value) ? value : 0;
    },
    centimeters = input => {
      const value = Number(
        String(input ?? "")
          .trim()
          .replace(",", ".")
      );
      return Number.isFinite(value) && value > 0
        ? value < 3
          ? value * 100
          : value
        : 0;
    },
    annualUsd = (input, multiplier) =>
      input === null || input === undefined || input === ""
        ? ""
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          }).format(currencyNumber(input) * multiplier),
    usd = input =>
      input === null || input === undefined || input === ""
        ? ""
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          }).format(currencyNumber(input));
  function applyFieldFormats() {
    if ($("clientPhone"))
      $("clientPhone").value = formatPhone($("clientPhone").value);
    if ($("ssn")) $("ssn").value = formatSsn($("ssn").value);
    for (const id of ["passportNumber", "driverLicenseNumber"])
      if ($(id)) $(id).value = upper($(id).value);
    for (const id of currencyIds)
      if ($(id) && $(id).value !== "") $(id).value = usd($(id).value);
  }
  function usDate(input) {
    const match = String(input || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[2]}/${match[3]}/${match[1]}` : input;
  }
  for (const id of currencyIds) {
    const field = $(id);
    if (!field) continue;
    field.addEventListener("focus", () => {
      if (field.value !== "") field.value = String(currencyNumber(field.value));
    });
    field.addEventListener("blur", () => {
      if (field.value !== "") field.value = usd(field.value);
    });
  }
  document
    .querySelectorAll(".us-state")
    .forEach(
      s =>
        (s.innerHTML =
          '<option value="">Selecione</option>' +
          states.map(x => `<option>${x}</option>`).join(""))
    );
  document.head.insertAdjacentHTML(
    "beforeend",
    "<style>.side details{display:block}.side summary{display:block;list-style:none;padding:11px 13px;border-radius:9px;color:#d1d5db;cursor:pointer}.side summary::-webkit-details-marker{display:none}.side details .sub{display:grid!important;grid-template-columns:1fr!important;gap:5px;margin:4px 0 6px 14px!important;padding-left:10px!important}.side details .sub a{display:block!important;width:100%;white-space:normal}.menu-badge{float:right;min-width:22px;border-radius:99px;background:#ef4444;color:#fff;padding:2px 7px;text-align:center;font-size:11px;font-weight:900}.nav-divider{border-top:1px solid #ffffff18;margin:10px 0}.logout-link{color:#fca5a5!important}.field-error{color:#fca5a5!important}.field-error input,.field-error select,.field-error textarea,.section-error{border:2px solid #ef4444!important;box-shadow:0 0 0 3px #ef444426!important}.menu-toggle{display:none!important}@media(max-width:899px){.side nav{display:none!important;grid-template-columns:1fr!important}.side.open nav{display:grid!important}.menu-toggle{display:block!important;position:absolute;right:16px;top:16px}}</style>"
  );
  const side = document.querySelector(".side"),
    agentNav = side.querySelector("nav");
  agentNav.innerHTML = `<a href="/agentes/dashboard">Início</a><details><summary>CRM</summary><div class="sub"><a href="/agentes/crm">Clientes e acompanhamento</a><a href="/agentes/mensagens">Mensagens e automações</a></div></details><details open><summary class="active">Aplicações</summary><div class="sub"><a class="active" href="/agent-applications">Novas aplicações</a><a href="/agentes/clientes">Aplicações concluídas</a></div></details><a href="/agentes/email">E-mail <span id="application-email-badge" class="menu-badge" hidden></span></a><a href="/agentes/apolices">Apólices</a><a href="/agentes/tarefas">Tarefas</a><a href="/agentes/avaliacoes">Avaliações</a><a href="/agent-review-invites.html">Solicitar avaliação</a><a href="/agentes/configuracoes">Configurações</a><div class="nav-divider"></div><a href="/">Site principal</a><a href="#" class="logout-link" data-agent-logout>Sair</a>`;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.textContent = "☰";
  toggle.setAttribute("aria-label", "Abrir menu");
  toggle.onclick = () => side.classList.toggle("open");
  side.prepend(toggle);
  function updateParents() {
    for (const parent of ["father", "mother"]) {
      const value = $(parent + "Living").value.toLowerCase();
      document
        .querySelectorAll(`[data-parent="${parent}"]`)
        .forEach(
          el =>
            (el.style.display =
              el.dataset.when ===
              (value === "sim" ? "yes" : value === "não" ? "no" : "")
                ? "block"
                : "none")
        );
    }
  }
  document
    .querySelectorAll(".parent-status")
    .forEach(s => (s.onchange = updateParents));
  updateParents();
  function updateDriver() {
    const show = $("driverHasLicense").value === "Sim";
    document
      .querySelectorAll('[data-driver="yes"]')
      .forEach(el => (el.style.display = show ? "block" : "none"));
  }
  $("driverHasLicense").onchange = updateDriver;
  updateDriver();
  function updateHealth() {
    document.querySelector('[data-health="condition"]').style.display =
      $("hasMedicalCondition").value === "Sim" ? "block" : "none";
    document.querySelector('[data-health="medication"]').style.display =
      $("usesMedication").value === "Sim" ? "block" : "none";
  }
  document
    .querySelectorAll(".health-status")
    .forEach(s => (s.onchange = updateHealth));
  updateHealth();
  function updateDoctor() {
    const show = $("seenDoctor").value === "Sim";
    document
      .querySelectorAll('[data-doctor="yes"]')
      .forEach(el => (el.style.display = show ? "block" : "none"));
  }
  $("seenDoctor").onchange = updateDoctor;
  updateDoctor();
  function updateBirthPlace() {
    const answer = document.getElementById("bornInUSA").value;
    document
      .querySelectorAll("[data-born]")
      .forEach(
        el =>
          (el.style.display =
            el.dataset.born ===
            (answer === "Sim" ? "usa" : answer === "Não" ? "other" : "none")
              ? "block"
              : "none")
      );
  }
  document.getElementById("bornInUSA").onchange = updateBirthPlace;
  updateBirthPlace();
  function updateHeight() {
    const unit = document.getElementById("heightUnit").value;
    document
      .querySelectorAll("[data-height]")
      .forEach(
        el => (el.style.display = el.dataset.height === unit ? "block" : "none")
      );
  }
  document.getElementById("heightUnit").onchange = updateHeight;
  updateHeight();
  const metricHeight = $("heightCm");
  metricHeight.type = "text";
  metricHeight.inputMode = "decimal";
  metricHeight.placeholder = "Ex.: 1,81 ou 181";
  metricHeight.insertAdjacentHTML(
    "afterend",
    '<small class="muted">Você pode informar 1,81 m, 1.81 m ou 181 cm.</small>'
  );
  metricHeight.addEventListener("change", () => {
    const value = centimeters(metricHeight.value);
    if (value) metricHeight.value = String(value);
  });
  function updateInsurance() {
    const show = $("existingInsurance").value === "Sim";
    document
      .querySelectorAll('[data-insurance="yes"]')
      .forEach(el => (el.style.display = show ? "block" : "none"));
  }
  $("existingInsurance").onchange = updateInsurance;
  updateInsurance();
  const esc = v =>
    String(v ?? "").replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]
    );
  function pdfDocumentImages(items = []) {
    return items
      .filter(item => String(item?.data || "").startsWith("data:image/"))
      .map(
        (item, index) =>
          `<section class="document-page"><h2>Documento ${index + 1} — ${esc(item.category || "Documento")}</h2><p>${esc(item.name || "Foto do documento")}</p><img src="${item.data}" alt="${esc(item.category || "Documento")}"></section>`
      )
      .join("");
  }
  async function pdfStoredDocumentImages(applicationId, items = []) {
    const stored = items.filter(
      item => item?.type === "application/pdf" && item?.storageKey
    );
    if (!stored.length) return "";
    const pdfjs = await import("/vendor/pdf.mjs?v=6.2.108");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "/vendor/pdf.worker.min.mjs?v=6.2.108";
    const sections = [];
    for (const item of stored) {
      const file = await api("agent.getApplicationDocument", {
        applicationId,
        storageKey: item.storageKey,
      });
      const encoded = String(file.data || "").split(",", 2)[1] || "";
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index++)
        bytes[index] = binary.charCodeAt(index);
      const pdfDocument = await pdfjs.getDocument({ data: bytes }).promise;
      for (
        let pageNumber = 1;
        pageNumber <= pdfDocument.numPages;
        pageNumber++
      ) {
        const page = await pdfDocument.getPage(pageNumber);
        const initial = page.getViewport({ scale: 1 });
        const scale = Math.min(1.6, 1100 / Math.max(1, initial.width));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;
        sections.push(
          `<section class="document-page"><h2>${esc(item.category || "Documento")} — página ${pageNumber}</h2><p>${esc(item.name || file.name || "Documento PDF")}</p><img src="${canvas.toDataURL("image/jpeg", 0.76)}" alt="${esc(item.category || "Documento")}"></section>`
        );
        page.cleanup();
      }
      await pdfDocument.destroy();
    }
    return sections.join("");
  }
  async function api(name, input = {}, mutation = false) {
    const opt = {
      credentials: "include",
      headers: { "content-type": "application/json" },
    };
    let url = `/api/trpc/${name}`;
    if (mutation) {
      opt.method = "POST";
      opt.body = JSON.stringify({ json: input });
    } else
      url += `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    const r = await fetch(url, opt),
      text = await r.text();
    let p;
    try {
      p = JSON.parse(text);
    } catch {
      throw Error("O servidor não respondeu corretamente");
    }
    if (p.error)
      throw Error(p.error.json?.message || "Não foi possível concluir");
    const data = p.result?.data?.json;
    if (name === "agent.submitApplication" && data?.reviewInvite)
      setTimeout(
        () =>
          showReviewShare(
            data.reviewInvite,
            rows.find(x => x.id === Number(input.id))
          ),
        0
      );
    return data;
  }
  document.querySelector("[data-agent-logout]").onclick = async e => {
    e.preventDefault();
    try {
      await api("auth.logout", {}, true);
    } catch {}
    localStorage.removeItem("agentSession");
    location.href = "/agentes";
  };
  api("agent.pendingCounts")
    .then(counts => {
      const badge = $("application-email-badge"),
        total = Number(counts?.newMessages || 0);
      badge.textContent = total > 99 ? "99+" : total;
      badge.hidden = !total;
    })
    .catch(() => {});
  function notice(message, error = false) {
    const b = $("notice");
    b.textContent = message;
    b.className = `notice show${error ? " error" : ""}`;
  }
  function updateBeneficiaryTotal() {
    const total = beneficiaries.reduce(
        (sum, b) => sum + Number(b.percentage || 0),
        0
      ),
      el = $("beneficiary-total");
    el.textContent = `Total dos beneficiários: ${total}% — deve ser exatamente 100%`;
    el.style.color = Math.abs(total - 100) < 0.001 ? "#86efac" : "#fca5a5";
  }
  function renderRepeats() {
    const card = (x, i, type) =>
      `<div class="repeat"><div class="form-grid"><label>Nome<input data-r="${type}" data-i="${i}" data-k="name" value="${esc(x.name)}"></label><label>Parentesco<input data-r="${type}" data-i="${i}" data-k="relationship" value="${esc(x.relationship)}"></label><label>Data de nascimento<input type="date" data-r="${type}" data-i="${i}" data-k="birthDate" value="${esc(x.birthDate)}"></label><label>${type === "beneficiaries" ? "Percentual" : "Telefone"}<input ${type === "beneficiaries" ? 'type="number" min="0" max="100" step="0.01"' : ""} data-r="${type}" data-i="${i}" data-k="${type === "beneficiaries" ? "percentage" : "phone"}" value="${esc(x.percentage || x.phone || "")}"></label></div><button type="button" data-remove="${type}" data-i="${i}">Remover</button></div>`;
    $("beneficiaries").innerHTML = beneficiaries
      .map((x, i) => card(x, i, "beneficiaries"))
      .join("");
    $("contacts").innerHTML = contacts
      .map((x, i) => card(x, i, "contacts"))
      .join("");
    document.querySelectorAll("[data-r]").forEach(
      e =>
        (e.oninput = () => {
          const a = e.dataset.r === "beneficiaries" ? beneficiaries : contacts;
          a[+e.dataset.i][e.dataset.k] = e.value;
          updateBeneficiaryTotal();
        })
    );
    document.querySelectorAll("[data-remove]").forEach(
      e =>
        (e.onclick = () => {
          const a =
            e.dataset.remove === "beneficiaries" ? beneficiaries : contacts;
          a.splice(+e.dataset.i, 1);
          renderRepeats();
        })
    );
    updateBeneficiaryTotal();
  }
  function showStep(n) {
    step = Math.max(0, Math.min(sections.length - 1, n));
    sections.forEach((s, i) => s.classList.toggle("active", i === step));
    document
      .querySelectorAll("[data-step-index]")
      .forEach((b, i) => b.classList.toggle("active", i === step));
    $("prev").classList.toggle("hidden", step === 0);
    $("next").classList.toggle("hidden", step === sections.length - 1);
    $("save").classList.toggle("hidden", step !== sections.length - 1);
    scrollTo({ top: 0, behavior: "smooth" });
  }
  $("steps").innerHTML = sections
    .map(
      (s, i) =>
        `<button type="button" data-step-index="${i}">${i + 1}. ${s.dataset.step}</button>`
    )
    .join("");
  document.querySelectorAll("[data-step-index]").forEach(
    b =>
      (b.onclick = async () => {
        if (+b.dataset.stepIndex > step) await saveDraft(true);
        showStep(+b.dataset.stepIndex);
      })
  );
  $("prev").onclick = () => showStep(step - 1);
  $("next").onclick = async () => {
    await saveDraft(true);
    showStep(step + 1);
  };
  $("add-beneficiary").onclick = () => {
    beneficiaries.push({
      name: "",
      relationship: "",
      birthDate: "",
      percentage: beneficiaries.length ? 0 : 100,
    });
    renderRepeats();
  };
  $("add-contact").onclick = () => {
    contacts.push({ name: "", relationship: "", birthDate: "", phone: "" });
    renderRepeats();
  };
  function showAttachments() {
    $("attachment-list").innerHTML = attachments
      .map(
        (a, i) =>
          `<p><strong>${esc(a.category || "Documento")}:</strong> ${esc(a.name)} <button type="button" data-remove-file="${i}">Remover</button></p>`
      )
      .join("");
    document.querySelectorAll("[data-remove-file]").forEach(
      b =>
        (b.onclick = () => {
          attachments.splice(+b.dataset.removeFile, 1);
          showAttachments();
        })
    );
  }
  const attachmentDataUrl = file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error("Não foi possível ler o arquivo."));
        reader.readAsDataURL(file);
      }),
    attachmentCanvasBlob = (canvas, quality) =>
      new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  async function prepareAttachment(file) {
    const name = String(file.name || ""),
      type = String(file.type || "").toLowerCase(),
      isPdf = type === "application/pdf" || /\.pdf$/i.test(name),
      isImage =
        type.startsWith("image/") ||
        /\.(jpe?g|png|webp|heic|heif)$/i.test(name);
    if (isPdf) {
      if (file.size > 15 * 1024 * 1024)
        throw Error(`${name}: o PDF deve ter no máximo 15 MB.`);
      return {
        name: name || "documento.pdf",
        type: "application/pdf",
        data: await attachmentDataUrl(file),
        remote: true,
      };
    }
    if (!isImage)
      throw Error(
        `${name || "Arquivo"}: formato não aceito. Selecione uma foto ou um PDF.`
      );
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () =>
          reject(Error(`${name}: não foi possível abrir esta foto.`));
        element.src = url;
      });
      let scale = Math.min(
          1,
          1800 / Math.max(image.naturalWidth, image.naturalHeight)
        ),
        quality = 0.84,
        blob = null;
      for (let attempt = 0; attempt < 7; attempt++) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        blob = await attachmentCanvasBlob(canvas, quality);
        if (blob && blob.size <= 650000) break;
        quality = Math.max(0.5, quality - 0.08);
        scale *= 0.88;
      }
      if (!blob || blob.size > 900000)
        throw Error(`${name}: não foi possível reduzir esta foto.`);
      return {
        name: String(name || "documento").replace(/\.[^.]+$/, "") + ".jpg",
        type: "image/jpeg",
        data: await attachmentDataUrl(blob),
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  $("documents").onchange = async e => {
    const files = [...e.target.files],
      category = $("documentCategory").value;
    e.target.disabled = true;
    try {
      for (const file of files) {
        const prepared = { ...(await prepareAttachment(file)), category };
        if (prepared.remote) {
          if (!$("id").value && !(await saveDraft(true)))
            throw Error(
              "Preencha ao menos o nome do cliente antes de enviar o PDF."
            );
          const stored = await api(
            "agent.uploadApplicationDocument",
            {
              id: Number($("id").value),
              name: prepared.name,
              type: prepared.type,
              data: prepared.data,
              category,
            },
            true
          );
          attachments.push(stored);
        } else attachments.push(prepared);
      }
      showAttachments();
      await saveDraft(true);
      notice(`${files.length} arquivo(s) enviado(s) com segurança.`);
    } catch (error) {
      notice(error.message, true);
    } finally {
      e.target.disabled = false;
      e.target.value = "";
    }
  };
  function collect() {
    const d = { id: +$("id").value || 0 };
    for (const e of inputs)
      d[e.id] = currencyIds.has(e.id)
        ? e.value === ""
          ? ""
          : currencyNumber(e.value)
        : e.type === "number"
          ? e.value === ""
            ? ""
            : Number(e.value)
          : e.value.trim();
    d.height =
      d.heightUnit === "ft" && d.heightFeet !== "" && d.heightInches !== ""
        ? String(d.heightFeet) + "'-" + String(d.heightInches) + '"'
        : d.heightUnit === "cm" && d.heightCm !== ""
          ? String(d.heightCm)
          : "";
    d.birthCountry = d.bornInUSA === "Sim" ? "USA" : d.birthCountry;
    d.ssn = d.ssn || "0";
    d.existingInsurance = d.existingInsurance || "Não";
    if (d.seenDoctor !== "Sim") {
      d.lastDoctorVisit = "";
      d.physicianName = "";
    }
    if (d.existingInsurance !== "Sim") {
      d.existingInsuranceCompany = "";
      d.existingCoverage = "";
      d.existingLivingBenefits = "";
    }
    d.beneficiaries = beneficiaries;
    d.contacts = contacts.filter(c =>
      Object.values(c).some(v => String(v || "").trim())
    );
    d.attachments = attachments;
    d.beneficiaryName = beneficiaries[0]?.name || "";
    d.beneficiaryRelationship = beneficiaries[0]?.relationship || "";
    d.beneficiaryPercentage =
      beneficiaries[0]?.percentage === ""
        ? ""
        : Number(beneficiaries[0]?.percentage || 0);
    d.applicationData = { ...d };
    delete d.applicationData.id;
    return d;
  }
  function validateForCompletion() {
    document
      .querySelectorAll(".field-error,.section-error")
      .forEach(el => el.classList.remove("field-error", "section-error"));
    const data = collect(),
      missing = [],
      required = {
        clientName: "nome completo",
        clientEmail: "e-mail",
        clientPhone: "telefone",
        birthDate: "data de nascimento",
        address: "endereço",
        city: "cidade",
        state: "estado",
        zipCode: "ZIP Code",
        bornInUSA: "informação se nasceu nos Estados Unidos",
        gender: "sexo",
        maritalStatus: "estado civil",
        ssn: "SSN/ITIN",
        passportNumber: "passaporte",
        driverHasLicense: "informação sobre Driver's License",
        heightUnit: "unidade da altura",
        weight: "peso",
        weightUnit: "unidade do peso",
        employer: "empresa",
        industry: "área profissional",
        occupation: "ocupação",
        employmentLength: "tempo de trabalho",
        personalWeeklyIncome: "renda pessoal semanal",
        personalWeeklyExpenses: "despesas pessoais semanais",
        weeklyIncome: "renda familiar semanal",
        weeklyFixedExpenses: "despesas familiares semanais",
        householdSize: "quantidade de pessoas na residência",
        bankName: "banco",
        routingNumber: "routing number",
        accountNumber: "account number",
        seenDoctor: "consulta médica",
        tobacco: "histórico de fumo",
        hasMedicalCondition: "informação sobre doença ou diagnóstico",
        usesMedication: "informação sobre medicamentos",
        fatherLiving: "situação do pai",
        motherLiving: "situação da mãe",
        productInterest: "produto",
        coverageRequested: "cobertura",
        premiumBudget: "premium",
        existingInsurance: "seguro existente",
      };
    const add = (label, ids) =>
      missing.push({ label, ids: Array.isArray(ids) ? ids : [ids] });
    Object.entries(required).forEach(([id, label]) => {
      if (
        data[id] === null ||
        data[id] === undefined ||
        String(data[id]).trim() === ""
      )
        add(label, id);
    });
    if (
      data.heightUnit === "ft" &&
      (data.heightFeet === "" || data.heightInches === "")
    )
      add("pés e polegadas", ["heightFeet", "heightInches"]);
    if (data.heightUnit === "cm" && data.heightCm === "")
      add("altura em centímetros", "heightCm");
    if (data.bornInUSA === "Sim" && !data.birthState)
      add("estado onde nasceu", "birthState");
    if (data.bornInUSA === "Não" && !data.birthCountry)
      add("país onde nasceu", "birthCountry");
    if (
      data.driverHasLicense === "Sim" &&
      (!data.driverLicenseNumber || !data.driverLicenseState)
    )
      add("número e estado da Driver's License", [
        "driverLicenseNumber",
        "driverLicenseState",
      ]);
    if (
      data.seenDoctor === "Sim" &&
      (!data.lastDoctorVisit || !data.physicianName)
    )
      add("mês da consulta e médico ou hospital", [
        "lastDoctorVisit",
        "physicianName",
      ]);
    if (data.hasMedicalCondition === "Sim" && !data.medicalDetails)
      add("qual doença ou diagnóstico", "medicalDetails");
    if (data.usesMedication === "Sim" && !data.medications)
      add("quais medicamentos e dosagens", "medications");
    for (const parent of ["father", "mother"]) {
      const living = String(data[`${parent}Living`] || "").toLowerCase(),
        who = parent === "father" ? "do pai" : "da mãe";
      if (living === "sim" && !String(data[`${parent}Age`] ?? "").trim())
        add(`idade atual ${who}`, `${parent}Age`);
      if (living === "não") {
        if (!String(data[`${parent}DeathAge`] ?? "").trim())
          add(`idade ao falecer ${who}`, `${parent}DeathAge`);
        if (!String(data[`${parent}DeathReason`] ?? "").trim())
          add(`motivo do falecimento ${who}`, `${parent}DeathReason`);
      }
    }
    if (
      !beneficiaries.length ||
      beneficiaries.some(
        b =>
          !b.name ||
          !b.relationship ||
          !b.birthDate ||
          String(b.percentage ?? "").trim() === ""
      )
    )
      add("beneficiário completo", "beneficiaries");
    else if (
      Math.abs(
        beneficiaries.reduce((sum, b) => sum + Number(b.percentage || 0), 0) -
          100
      ) > 0.001
    )
      add(
        "percentuais dos beneficiários devem somar exatamente 100%",
        "beneficiaries"
      );
    for (const item of missing) {
      for (const id of item.ids) {
        const el = $(id);
        if (!el) continue;
        const target = el.closest("label") || el;
        target.classList.add(
          target.tagName === "LABEL" ? "field-error" : "section-error"
        );
      }
    }
    if (missing.length) {
      const first = missing[0],
        el = $(first.ids[0]),
        section = el?.closest(".section");
      if (section) showStep(sections.indexOf(section));
      notice(
        `Conclua o campo: ${first.label}.${missing.length > 1 ? ` Há mais ${missing.length - 1} campo(s) obrigatório(s) destacado(s) em vermelho.` : ""}`,
        true
      );
      el?.focus();
      return false;
    }
    return true;
  }
  async function edit(row = {}) {
    try {
      if (row.id) row = await api("agent.getApplication", { id: row.id });
      if (
        row.personalWeeklyExpenses == null &&
        row.personalMonthlyExpenses != null
      )
        row.personalWeeklyExpenses =
          Number(row.personalMonthlyExpenses || 0) / 4.333333;
      if (row.weeklyFixedExpenses == null && row.monthlyFixedExpenses != null)
        row.weeklyFixedExpenses =
          Number(row.monthlyFixedExpenses || 0) / 4.333333;
      if (!row.bornInUSA && row.birthCountry) {
        row.bornInUSA =
          String(row.birthCountry).toUpperCase() === "USA" ? "Sim" : "Não";
      }
      const oldHeight = String(row.height || "").match(/^(\d+)'-(\d+)"/);
      if (!row.heightUnit && oldHeight) {
        row.heightUnit = "ft";
        row.heightFeet = oldHeight[1];
        row.heightInches = oldHeight[2];
      } else if (!row.heightUnit && row.height) {
        row.heightUnit = "cm";
        row.heightCm = row.height;
      }
      $("form-card").classList.remove("hidden");
      $("form-title").textContent = row.id
        ? "Alterar aplicação"
        : "Nova aplicação";
      $("id").value = row.id || "";
      inputs.forEach(e => (e.value = row[e.id] ?? (e.id === "ssn" ? "0" : "")));
      applyFieldFormats();
      beneficiaries = Array.isArray(row.beneficiaries)
        ? row.beneficiaries
        : [
            {
              name: row.beneficiaryName || "",
              relationship: row.beneficiaryRelationship || "",
              birthDate: "",
              percentage: row.beneficiaryPercentage || 100,
            },
          ];
      contacts = Array.isArray(row.contacts) ? row.contacts : [];
      attachments = Array.isArray(row.attachments) ? row.attachments : [];
      showAttachments();
      renderRepeats();
      updateParents();
      updateDriver();
      updateHealth();
      updateDoctor();
      updateInsurance();
      updateHeight();
      updateBirthPlace();
      showStep(0);
    } catch (e) {
      notice(e.message, true);
    }
  }
  function americanMeasurements(row) {
    let height = "";
    const unit = String(row.heightUnit || "").toLowerCase(),
      legacy = String(row.height || "").match(/^(\d+)'[- ]?(\d+)?(?:\")?$/);
    if (unit === "cm" || (!unit && centimeters(row.heightCm) > 0)) {
      const cm = centimeters(row.heightCm || row.height || 0),
        inches = Math.round(cm / 2.54);
      if (inches > 0) height = `${Math.floor(inches / 12)}'-${inches % 12}"`;
    } else if (Number(row.heightFeet) > 0) {
      height = `${Math.round(Number(row.heightFeet))}'-${Math.round(Number(row.heightInches) || 0)}"`;
    } else if (legacy) {
      height = `${legacy[1]}'-${legacy[2] || 0}"`;
    } else if (Number(row.height) > 0) {
      height = `${Math.round(Number(row.height))}'-${Math.round(Number(row.heightInches) || 0)}"`;
    }
    const weightValue = Number(row.weight || 0),
      weight =
        weightValue > 0
          ? `${(String(row.weightUnit || "").toLowerCase() === "kg" ? weightValue * 2.2046226218 : weightValue).toFixed(1).replace(/\.0$/, "")} lb`
          : "";
    return { height, weight };
  }
  async function makePdf(row, w = open("", "_blank")) {
    if (!w) return notice("Permita pop-ups para gerar o PDF.", true);
    const showPdfProgress = message => {
      try {
        w.document.title = "Gerando PDF…";
        const status = w.document.getElementById("pdf-generation-status");
        if (status) status.textContent = message;
      } catch {}
    };
    try {
      w.focus();
    } catch {}
    let session = {};
    try {
      session = JSON.parse(localStorage.getItem("agentSession") || "{}");
    } catch {}
    const measurements = americanMeasurements(row),
      americanHeight = measurements.height,
      americanWeight = measurements.weight;
    const value = v => (v == null || v === "" ? "Não informado" : v),
      table = items =>
        `<table>${items.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(value(v))}</td></tr>`).join("")}</table>`,
      section = (title, items) => `<h2>${esc(title)}</h2>${table(items)}`,
      beneficiaries = (row.beneficiaries || []).map((b, i) => [
        `Beneficiário ${i + 1}`,
        `${b.name} · ${b.relationship} · ${usDate(b.birthDate)} · ${b.percentage}%`,
      ]),
      contacts = (row.contacts || []).map((c, i) => [
        `Contato ${i + 1}`,
        `${c.name} · ${c.relationship} · ${c.phone}`,
      ]);
    let storedPdfPages = "";
    try {
      showPdfProgress("Preparando os documentos anexados…");
      storedPdfPages = await pdfStoredDocumentImages(row.id, row.attachments);
    } catch (error) {
      console.error("Falha ao incluir documento PDF", error);
      storedPdfPages = `<section class="document-page"><h2>Documento anexado</h2><p>O documento está salvo com segurança, mas não pôde ser convertido nesta tentativa: ${esc(error?.message || "erro desconhecido")}</p></section>`;
    }
    const html =
      section("1. Proposta e apólice", [
        ["Produto", row.productInterest],
        ["Cobertura pretendida", usd(row.coverageRequested)],
        ["Premium pretendido", usd(row.premiumBudget)],
        ["Seguro existente", row.existingInsurance],
        ["Seguradora", row.existingInsuranceCompany],
        ["Cobertura existente", usd(row.existingCoverage)],
        ["Benefícios em vida existentes", row.existingLivingBenefits],
        ["Observações do agente", row.notes],
      ]) +
      section("2. Dados pessoais", [
        ["Nome", row.clientName],
        ["Nascimento", usDate(row.birthDate)],
        ["Sexo", row.gender],
        ["Estado civil", row.maritalStatus],
        ["E-mail", row.clientEmail],
        ["Telefone", row.clientPhone],
        [
          "Endereço",
          `${value(row.address)}, ${value(row.city)} - ${value(row.state)} ${value(row.zipCode)}`,
        ],
        [
          "Local de nascimento",
          row.bornInUSA === "Sim"
            ? "USA · " + value(row.birthState)
            : row.birthCountry,
        ],
        ["SSN/ITIN", row.ssn],
        ["Passaporte", row.passportNumber],
        ["Driver americana", row.driverHasLicense],
        [
          "Número / Estado da Driver",
          `${value(row.driverLicenseNumber)} / ${value(row.driverLicenseState)}`,
        ],
        [
          "Altura / Peso",
          `${value(americanHeight)} / ${value(americanWeight)}`,
        ],
      ]) +
      section("3. Profissional, financeiro e bancário", [
        ["Empresa", row.employer],
        ["Área profissional", row.industry],
        ["Ocupação", row.occupation],
        ["Tempo de trabalho", row.employmentLength],
        ["Renda pessoal anual", annualUsd(row.personalWeeklyIncome, 52)],
        [
          "Despesas pessoais anuais",
          annualUsd(
            row.personalWeeklyExpenses != null
              ? row.personalWeeklyExpenses
              : row.personalMonthlyExpenses,
            row.personalWeeklyExpenses != null ? 52 : 12
          ),
        ],
        ["Renda familiar anual", annualUsd(row.weeklyIncome, 52)],
        [
          "Despesas familiares anuais",
          annualUsd(
            row.weeklyFixedExpenses != null
              ? row.weeklyFixedExpenses
              : row.monthlyFixedExpenses,
            row.weeklyFixedExpenses != null ? 52 : 12
          ),
        ],
        ["Pessoas na residência", row.householdSize],
        ["Nome do banco", row.bankName],
        ["Routing number", row.routingNumber],
        ["Account number", row.accountNumber],
      ]) +
      section("4. Informações médicas", [
        ["Consultou médico nos EUA", row.seenDoctor],
        ["Mês/ano aproximado da consulta", row.lastDoctorVisit],
        ["Médico, clínica ou hospital", row.physicianName],
        ["Fumo", row.tobacco],
        ["Doença ou diagnóstico", row.hasMedicalCondition],
        ["Detalhes médicos", row.medicalDetails],
        ["Medicamentos", row.usesMedication],
        ["Quais medicamentos", row.medications],
        [
          "Pai",
          row.fatherLiving === "Sim"
            ? `Vivo, ${value(row.fatherAge)} anos`
            : `Falecido aos ${value(row.fatherDeathAge)} · ${value(row.fatherDeathReason)}`,
        ],
        [
          "Mãe",
          row.motherLiving === "Sim"
            ? `Viva, ${value(row.motherAge)} anos`
            : `Falecida aos ${value(row.motherDeathAge)} · ${value(row.motherDeathReason)}`,
        ],
      ]) +
      section("5. Beneficiários", beneficiaries) +
      (contacts.length ? section("6. Contatos de emergência", contacts) : "") +
      pdfDocumentImages(row.attachments) +
      storedPdfPages;
    w.document.open();
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>Ficha cadastral — ${esc(row.clientName)}</title><style>body{font:12px Arial;margin:34px;color:#111}header{border-bottom:3px solid #d8b22f;margin-bottom:20px;padding-bottom:12px}h1{color:#17345c;margin:0}h2{color:#17345c;margin:22px 0 7px;page-break-after:avoid}table{width:100%;border-collapse:collapse;page-break-inside:avoid}th,td{border:1px solid #bbb;padding:7px;text-align:left;vertical-align:top}th{width:34%;background:#eef2f6}.document-page{page-break-before:always;text-align:center}.document-page img{max-width:100%;max-height:900px;object-fit:contain}footer{margin-top:24px;border-top:1px solid #bbb;padding-top:10px}.pdf-actions{position:sticky;bottom:10px;text-align:right}.pdf-actions button{background:#d8b22f;border:0;border-radius:8px;padding:12px 18px;font-weight:700}@media print{.pdf-actions{display:none}}</style><header><h1>Affinity Financial Consulting — Ficha cadastral</h1><p>Cliente: <b>${esc(row.clientName)}</b></p></header>${html}<footer>Agente responsável: <b>${esc(session.name || session.agentName || "Não informado")}</b></footer><div class="pdf-actions"><button onclick="window.print()">Salvar como PDF</button></div>`
    );
    w.document.close();
    // Printing on a fixed timer could run before large passport pages had been
    // decoded. Chrome would then finish only after the user changed tabs and
    // the document images could be absent from the saved PDF.
    try {
      w.focus();
      const images = Array.from(w.document.images || []);
      await Promise.race([
        Promise.all(images.map(image => {
          if (typeof image.decode === "function") return image.decode().catch(() => {});
          if (image.complete) return Promise.resolve();
          return new Promise(resolve => {
            image.onload = resolve;
            image.onerror = resolve;
          });
        })),
        new Promise(resolve => setTimeout(resolve, 20000)),
      ]);
      await new Promise(resolve => w.requestAnimationFrame(() => w.requestAnimationFrame(resolve)));
      w.focus();
      w.print();
    } catch (error) {
      console.error("Falha ao abrir impressão automática", error);
      notice("O PDF está pronto na nova aba. Clique em ‘Salvar como PDF’.");
    }
  }
  function dataUriBytes(uri) {
    const encoded = String(uri || "").split(",", 2)[1] || "";
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  async function downloadApplicationPdf(row) {
    if (!window.PDFLib?.PDFDocument) throw new Error("O gerador de PDF não carregou. Atualize a página e tente novamente.");
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdfText = value => String(value == null ? "" : value)
      .replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ").replace(/\s+/g, " ").trim();
    const pdfDocument = await PDFDocument.create();
    const regular = await pdfDocument.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    const pageSize = [612, 792], margin = 42, width = pageSize[0] - margin * 2;
    let page, y;
    const addPage = () => {
      page = pdfDocument.addPage(pageSize);
      y = 750;
      page.drawText("Affinity Financial Consulting - Ficha cadastral", { x: margin, y, size: 16, font: bold, color: rgb(0.09, 0.2, 0.36) });
      y -= 25;
      page.drawText(pdfText(`Cliente: ${row.clientName || "Não informado"}`), { x: margin, y, size: 10, font: bold });
      y -= 26;
    };
    const wrap = (text, font, size, maxWidth) => {
      const words = pdfText(text == null || text === "" ? "Não informado" : text).split(" ");
      const lines = [];
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
        else { lines.push(line); line = word; }
      }
      if (line) lines.push(line);
      return lines;
    };
    const ensure = needed => { if (!page || y < needed + 42) addPage(); };
    const drawSection = (title, items) => {
      ensure(55);
      page.drawText(pdfText(title), { x: margin, y, size: 12, font: bold, color: rgb(0.09, 0.2, 0.36) });
      y -= 18;
      for (const [label, raw] of items) {
        const value = raw == null || raw === "" ? "Não informado" : String(raw);
        const lines = wrap(value, regular, 9, width - 155);
        ensure(Math.max(22, lines.length * 12 + 8));
        page.drawText(pdfText(label), { x: margin, y, size: 9, font: bold });
        lines.forEach((line, index) => page.drawText(line, { x: margin + 155, y: y - index * 12, size: 9, font: regular }));
        y -= Math.max(20, lines.length * 12 + 6);
        page.drawLine({ start: { x: margin, y: y + 7 }, end: { x: margin + width, y: y + 7 }, thickness: 0.35, color: rgb(0.8, 0.82, 0.84) });
      }
      y -= 8;
    };
    const sectionBlock = (title, items) => {
      if (!page) addPage();
      drawSection(title, items);
    };
    const ageFromBirthDate = input => {
      const match = String(input || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) return "Não informado";
      const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
      return age >= 0 ? `${age} anos` : "Não informado";
    };
    const parentDescription = (parent, feminine = false) => {
      const living = String(row[`${parent}Living`] || "");
      if (living === "Sim") return `${feminine ? "Viva" : "Vivo"}, ${row[`${parent}Age`] || "idade não informada"} anos`;
      if (living === "Não") return `${feminine ? "Falecida" : "Falecido"} aos ${row[`${parent}DeathAge`] || "idade não informada"} anos - ${row[`${parent}DeathReason`] || "motivo não informado"}`;
      return "Não informado";
    };
    const measurements = americanMeasurements(row);
    sectionBlock("1. Produto e objetivo da aplicação", [
      ["Produto pretendido", row.productInterest],
      ["Cobertura pretendida", usd(row.coverageRequested)],
      ["Motivo / objetivo da aplicação", row.applicationReason],
      ["Observações do agente", row.notes],
    ]);
    sectionBlock("2. Agent Report - seguro de vida anterior", [
      ["Já possui ou possuiu seguro de vida?", row.existingInsurance || "Não informado"],
      ["Companhia da apólice anterior", row.existingInsurance === "Sim" ? row.existingInsuranceCompany : "Não se aplica"],
      ["Valor da cobertura anterior", row.existingInsurance === "Sim" ? usd(row.existingCoverage) : "Não se aplica"],
      ["Riders / benefícios acelerados ou em vida", row.existingInsurance === "Sim" ? row.existingLivingBenefits : "Não se aplica"],
    ]);
    sectionBlock("3. Informações do cliente", [
      ["Nome completo", row.clientName],
      ["Data de nascimento", usDate(row.birthDate)],
      ["Idade", ageFromBirthDate(row.birthDate)],
      ["Sexo", row.gender],
      ["Estado civil", row.maritalStatus],
      ["Cidadania / país de nascimento", row.bornInUSA === "Sim" ? `Estados Unidos - ${row.birthState || "estado não informado"}` : row.birthCountry ? `${row.birthCountry} - cidadania estrangeira` : "Não informado"],
      ["Endereço completo", [row.address, row.city, row.state, row.zipCode].filter(Boolean).join(", ")],
      ["Telefone", row.clientPhone],
      ["E-mail", row.clientEmail],
      ["Altura / Peso", `${measurements.height || "Não informado"} / ${measurements.weight || "Não informado"}`],
      ["SSN / ITIN", row.ssn || "0 - não possui número informado"],
      ["Passaporte", row.passportNumber],
      ["Possui Driver's License americana?", row.driverHasLicense],
      ["Número / Estado da Driver's License", row.driverHasLicense === "Sim" ? `${row.driverLicenseNumber || "Não informado"} / ${row.driverLicenseState || "Não informado"}` : "Não se aplica"],
      ["Empresa", row.employer],
      ["Área / indústria", row.industry],
      ["Cargo / ocupação", row.occupation],
      ["Tempo de trabalho", row.employmentLength],
      ["Renda pessoal anual", annualUsd(row.personalWeeklyIncome, 52)],
      ["Despesas pessoais anuais", annualUsd(row.personalWeeklyExpenses ?? row.personalMonthlyExpenses, row.personalWeeklyExpenses != null ? 52 : 12)],
      ["Renda familiar anual", annualUsd(row.weeklyIncome, 52)],
      ["Despesas familiares anuais", annualUsd(row.weeklyFixedExpenses ?? row.monthlyFixedExpenses, row.weeklyFixedExpenses != null ? 52 : 12)],
      ["Quantidade de pessoas na residência", row.householdSize],
    ]);
    const beneficiaryRows = [];
    (row.beneficiaries || []).forEach((item, index) => {
      beneficiaryRows.push([`Beneficiário ${index + 1} - grau de parentesco`, item.relationship]);
      beneficiaryRows.push([`Beneficiário ${index + 1} - nome completo`, item.name]);
      beneficiaryRows.push([`Beneficiário ${index + 1} - data de nascimento`, usDate(item.birthDate)]);
      beneficiaryRows.push([`Beneficiário ${index + 1} - porcentagem`, `${item.percentage || 0}%`]);
    });
    sectionBlock("4. Dados dos beneficiários", beneficiaryRows.length ? beneficiaryRows : [["Beneficiários", "Não informado"]]);
    sectionBlock("5. Premium anual", [
      ["Premium mensal", usd(row.premiumBudget)],
      ["Premium anual", annualUsd(row.premiumBudget, 12)],
    ]);
    sectionBlock("6. Informações dos pais", [
      ["Pai", parentDescription("father")],
      ["Mãe", parentDescription("mother", true)],
    ]);
    sectionBlock("7. Informações médicas", [
      ["Consultou médico nos EUA", row.seenDoctor], ["Mês/ano aproximado", row.lastDoctorVisit], ["Médico, clínica ou hospital", row.physicianName],
      ["Fumo", row.tobacco], ["Doença ou diagnóstico", row.hasMedicalCondition], ["Detalhes médicos", row.medicalDetails],
      ["Medicamentos", row.usesMedication], ["Quais medicamentos", row.medications],
    ]);
    sectionBlock("8. Dados de pagamento", [
      ["Nome do banco", row.bankName],
      ["Routing number", row.routingNumber],
      ["Account number", row.accountNumber],
    ]);
    const additionalRows = [];
    (row.contacts || []).forEach((item, index) => {
      additionalRows.push([`Contato de emergência ${index + 1}`, `${item.name || ""} - ${item.relationship || ""} - ${item.phone || ""}`]);
    });
    if (additionalRows.length) sectionBlock("9. Informações adicionais", additionalRows);

    const attachments = Array.isArray(row.attachments) ? row.attachments : [];
    for (const item of attachments) {
      try {
        if (item.type === "application/pdf" && item.storageKey) {
          const file = await api("agent.getApplicationDocument", { applicationId: row.id, storageKey: item.storageKey });
          const source = await PDFDocument.load(dataUriBytes(file.data), { ignoreEncryption: true });
          const pages = await pdfDocument.copyPages(source, source.getPageIndices());
          pages.forEach(copied => pdfDocument.addPage(copied));
        } else if (String(item.data || "").startsWith("data:image/")) {
          const bytes = dataUriBytes(item.data);
          const image = String(item.type || "").includes("png") ? await pdfDocument.embedPng(bytes) : await pdfDocument.embedJpg(bytes);
          const imagePage = pdfDocument.addPage(pageSize);
          const scaled = image.scale(Math.min((pageSize[0] - 60) / image.width, (pageSize[1] - 80) / image.height));
          imagePage.drawText(pdfText(`${item.category || "Documento"} - ${item.name || "Arquivo"}`), { x: 30, y: 760, size: 10, font: bold });
          imagePage.drawImage(image, { x: (pageSize[0] - scaled.width) / 2, y: (pageSize[1] - scaled.height) / 2 - 10, width: scaled.width, height: scaled.height });
        }
      } catch (error) {
        console.error("Falha ao incorporar documento", item?.name, error);
        throw new Error(`Não foi possível incluir o documento ${item?.name || "anexado"}. Tente novamente.`);
      }
    }
    const generatedPages = pdfDocument.getPages();
    generatedPages.forEach((currentPage, index) => {
      currentPage.drawText(`Página ${index + 1} de ${generatedPages.length}`, { x: 485, y: 22, size: 8, font: regular, color: rgb(0.4, 0.43, 0.47) });
    });
    const bytes = await pdfDocument.save({ useObjectStreams: true });
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Ficha cadastral - ${String(row.clientName || "cliente").replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    notice("PDF gerado e baixado com todos os documentos anexados.");
  }
  function showShare(row) {
    const link = `${location.origin}/preencher-aplicacao.html?id=${row.id}&token=${row.clientToken}`,
      first = String(row.clientName || "cliente").split(/\s+/)[0],
      message = `Olá, ${first}! Para continuarmos sua aplicação com segurança, abra o link privado abaixo. Você poderá continuar de onde paramos.\n\n${link}\n\nSe tiver alguma dúvida, estou à disposição.`;
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#000b;z-index:9999;display:grid;place-items:center;padding:20px";
    overlay.innerHTML = `<div class="card" style="width:min(650px,100%);padding:24px"><h2>Mensagem pronta para enviar</h2><p class="muted">Envie diretamente pelo WhatsApp ou pelo e-mail configurado no portal.</p><textarea id="share-message" style="width:100%;min-height:210px">${esc(message)}</textarea><div class="actions"><button type="button" data-close>Fechar</button><button type="button" data-copy>Copiar mensagem</button><button type="button" data-whatsapp>Enviar pelo WhatsApp</button><button type="button" class="primary" data-email>Enviar por e-mail</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("[data-close]").onclick = () => overlay.remove();
    overlay.querySelector("[data-copy]").onclick = async () => {
      const area = overlay.querySelector("#share-message");
      try {
        await navigator.clipboard.writeText(area.value);
      } catch {
        area.select();
        document.execCommand("copy");
      }
      notice("Mensagem e link privado copiados.");
      overlay.remove();
    };
    wireDirectShare(overlay, row, {
      textarea: "#share-message",
      subject: "Link privado para continuar sua aplicação",
    });
  }
  function showReviewShare(invite, row = {}) {
    const first = String(row?.clientName || "cliente").split(/\s+/)[0],
      message = `Olá, ${first}! Agradecemos pela confiança em nosso atendimento. Sua opinião é muito importante para nós.\n\nDeixe sua avaliação pelo link privado abaixo:\n${invite.link}\n\nMuito obrigado por compartilhar sua experiência! 💙`;
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#000b;z-index:9999;display:grid;place-items:center;padding:20px";
    overlay.innerHTML = `<div class="card" style="width:min(650px,100%);padding:24px"><h2>Link da avaliação pronto</h2><p class="muted">Envie diretamente pelo WhatsApp ou pelo e-mail configurado no portal.</p><textarea id="review-share-message" style="width:100%;min-height:230px">${esc(message)}</textarea><div class="actions"><button type="button" data-close>Fechar</button><button type="button" data-copy>Copiar mensagem</button><button type="button" data-whatsapp>Enviar pelo WhatsApp</button><button type="button" class="primary" data-email>Enviar por e-mail</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("[data-close]").onclick = () => overlay.remove();
    overlay.querySelector("[data-copy]").onclick = async () => {
      const area = overlay.querySelector("#review-share-message");
      try {
        await navigator.clipboard.writeText(area.value);
      } catch {
        area.select();
        document.execCommand("copy");
      }
      notice("Mensagem da avaliação copiada.");
      overlay.remove();
    };
    wireDirectShare(overlay, row, {
      textarea: "#review-share-message",
      subject: "Conte como foi seu atendimento na Affinity Financial",
    });
  }
  function whatsappNumber(value) {
    let number = digits(value);
    if (number.length === 10) number = `1${number}`;
    return number;
  }
  function wireDirectShare(overlay, row, options) {
    const area = overlay.querySelector(options.textarea);
    const whatsapp = overlay.querySelector("[data-whatsapp]");
    const email = overlay.querySelector("[data-email]");
    whatsapp.onclick = () => {
      const number = whatsappNumber(row.clientPhone);
      if (!number) {
        notice("Cadastre o telefone da cliente antes de enviar pelo WhatsApp.", true);
        return;
      }
      location.href = `whatsapp://send?phone=${number}&text=${encodeURIComponent(area.value)}`;
    };
    email.onclick = async () => {
      const recipient = String(row.clientEmail || "").trim();
      if (!recipient) {
        notice("Cadastre o e-mail da cliente antes de enviar.", true);
        return;
      }
      if (!confirm(`Confirmar o envio deste e-mail para ${recipient}?`)) return;
      const original = email.textContent;
      email.disabled = true;
      email.textContent = "Enviando…";
      try {
        await api(
          "agent.sendApplicationEmail",
          {
            applicationId: Number(row.id),
            subject: options.subject,
            body: area.value,
          },
          true
        );
        notice(`E-mail enviado para ${recipient} e registrado no histórico.`);
        overlay.remove();
      } catch (error) {
        notice(error.message, true);
        email.disabled = false;
        email.textContent = original;
      }
    };
  }
  new MutationObserver(() => {
    document.querySelectorAll("#list .application").forEach(card => {
      const id = Number(card.querySelector("[data-edit]")?.dataset.edit),
        row = rows.find(x => x.id === id),
        actions = card.querySelector(".actions");
      if (!row || actions?.querySelector("[data-review-share]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.reviewShare = String(id);
      button.textContent = "Link da avaliação";
      button.onclick = async () => {
        try {
          const invite = row.reviewToken
            ? {
                link: `${location.origin}/avaliacao-convite.html?token=${row.reviewToken}`,
              }
            : await api(
                "agent.createReviewInvite",
                { applicationId: id },
                true
              );
          if (invite.token) row.reviewToken = invite.token;
          showReviewShare(invite, row);
        } catch (error) {
          notice(error.message, true);
        }
      };
      actions.appendChild(button);
    });
  }).observe($("list"), { childList: true, subtree: true });
  function render() {
    const data = rows.filter(r =>
      tab === "completed" ? r.status === "completed" : r.status !== "completed"
    );
    $("list").innerHTML = data.length
      ? data
          .map(
            r =>
              `<article class="application"><div class="toolbar"><div><strong>${esc(r.clientName)}</strong><div class="muted">${esc(r.clientEmail || r.clientPhone || "Sem contato")}</div></div><span class="pill">${r.status === "draft" ? "Rascunho" : r.status === "submitted" ? "Submetida" : "Concluída"}</span></div>${r.policyNumber ? `<p>Apólice <b>${esc(r.policyNumber)}</b> · ${esc(r.product || "")}</p>` : ""}<div class="actions"><button data-edit="${r.id}">Alterar</button><button data-pdf="${r.id}">Gerar PDF</button>${r.clientToken ? `<button data-share="${r.id}">Link privado do cliente</button>` : ""}<button data-delete-request="${r.id}" ${Number(r.deletionPending) ? "disabled" : ""}>${Number(r.deletionPending) ? "Exclusão aguardando análise" : "Excluir ou solicitar exclusão"}</button>${r.status === "draft" ? `<button class="primary" data-submit="${r.id}">Marcar como submetida</button>` : ""}</div></article>`
          )
          .join("")
      : '<div class="empty">Nenhuma aplicação nesta categoria.</div>';
    document
      .querySelectorAll("[data-edit]")
      .forEach(
        b => (b.onclick = () => edit(rows.find(r => r.id === +b.dataset.edit)))
      );
    document.querySelectorAll("[data-pdf]").forEach(b => {
      b.onclick = async () => {
        const originalText = b.textContent;
        b.disabled = true;
        b.textContent = "Gerando PDF…";
        try {
          const application = await api("agent.getApplication", {
            id: +b.dataset.pdf,
          });
          await downloadApplicationPdf(application);
        } catch (error) {
          notice(error.message || "Não foi possível gerar o PDF.", true);
        } finally {
          b.disabled = false;
          b.textContent = originalText;
        }
      };
    });
    document
      .querySelectorAll("[data-share]")
      .forEach(
        b =>
          (b.onclick = () =>
            showShare(rows.find(x => x.id === +b.dataset.share)))
      );
    document.querySelectorAll("[data-delete-request]").forEach(
      b =>
        (b.onclick = async () => {
          const reason = prompt("Informe o motivo da exclusão:");
          if (reason === null) return;
          if (reason.trim().length < 5)
            return notice(
              "Informe um motivo com pelo menos 5 caracteres.",
              true
            );
          try {
            const result = await api(
              "agent.requestApplicationDeletion",
              { id: +b.dataset.deleteRequest, reason: reason.trim() },
              true
            );
            notice(
              result.deleted
                ? "Aplicação excluída."
                : "Solicitação enviada. A aplicação continuará salva até a decisão do administrador."
            );
            await load();
          } catch (e) {
            notice(e.message, true);
          }
        })
    );
    document.querySelectorAll("[data-submit]").forEach(
      b =>
        (b.onclick = async () => {
          try {
            await edit(rows.find(r => r.id === +b.dataset.submit));
            if (!validateForCompletion()) return;
            await api(
              "agent.submitApplication",
              { id: +b.dataset.submit },
              true
            );
            $("form-card").classList.add("hidden");
            await load();
          } catch (e) {
            notice(e.message, true);
          }
        })
    );
  }
  async function load() {
    try {
      rows = await api("agent.listApplications");
      render();
    } catch (e) {
      if (/agente|acesso/i.test(e.message)) location.href = "/agentes/login";
      else notice(e.message, true);
    }
  }
  async function saveDraft(silent = false) {
    try {
      const result = await api("agent.saveApplication", collect(), true);
      $("id").value = result.id;
      if (!silent) {
        notice("Rascunho salvo com segurança.");
        await load();
      }
      return true;
    } catch (e) {
      if (!silent) notice(e.message, true);
      return false;
    }
  }
  $("new").onclick = () => edit();
  $("cancel").onclick = () => $("form-card").classList.add("hidden");
  inputs.forEach(el => {
    const clear = () => {
      el.closest("label")?.classList.remove("field-error");
      el.classList.remove("section-error");
    };
    el.addEventListener("input", clear);
    el.addEventListener("change", clear);
  });
  $("clientPhone").addEventListener(
    "input",
    e => (e.target.value = formatPhone(e.target.value))
  );
  $("ssn").addEventListener(
    "input",
    e => (e.target.value = formatSsn(e.target.value))
  );
  for (const id of ["passportNumber", "driverLicenseNumber"])
    $(id).addEventListener(
      "input",
      e => (e.target.value = upper(e.target.value))
    );
  $("form").onsubmit = async e => {
    e.preventDefault();
    if (!validateForCompletion()) return;
    if (!(await saveDraft(false))) {
      return;
    }
    try {
      await api("agent.submitApplication", { id: +$("id").value }, true);
      const completed = await api("agent.getApplication", {
        id: +$("id").value,
      });
      await downloadApplicationPdf(completed);
      $("form-card").classList.add("hidden");
      await load();
      notice(
        "Aplicação concluída e PDF gerado. O link da avaliação também foi criado."
      );
    } catch (error) {
      notice(error.message, true);
    }
  };
  document.querySelectorAll("[data-tab]").forEach(
    b =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        document
          .querySelectorAll("[data-tab]")
          .forEach(x => x.classList.toggle("active", x === b));
        render();
      })
  );
  showStep(0);
  load();
})();
