/**
 * Spoilers del foro (lib/forumbody.ts los pinta tapados): un clic, Intro o la
 * barra los destapan. Con importarlo basta; el módulo se evalúa una vez por
 * página aunque lo importen varios scripts.
 */
function destapar(el: Element | null) {
  const s = el?.closest<HTMLElement>('.forum-spoiler');
  if (!s || s.dataset.open) return false;
  s.dataset.open = '1';
  s.setAttribute('aria-expanded', 'true');
  s.removeAttribute('role');
  s.removeAttribute('tabindex');
  return true;
}

document.addEventListener('click', (e) => {
  // El primer clic destapa; los enlaces de dentro funcionan a partir del segundo.
  if (destapar(e.target as Element)) e.preventDefault();
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && destapar(e.target as Element)) e.preventDefault();
});

export {};
