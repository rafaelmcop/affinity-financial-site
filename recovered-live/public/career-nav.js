(()=>{
  const labels={pt:'Trabalhe conosco',en:'Careers',es:'Trabaja con nosotros'};
  function language(){const value=localStorage.getItem('affinity-language');return value==='en'||value==='es'?value:'pt'}
  function install(){
    const contacts=[...document.querySelectorAll('nav a[href="#contact"],nav button')].filter(element=>element.getAttribute('href')==='#contact'||['Contato','Contact','Contacto'].includes(element.textContent.trim()));
    contacts.forEach(contact=>{
      if(contact.nextElementSibling?.matches('[data-career-nav]'))return;
      const link=document.createElement('a');
      link.href='/trabalhe-conosco.html';link.dataset.careerNav='true';link.textContent=labels[language()];link.className=contact.className;
      contact.insertAdjacentElement('afterend',link);
    });
    document.querySelectorAll('[data-career-nav]').forEach(link=>link.textContent=labels[language()]);
  }
  install();
  const observer=new MutationObserver(install);observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('storage',()=>{const link=document.querySelector('[data-career-nav]');if(link)link.textContent=labels[language()]});
})();
