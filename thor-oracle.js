export const THOR_IMAGE = 'img/objets/marteau-thor.png';
export function openThorOracle({gems=[],placed=()=>false,place=()=>{},onReveal=()=>{},onClose=()=>{}}={}) {
  if(document.querySelector('.thor-oracle'))return;
  const root=document.createElement('div');root.className='thor-oracle';root.setAttribute('role','dialog');root.setAttribute('aria-label','Le marteau oracle');root.setAttribute('aria-modal','true');
  root.innerHTML=`<button class="thor-close" aria-label="Fermer">✕</button><div class="thor-vision"><div class="thor-beam"></div><img class="thor-doge" src="img/doge-big.webp" alt="Le doge"><p class="thor-message">Je prends mon goûter à la serre cet après-midi.</p></div><div class="thor-stage"><img class="thor-hammer" src="${THOR_IMAGE}" alt="Marteau de Thor"><div class="thor-sockets"></div></div><div class="thor-gems"></div>`;
  document.body.append(root);const previous=document.activeElement, controller=new AbortController(),revealAudio=new Audio('audio/hologram.mp3');revealAudio.preload='auto';revealAudio.volume=.8;let timer,closed=false,revealed=false,drag=null,selected=null;
  const close=()=>{if(closed)return;closed=true;clearTimeout(timer);revealAudio.pause();controller.abort();root.remove();previous?.focus?.();onClose();};
  window.addEventListener('popstate',close,{signal:controller.signal});root.querySelector('.thor-close').onclick=close;root.querySelector('.thor-close').focus();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopImmediatePropagation();close();}if(e.key==='Tab'){const bs=[...root.querySelectorAll('button:not(:disabled)')];if(!bs.length)return;e.preventDefault();let i=bs.indexOf(document.activeElement);bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();}},{capture:true,signal:controller.signal});
  const activate=()=>{if(revealed||!gems.every(g=>placed(g)))return;revealed=true;root.classList.add('charging');revealAudio.muted=true;revealAudio.volume=0;revealAudio.currentTime=0;revealAudio.play().then(()=>{revealAudio.pause();revealAudio.currentTime=0;revealAudio.muted=false;revealAudio.volume=.8;}).catch(()=>{revealAudio.muted=false;revealAudio.volume=.8;});timer=setTimeout(()=>{if(closed)return;root.classList.add('revealed');revealAudio.currentTime=0;revealAudio.play().catch(()=>{});onReveal();},1800);};
  const coords=[[23,82],[50,87],[77,82]];
  gems.forEach((g,i)=>{const slot=document.createElement('button');slot.className='thor-slot';slot.style.cssText=`left:${coords[i][0]}%;top:${coords[i][1]}%`;slot.setAttribute('aria-label',`Placer ${g.short}`);slot.style.setProperty('--stone-color',g.color||'#b6e6ff');root.querySelector('.thor-sockets').append(slot);
    const b=document.createElement('button');b.className='thor-gem';b.innerHTML=`<img src="${g.img}" alt="${g.short}">`;b.disabled=!g.owned&&!placed(g);root.querySelector('.thor-gems').append(b);
    const render=()=>{const done=placed(g);slot.innerHTML=done?`<img src="${g.img}" alt="${g.short}">`:'';slot.classList.toggle('set',done);b.hidden=done;};
    const insert=()=>{if(!g.owned||placed(g)||closed)return;place(g);render();slot.animate([{transform:'translate(-50%,-50%) scale(1.6)',filter:'brightness(3)'},{transform:'translate(-50%,-50%) scale(1)',filter:'brightness(1)'}],{duration:600});activate();};
    const reject=()=>slot.animate([{boxShadow:'0 0 20px #ffae8c'},{boxShadow:'0 0 9px #c6edff66'}],{duration:500});
    slot.onclick=e=>{if(e.detail===0&&selected){if(selected===g.id)insert();else reject();}};b.onclick=e=>{if(e.detail===0){selected=g.id;b.classList.add('selected');slot.focus();}};
    b.onpointerdown=e=>{if(b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};};
    b.onpointermove=e=>{if(!drag)return;drag.moved ||= Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8;b.style.transform=`translate(${e.clientX-drag.x}px,${e.clientY-drag.y}px)`;};
    b.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;const r=slot.getBoundingClientRect();const correct=d.moved&&e.clientX>=r.left-8&&e.clientX<=r.right+8&&e.clientY>=r.top-8&&e.clientY<=r.bottom+8;b.style.transform='';if(correct)insert();else if(d.moved){reject();b.animate([{transform:'translate(0,-8px)'},{transform:'translate(0,0)'}],{duration:250});}};b.onpointercancel=()=>{drag=null;b.style.transform='';};render();
  });activate();return close;
}
