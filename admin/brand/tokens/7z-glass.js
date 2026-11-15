/* 7Z Glass runtime — cursor spotlight, scroll reveal, toggles, copy-to-clipboard. No dependencies. */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 6 — cursor spotlight on every .glass
  document.addEventListener('pointermove', function(e){
    var t = e.target.closest && e.target.closest('.glass');
    if(!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, {passive:true});

  // scroll reveal
  var els = document.querySelectorAll('[data-reveal]');
  if(reduce || !('IntersectionObserver' in window)){ els.forEach(function(el){ el.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, {threshold:.12});
    els.forEach(function(el, i){ el.style.setProperty('--i', i % 6); io.observe(el); });
  }

  // toggles
  document.querySelectorAll('.toggle').forEach(function(t){
    t.addEventListener('click', function(){ t.setAttribute('aria-checked', t.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); });
  });

  // copy swatch values
  document.querySelectorAll('[data-copy]').forEach(function(el){
    el.addEventListener('click', function(){
      var v = el.getAttribute('data-copy');
      try{ navigator.clipboard.writeText(v); }catch(_){}
      var toast = document.getElementById('toast'); if(!toast) return;
      toast.textContent = 'Copied ' + v; toast.classList.add('on');
      clearTimeout(toast._t); toast._t = setTimeout(function(){ toast.classList.remove('on'); }, 1400);
    });
  });

  // glass lab sliders
  var lab = document.getElementById('lab');
  if(lab){
    var map = {blur:['--glass-blur','px'], sat:['--glass-sat','%'], tint:['--lab-tint',''], rad:['--r-glass','px']};
    lab.querySelectorAll('input[type=range]').forEach(function(inp){
      function apply(){
        var m = map[inp.dataset.k]; var v = inp.value;
        var target = document.getElementById('labTarget');
        if(inp.dataset.k === 'tint'){ target.style.setProperty('--glass-tint-a', 'rgba(190,225,255,' + (v/100) + ')'); }
        else { target.style.setProperty(m[0], v + m[1]); }
        var o = inp.parentElement.querySelector('output'); if(o) o.textContent = v + (m[1]||'%');
      }
      inp.addEventListener('input', apply); apply();
    });
  }

  // theme switch (dark default)
  var tb = document.getElementById('themeBtn');
  if(tb){ tb.addEventListener('click', function(){
    var r = document.documentElement; var n = r.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    r.setAttribute('data-theme', n); tb.setAttribute('aria-pressed', String(n === 'light'));
  }); }
  var lb = document.getElementById('langBtn');
  if(lb){ lb.addEventListener('click', function(){
    var r = document.documentElement; var rtl = r.getAttribute('dir') === 'rtl';
    r.setAttribute('dir', rtl ? 'ltr' : 'rtl'); r.setAttribute('lang', rtl ? 'en' : 'ar');
  }); }
})();
