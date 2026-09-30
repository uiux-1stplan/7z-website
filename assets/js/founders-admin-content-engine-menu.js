(function(){
  function norm(v){
    return String(v||'').replace(/\s+/g,' ').trim().toUpperCase();
  }

  function engineTarget(){
    var local=location.hostname==='127.0.0.1' || location.hostname==='localhost';
    return local
      ? 'http://127.0.0.1:7070/engine'
      : 'https://content.7z-magic.com/portal';
  }

  function findAdminControl(){
    return Array.from(document.querySelectorAll('a,button')).find(function(el){
      return norm(el.textContent).indexOf('ADMIN PANEL')>=0;
    }) || null;
  }

  function install(){
    if(document.querySelector('.z7-admin-menu-popover')) return true;

    var control=findAdminControl();
    if(!control) return false;

    var originalHref=control.tagName==='A' ? (control.getAttribute('href')||'') : '';
    var originalTarget=control.tagName==='A' ? (control.getAttribute('target')||'') : '';
    var host=control.parentElement || control;

    host.classList.add('z7-admin-menu-host');

    var menu=document.createElement('div');
    menu.className='z7-admin-menu-popover';
    menu.setAttribute('role','menu');

    var adminItem=document.createElement('a');
    adminItem.className='z7-admin-menu-item';
    adminItem.href=originalHref && originalHref!=='#' ? originalHref : 'javascript:void(0)';
    if(originalTarget) adminItem.target=originalTarget;
    adminItem.innerHTML='<span><span>7Z Admin Panel</span><span class="z7-admin-menu-meta">Website administration</span></span><span class="z7-admin-menu-arrow">-&gt;</span>';

    var engineItem=document.createElement('a');
    engineItem.className='z7-admin-menu-item';
    engineItem.href=engineTarget();
    engineItem.target='_blank';
    engineItem.rel='noopener';
    engineItem.innerHTML='<span><span>7Z Content Engine</span><span class="z7-admin-menu-meta">AI content operations</span></span><span class="z7-admin-menu-arrow">-&gt;</span>';

    menu.appendChild(adminItem);
    menu.appendChild(engineItem);
    host.appendChild(menu);

    function toggle(e){
      e.preventDefault();
      e.stopPropagation();
      var open=!menu.classList.contains('is-open');
      menu.classList.toggle('is-open',open);
      control.setAttribute('aria-expanded',open?'true':'false');
    }

    control.addEventListener('click',toggle,true);
    control.setAttribute('aria-haspopup','menu');
    control.setAttribute('aria-expanded','false');

    document.addEventListener('click',function(e){
      if(!host.contains(e.target)){
        menu.classList.remove('is-open');
        control.setAttribute('aria-expanded','false');
      }
    });

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        menu.classList.remove('is-open');
        control.setAttribute('aria-expanded','false');
      }
    });

    return true;
  }

  function boot(){
    if(install()) return;

    var attempts=0;
    var timer=setInterval(function(){
      attempts++;
      if(install() || attempts>=30){
        clearInterval(timer);
      }
    },100);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();