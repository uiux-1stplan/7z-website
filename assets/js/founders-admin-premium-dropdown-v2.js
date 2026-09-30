(function(){
  function norm(v){
    return String(v||'').replace(/\s+/g,' ').trim().toUpperCase();
  }

  function findAdminButton(){
    return Array.from(document.querySelectorAll('a,button')).find(function(el){
      return norm(el.textContent).indexOf('ADMIN PANEL')>=0;
    }) || null;
  }

  function engineTarget(){
    var local=location.hostname==='127.0.0.1' || location.hostname==='localhost';
    return local
      ? 'http://127.0.0.1:7070/engine'
      : 'https://content.7z-magic.com/portal';
  }

  function positionMenu(button,menu){
    var r=button.getBoundingClientRect();
    var gap=10;
    var menuWidth=Math.min(260,window.innerWidth-24);
    var left=Math.min(Math.max(12,r.right-menuWidth),window.innerWidth-menuWidth-12);
    var top=r.bottom+gap;

    if(top+190>window.innerHeight){
      top=Math.max(12,r.top-190-gap);
    }

    menu.style.left=left+'px';
    menu.style.top=top+'px';
  }

  function buildMenu(button){
    if(document.getElementById('z7-admin-premium-menu')) return;

    var originalHref=button.tagName==='A' ? (button.getAttribute('href')||'') : '';
    var originalTarget=button.tagName==='A' ? (button.getAttribute('target')||'') : '';

    var menu=document.createElement('div');
    menu.id='z7-admin-premium-menu';
    menu.setAttribute('role','menu');
    menu.innerHTML=
      '<div class="z7-menu-kicker">7Z Internal / Administration</div>'+
      '<a class="z7-menu-item" id="z7-admin-panel-item" href="#">'+
        '<span><span class="z7-menu-title">7Z Admin Panel</span>'+
        '<span class="z7-menu-meta">Website administration</span></span>'+
        '<span class="z7-menu-icon">-&gt;</span>'+
      '</a>'+
      '<div class="z7-menu-divider"></div>'+
      '<a class="z7-menu-item" id="z7-content-engine-item" href="'+engineTarget()+'" target="_blank" rel="noopener">'+
        '<span><span class="z7-menu-title">7Z Content Engine</span>'+
        '<span class="z7-menu-meta">AI content operations</span></span>'+
        '<span class="z7-menu-icon">-&gt;</span>'+
      '</a>';

    document.body.appendChild(menu);

    var adminItem=document.getElementById('z7-admin-panel-item');

    if(originalHref && originalHref!=='#' && originalHref.toLowerCase().indexOf('javascript:')!==0){
      adminItem.href=originalHref;
      if(originalTarget) adminItem.target=originalTarget;
    }else{
      adminItem.addEventListener('click',function(e){
        e.preventDefault();
        menu.classList.remove('is-open');
        try{
          button.removeEventListener('click',toggle,true);
          button.click();
          button.addEventListener('click',toggle,true);
        }catch(_){}
      });
    }

    function toggle(e){
      e.preventDefault();
      e.stopPropagation();

      var open=!menu.classList.contains('is-open');
      if(open){positionMenu(button,menu);}

      menu.classList.toggle('is-open',open);
      button.setAttribute('aria-expanded',open?'true':'false');
    }

    button.addEventListener('click',toggle,true);
    button.setAttribute('aria-haspopup','menu');
    button.setAttribute('aria-expanded','false');

    window.addEventListener('resize',function(){
      if(menu.classList.contains('is-open')){positionMenu(button,menu);}
    });

    window.addEventListener('scroll',function(){
      if(menu.classList.contains('is-open')){positionMenu(button,menu);}
    },{passive:true});

    document.addEventListener('click',function(e){
      if(e.target===button || button.contains(e.target) || menu.contains(e.target)) return;
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded','false');
    });

    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        menu.classList.remove('is-open');
        button.setAttribute('aria-expanded','false');
      }
    });
  }

  function boot(){
    var attempts=0;
    var timer=setInterval(function(){
      attempts++;
      var button=findAdminButton();

      if(button){
        clearInterval(timer);
        buildMenu(button);
        return;
      }

      if(attempts>=40){
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