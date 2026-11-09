(() => {
  let scheduled = false;
  const labels = { pt: 'Deixe sua avaliação', en: 'Leave your review', es: 'Deja tu reseña' };
  function organize() {
    scheduled = false;
    const testimonials = document.getElementById('testimonials');
    const reviews = document.getElementById('reviews');
    if (!testimonials) return;
    const original = testimonials.querySelector('a[href="/avaliar"]');
    if (original?.parentElement) original.parentElement.style.display = 'none';
    if (!reviews) return;
    let area = reviews.querySelector('[data-review-cta]');
    if (!area) {
      area = document.createElement('div');
      area.dataset.reviewCta = 'true';
      area.className = 'relative mt-9 text-center';
      area.innerHTML = '<a href="/avaliar" class="inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-3 text-gold hover:bg-gold hover:text-black transition-colors font-semibold"></a>';
      const container = reviews.querySelector('.relative.mx-auto.max-w-6xl') || reviews.firstElementChild || reviews;
      container.appendChild(area);
    }
    const language = (document.documentElement.lang || 'pt').slice(0, 2);
    const link = area.querySelector('a');
    const label = labels[language] || labels.pt;
    if (link && link.textContent !== label) link.textContent = label;
  }
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(organize);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('DOMContentLoaded', organize);
  organize();
})();
