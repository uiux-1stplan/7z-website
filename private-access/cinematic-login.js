(() => {
const logo = document.querySelector('.logo-control');
const brand = document.querySelector('.z7-login-brand');
document.querySelectorAll('.user-box input').forEach((input) => {
  input.addEventListener('focus', () => {
    brand.classList.remove('is-departing');
    logo.disabled = false;
    brand.dataset.field = input.id === 'z7HubClientId' ? 'username' : 'password';

  });
});
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
logo.addEventListener('pointermove', (event) => {
  if (reducedMotion.matches || event.pointerType === 'touch') return;
  const bounds = logo.getBoundingClientRect();
  logo.style.setProperty('--tilt-x', `${-(event.clientY - bounds.top - bounds.height / 2) / 5}deg`);
  logo.style.setProperty('--tilt-y', `${(event.clientX - bounds.left - bounds.width / 2) / 5}deg`);
});
logo.addEventListener('pointerleave', () => {
  logo.style.removeProperty('--tilt-x');
  logo.style.removeProperty('--tilt-y');
});
logo.addEventListener('click', () => {
  if (reducedMotion.matches) return;
  logo.classList.remove('is-lit');
  void logo.offsetWidth;
  logo.classList.add('is-lit');
});
logo.addEventListener('animationend', () => logo.classList.remove('is-lit'));

window.z7LoginMotion = {
  exit() {
    brand.classList.add('is-departing');
    logo.disabled = true;
    return new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 0 : 1600));
  },
  reset() { brand.classList.remove('is-departing'); logo.disabled = false; }
};
})();
