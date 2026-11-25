(() => {
 function mount() {
  const nav = document.querySelector('.public-site-nav');
  const row = nav?.querySelector('.public-nav-row');
  if (!row) return false;
  const brand = row.querySelector('.public-nav-brand');
  const links = row.querySelector('.public-nav-links');
  const actions = row.querySelector('.public-nav-actions');
  let scheduled = false;
  function measure() {
   scheduled = false;
   const available = row.getBoundingClientRect().width;
   const required = brand.getBoundingClientRect().width + links.scrollWidth + actions.getBoundingClientRect().width + 32;
   const compact = innerWidth < 1280 || required > available;
   const value = String(compact);
   if (nav.dataset.compact !== value) nav.dataset.compact = value;
  }
  function schedule() {
   if (!scheduled) { scheduled = true; requestAnimationFrame(measure); }
  }
  const observer = new ResizeObserver(schedule);
  for (const target of [row,brand,links,actions]) observer.observe(target);
  window.addEventListener('resize', schedule);
  document.fonts?.ready.then(schedule);
  measure();
  return true;
 }
 if (mount()) return;
 const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
 observer.observe(document.body, {childList:true,subtree:true});
})();
