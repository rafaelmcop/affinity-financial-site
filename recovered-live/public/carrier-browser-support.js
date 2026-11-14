(() => {
 const agent = navigator.userAgent;
 const mobile = /Android|iPhone|iPad|iPod/i.test(agent)
  || (/Mac/i.test(navigator.platform) && navigator.maxTouchPoints > 1);
 const safari = /Version\/[\d.]+.*Safari\//.test(agent)
  && !/(?:CriOS|FxiOS|EdgiOS|OPiOS)\//.test(agent);
 const desktop = !mobile && /(?:Chrome|Edg)\//.test(agent)
  && !/(?:OPR|Opera|YaBrowser)\//.test(agent);
 const root = document.documentElement;
 const carriers = ['five-rings', 'national-life'];
 const initialDisplay = new Map();

 function update() {
  for (const carrier of carriers) {
   const ready = safari && root.hasAttribute('data-affinity-' + carrier + '-ready');
   for (const control of document.querySelectorAll('[data-carrier-sync="' + carrier + '"]')) {
    if (!initialDisplay.has(control)) initialDisplay.set(control, control.style.display);
    control.style.display = desktop || ready ? initialDisplay.get(control) : 'none';
   }
   const name = carrier === 'five-rings' ? 'Five Rings' : 'National Life';
   for (const notice of document.querySelectorAll('[data-carrier-browser-notice="' + carrier + '"]')) {
    notice.hidden = desktop || ready;
    notice.textContent = safari
     ? 'Para sincronizar ' + name + ' no Safari, instale o piloto pelo TestFlight e habilite a extensão para o portal. O piloto ainda não está disponível para instalação pública.'
     : mobile
      ? 'Para sincronizar ' + name + ' no iPad ou iPhone, abra o portal no Safari com o conector piloto. No Chrome móvel você pode consultar os dados já sincronizados.'
      : 'Abra o portal no Google Chrome do computador para instalar o conector e sincronizar.';
   }
  }
  for (const control of document.querySelectorAll('[data-carrier-desktop]')) {
   if (!desktop) control.style.display = 'none';
  }
 }
 window.affinityCarrierDesktopSupported = desktop;
 update();
 if (safari) new MutationObserver(update).observe(root,{
  attributes:true,attributeFilter:carriers.map(carrier=>'data-affinity-'+carrier+'-ready')
 });
})();
