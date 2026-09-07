const existing = globalThis.XLSX;

if (!existing) {
  await new Promise((resolve, reject) => {
    const loaded = document.querySelector('script[data-affinity-xlsx="true"]');
    if (loaded) {
      if (globalThis.XLSX) resolve();
      else {
        loaded.addEventListener("load", resolve, { once: true });
        loaded.addEventListener("error", reject, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "/vendor/xlsx.full.min.js?v=0.18.5";
    script.async = true;
    script.dataset.affinityXlsx = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Não foi possível carregar o leitor de Excel")), { once: true });
    document.head.appendChild(script);
  });
}

const XLSX = globalThis.XLSX;
if (!XLSX) throw new Error("O leitor de Excel não foi inicializado");

export const read = XLSX.read;
export const utils = XLSX.utils;
export const version = XLSX.version;
export default XLSX;
