(() => {
 const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (/Mac/i.test(navigator.platform) && navigator.maxTouchPoints > 1);
 const desktopSupported = !mobile && /(?:Chrome|Edg)\//.test(navigator.userAgent)
  && !/(?:OPR|Opera|YaBrowser)\//.test(navigator.userAgent);
 window.affinityCarrierDesktopSupported = desktopSupported;
 for (const control of document.querySelectorAll('[data-carrier-desktop]')) {
  if (!desktopSupported) {
   control.hidden = true;
   control.style.display = 'none';
  }
 }
 for (const notice of document.querySelectorAll('[data-carrier-browser-notice]')) {
  if (desktopSupported) continue;
  notice.hidden = false;
  notice.textContent = mobile
   ? 'Use o Chrome neste aparelho para acessar o portal e consultar os dados já sincronizados. Para atualizar Five Rings ou National Life, abra Integrações no Chrome de um computador.'
   : 'Abra este portal no Google Chrome do computador para instalar o conector e sincronizar.';
 }
})();
