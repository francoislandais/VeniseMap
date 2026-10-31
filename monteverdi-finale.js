import { celebrateVenice } from './monteverdi-celebration.js';
export const MONTEVERDI_FINALE_STARS = 500;
// Entrée du thème dans le MP3 fourni ; le chronométrage suit le lecteur audio.
export const SAMBA_THEME_SECONDS = 30;
const PORTRAIT = 'img/monteverdi-avatar.webp';
export async function openMonteverdiFinale({name='jeune matelot',travel,map,getMasks,getCharacters,maskImages,onMaskBurst,onCoinArrive,onReward,onComplete,onExit=()=>{}}) {
  if(document.querySelector('.monteverdi-finale'))return;
  const root=document.createElement('section');root.className='monteverdi-finale';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Le repos de Monteverdi');root.tabIndex=-1;
  document.body.append(root);document.body.classList.add('monteverdi-finale-open');root.focus();
  const ctl=new AbortController(),signal=ctl.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame=0,closed=false,completed=false,currentSound=null,ctx=null,gain=null;
  const animations=new Set();
  const animate=async(el,frames,options)=>{const a=el.animate(frames,{...options,duration:reduced?1:options.duration,fill:'forwards'});animations.add(a);await a.finished.catch(()=>{});animations.delete(a);if(closed)throw new Error('closed');};
  const wait=ms=>new Promise((resolve,reject)=>{let elapsed=0,last=performance.now();const tick=now=>{if(closed){reject(new Error('closed'));return;}if(!document.hidden)elapsed+=Math.min(250,now-last);last=now;if(elapsed>=ms)resolve();else frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);});
  // Le contexte est ouvert dans le geste de remise de la viole : les deux morceaux pourront démarrer sans nouvel accord du navigateur.
  try{ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});gain=ctx.createGain();gain.gain.value=.65;gain.connect(ctx.destination);}catch{}
  const load=async url=>{if(!ctx)return null;try{const r=await fetch(url);if(!r.ok)return null;return await ctx.decodeAudioData(await r.arrayBuffer());}catch{return null;}};
  const choir=load('audio/ave-maris-stella-intro.mp3'),party=load('audio/finale-samba-de-janeiro.mp3');
  const play=async(bufferPromise)=>{const buffer=await bufferPromise;if(closed||!ctx||!buffer)return;currentSound?.stop();currentSound=ctx.createBufferSource();currentSound.buffer=buffer;currentSound.loop=true;currentSound.connect(gain);const startedAt=ctx.currentTime;currentSound.start(startedAt);return startedAt;};
  play(choir);
  const visibility=()=>{if(!ctx)return;if(document.hidden){ctx.suspend().catch(()=>{});animations.forEach(a=>a.pause());}else{ctx.resume().catch(()=>{});animations.forEach(a=>a.play());}};
  document.addEventListener('visibilitychange',visibility,{signal});
  const stop=()=>{if(closed)return;closed=true;ctl.abort();cancelAnimationFrame(frame);animations.forEach(a=>a.cancel());try{currentSound?.stop();ctx?.close();}catch{}root.remove();document.body.classList.remove('monteverdi-finale-open');onExit(completed);};
  window.addEventListener('pagehide',stop,{signal});
  const scene=async(bg,small=false)=>{
    const old=root.querySelector('.mf-scene');const next=document.createElement('div');next.className='mf-scene';
    if(bg){const image=document.createElement('img');image.className='mf-background';image.src=bg;image.alt=bg.includes('q10')?'La tombe de Claudio Monteverdi':'L’intérieur des Frari';next.append(image);}
    const portrait=document.createElement('img');portrait.className=small?'mf-spirit':'mf-portrait';portrait.src=PORTRAIT;portrait.alt='Monteverdi';next.append(portrait);root.append(next);
    await animate(next,[{opacity:0},{opacity:1}],{duration:900});old?.remove();return {next,portrait};
  };
  const line=async(next,text,corner=false)=>{
    next.querySelector('.mf-copy')?.remove();const copy=document.createElement('p');copy.className='mf-copy'+(corner?' mf-corner-copy':'');copy.setAttribute('aria-label',text);next.append(copy);
    const hint=document.createElement('span');hint.className='mf-hint';hint.textContent='Touchez pour continuer';next.append(hint);
    let index=0,full=reduced,typing=0;const letters=Array.from(text);copy.textContent=full?text:'';
    if(!full){typing=setInterval(()=>{index=Math.min(index+3,letters.length);copy.textContent=letters.slice(0,index).join('');if(index===letters.length){full=true;clearInterval(typing);}},20);}
    await new Promise(resolve=>{const tap=()=>{if(!full){clearInterval(typing);full=true;copy.textContent=text;return;}root.removeEventListener('click',tap);root.removeEventListener('keydown',key);resolve();};const key=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap();}};root.addEventListener('click',tap,{signal});root.addEventListener('keydown',key,{signal});signal.addEventListener('abort',()=>{clearInterval(typing);resolve();},{once:true});});
    clearInterval(typing);hint.remove();if(closed)throw new Error('closed');
  };
  try{
    let page=await scene('img/narrative/venise-lavis-03.png');
    await line(page.next,`Tu as retrouvé ma viole, ${name}. Reçois ma profonde gratitude : par ton courage, tu as rendu son âme à ma musique.`);
    await line(page.next,'Grâce à toi, je peux enfin trouver le repos. La tempête née de ma colère s’apaise : que Venise retrouve sa musique.');
    await animate(page.next,[{opacity:1},{opacity:0}],{duration:900});page.next.remove();root.classList.add('mf-map');await travel(signal);
    root.classList.remove('mf-map');page=await scene('img/places/frari.webp',true);
    await animate(page.portrait,[{left:'40%',top:'82%',transform:'translate(-50%,-50%) scale(1)',opacity:1},{left:'53%',top:'48%',transform:'translate(-50%,-50%) scale(.38)',opacity:.6}],{duration:4800});
    page=await scene('img/q/frari-q10.webp',true);
    await animate(page.portrait,[{left:'20%',top:'72%',transform:'translate(-50%,-50%) scale(1)'},{left:'50%',top:'63%',transform:'translate(-50%,-50%) scale(.65)'}],{duration:2500});
    const farewell=document.createElement('img');farewell.src=PORTRAIT;farewell.alt='Monteverdi';farewell.className='mf-farewell';page.next.append(farewell);await animate(farewell,[{opacity:0},{opacity:1}],{duration:1100});
    await line(page.next,`Adieu, ${name}, et merci pour tout.`,true);
    await line(page.next,'Tu mérites une grande récompense pour ta bravoure, ta curiosité et ta ténacité.',true);
    await animate(farewell,[{opacity:1},{opacity:0}],{duration:900});
    await animate(page.portrait,[{opacity:.8,transform:'translate(-50%,-50%) scale(.65)'},{opacity:0,transform:'translate(-50%,-50%) scale(0)'}],{duration:1800});
    await animate(page.next,[{opacity:1},{opacity:0}],{duration:1200});page.next.remove();root.classList.add('mf-map');
    await onReward();await wait(1800);
    if(ctx&&gain){gain.gain.setTargetAtTime(0,ctx.currentTime,1);await wait(4500);currentSound?.stop();currentSound=null;gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setValueAtTime(.85,ctx.currentTime);}
    const sites=await getMasks();
    const sambaStartedAt=await play(party);
    if(!reduced)await animate(map.getCanvasContainer(),[
      {transform:'translate(0,0)'},{transform:'translate(-8px,5px)'},{transform:'translate(9px,-6px)'},{transform:'translate(-11px,-4px)'},{transform:'translate(8px,7px)'},{transform:'translate(-7px,2px)'},{transform:'translate(5px,-6px)'},{transform:'translate(-4px,4px)'},{transform:'translate(2px,-2px)'},{transform:'translate(0,0)'}
    ],{duration:1400,easing:'linear'});
    await celebrateVenice({root,map,sites,images:maskImages,characters:getCharacters(),themeAt:SAMBA_THEME_SECONDS,sambaSeconds:()=>ctx&&Number.isFinite(sambaStartedAt)?ctx.currentTime-sambaStartedAt:null,onMaskBurst,onCoinArrive,signal,reduced,wait,onAllMasksBurst:()=>{onComplete();completed=true;}});

  }catch(e){if(!closed)console.error('Finale de Monteverdi',e);}finally{stop();}
}
