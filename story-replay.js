import {createMap} from './mapstyle.js';
import {createLionCompanion} from './lion-companion.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let activeHistoryClose = null;
export function closeHistoryReplay(){if(!activeHistoryClose)return false;activeHistoryClose();return true;}

// Every runner receives an isolated close signal; rewards always stay in normal gameplay.
export async function playHistoryScene(run) {
  if(document.body.classList.contains('history-replaying'))return;
  document.body.classList.add('history-replaying');
  const controller=new AbortController(),back=document.createElement('button');
  back.className='history-replay-back';back.type='button';back.textContent='Retour à l’histoire';
  document.body.appendChild(back);let closed=false,dispose,observer,sawScene=false;
  const close=()=>{if(closed)return;closed=true;observer?.disconnect();window.removeEventListener("keydown",onKey,true);controller.abort();dispose?.();
    document.querySelector('.corto-rendezvous .cr-close')?.click();
    document.querySelector('.monteverdi-story .cr-close')?.click();
    document.querySelector('.marc-reading .marc-close')?.click();
    back.remove();activeHistoryClose=null;document.body.classList.remove('history-replaying');};
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}};
  window.addEventListener('keydown',onKey,true);activeHistoryClose=close;
  back.onclick=close;
  observer=new MutationObserver(()=>{const active=[...document.querySelectorAll('.corto-rendezvous,.in2,.marc-magic,.croquette-ritual,.history-dialogue,.history-collectible,.history-lion,.cer,#sheet.chap')].some(el=>!el.hidden);if(active)sawScene=true;else if(sawScene)close();});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
  try{const result=await run({close,signal:controller.signal});if(typeof result==='function'){dispose=result;if(closed)dispose();}}
  catch(error){close();throw error;}
}

export function replayDialogue({img,lines,onClose}){
  const root=document.createElement('section');root.className='history-dialogue';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.innerHTML=`<img src="${esc(img)}" alt=""><p></p><button type="button">Suite</button>`;document.body.appendChild(root);let i=0;
  const show=()=>{root.querySelector('p').textContent=lines[i];root.querySelector('button').textContent=i===lines.length-1?'Terminer':'Suite';};
  const close=()=>{root.remove();onClose?.();};root.querySelector('button').onclick=()=>{if(++i>=lines.length)close();else show();};show();return close;
}

export function replayCollectible({img,title,spin=false,onClose}){
  const root=document.createElement('section');root.className='history-collectible';root.setAttribute('role','dialog');root.setAttribute('aria-label',title);
  root.innerHTML=`<div class="history-shower" aria-hidden="true">${Array.from({length:70},(_,i)=>`<i style="--x:${Math.random()*100}%;--d:${i*31}ms">✦</i>`).join('')}</div><img class="history-reward-art" src="${esc(img)}" alt="${esc(title)}"><p>${esc(title)}</p><button type="button">Terminer</button>`;
  document.body.appendChild(root);const art=root.querySelector('img'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const a=art.animate([{transform:`scale(.15) rotate(${spin?-90:0}deg)`,opacity:0},{transform:`scale(1.08) rotate(${spin?365:0}deg)`,opacity:1,offset:.72},{transform:`scale(1) rotate(${spin?360:0}deg)`,opacity:1}],{duration:reduced?1:2200,fill:'forwards',easing:'ease-out'});
  const close=()=>{a.cancel();root.remove();onClose?.();};root.querySelector('button').onclick=close;return close;
}

// A separate map and marker replay the actual flight controller, never the live companion.
export function replayLion({player,from,onClose}){
  const p=player||{lat:45.436,lon:12.33},start=from||{lat:p.lat-.012,lon:p.lon+.024};
  const root=document.createElement('section');root.className='history-lion';root.setAttribute('aria-label','L’arrivée du lion ailé');root.innerHTML='<div class="history-lion-map"></div>';
  document.body.appendChild(root);const map=createMap(root.firstElementChild,{center:[p.lon,p.lat],zoom:17});
  const me=document.createElement('div');me.className='history-map-player';me.textContent='Toi';
  new maplibregl.Marker({element:me}).setLngLat([p.lon,p.lat]).addTo(map);
  const el=document.createElement('div');el.className='pin doge';el.style.width='60px';
  el.innerHTML='<div class="doge-sc"><div class="wk-turn"><div class="wk-flip"><div class="doge-av lion-rig" style="width:60px;aspect-ratio:325/360"><img class="lr-body" src="img/lion-body.webp" alt="Lion ailé"><img class="lr-rear" src="img/lion-rear.webp" alt=""><img class="lr-front" src="img/lion-front.webp" alt=""><img class="lr-wings" src="img/lion-wings.webp" alt=""></div></div></div></div>';
  const W={marker:new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([start.lon,start.lat]).addTo(map)};
  const lion=createLionCompanion({map,getLion:()=>W,getPlayer:()=>p,recruited:()=>true,visible:()=>!document.hidden});lion.summon();
  let frame=0,closed=false;const tick=now=>{if(closed)return;const q=lion.update(now);if(q){W.marker.setLngLat([q.lon,q.lat]);if(Math.abs(q.dx)>0.05)el.querySelector('.wk-flip').classList.toggle('left',q.dx<0);}frame=requestAnimationFrame(tick);};
  map.once('load',()=>{if(!closed)frame=requestAnimationFrame(tick);});
  return()=>{if(closed)return;closed=true;cancelAnimationFrame(frame);map.remove();root.remove();onClose?.();};
}
