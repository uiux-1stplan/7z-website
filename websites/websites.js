(()=>{"use strict";
const P=window.__Z7_WEBSITE_PROJECTS__||[];if(!P.length)return;
const $=(s,r=document)=>r.querySelector(s),tabs=$("#projects"),dev=[...document.querySelectorAll("[data-device]")],stage=$("#stage"),screen=$("#screen"),poster=$("#poster"),frame=$("#liveFrame"),open=$("#openSite"),addr=$("#address"),status=$("#statusText"),retry=$("#retry");
let pi=0,d="desktop",token=0,ready=false,timer=0,ping=0;
const project=()=>P[pi],pic=p=>d==="mobile"?(p.mobile||p.desktop):p.desktop;
function setLive(v){ready=v;screen.classList.toggle("is-live",v);frame.setAttribute("aria-hidden",v?"false":"true");retry.hidden=true;if(v){clearTimeout(timer);clearInterval(ping)}}
function hello(){if(!frame.contentWindow)return;[
{type:"7z-parent-ready",source:"7z-magic",device:d},
{type:"7Z_PREVIEW_PARENT_READY",source:"7z-magic",device:d},
{type:"7z:preview:hello",source:"7z-magic",device:d}
].forEach(x=>{try{frame.contentWindow.postMessage(x,"*")}catch(_){}})}
function readyMessage(x){if(x==null)return false;let t="";try{t=typeof x==="string"?x:JSON.stringify(x)}catch(_){}
return /(7z|preview|bridge).*(ready|heartbeat|alive)|(?:ready|heartbeat).*(7z|preview|bridge)/i.test(t)}
function load(){const p=project(),my=++token;clearTimeout(timer);clearInterval(ping);setLive(false);status.textContent="Preparing live preview";retry.hidden=true;frame.src="about:blank";
requestAnimationFrame(()=>{if(my!==token)return;frame.src=p.url;ping=setInterval(hello,450);timer=setTimeout(()=>{if(my!==token||ready)return;status.textContent="Preview protected";retry.hidden=false;clearInterval(ping)},9000)})}
function render(){const p=project();[...tabs.children].forEach((b,i)=>b.classList.toggle("is-active",i===pi));dev.forEach(b=>b.classList.toggle("is-active",b.dataset.device===d));stage.classList.toggle("is-mobile",d==="mobile");stage.classList.toggle("is-desktop",d==="desktop");poster.src=pic(p);poster.alt=`${p.name} ${d} preview`;open.href=p.url;addr.textContent=p.url.replace(/^https?:\/\//,"").replace(/\/$/,"");load()}
P.forEach((p,i)=>{const b=document.createElement("button");b.type="button";b.textContent=p.name;b.onclick=()=>{if(pi!==i){pi=i;render()}};tabs.appendChild(b)});
dev.forEach(b=>b.onclick=()=>{if(b.dataset.device&&b.dataset.device!==d){d=b.dataset.device;render()}});
retry.onclick=load;frame.addEventListener("load",()=>{if(frame.src&&frame.src!=="about:blank")hello()});
window.addEventListener("message",e=>{if(e.source!==frame.contentWindow||!readyMessage(e.data))return;status.textContent="Live";setLive(true)});
render();
})();
/* Z7_CANONICAL_HEADER_BEHAVIOR_V1 */
(() => {
  const menu = document.querySelector(".services-menu");
  const trigger = document.querySelector(".services-trigger");
  const panel = document.querySelector(".services-panel");
  if (!menu || !trigger || !panel) return;

  const close = () => {
    menu.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
  };

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();