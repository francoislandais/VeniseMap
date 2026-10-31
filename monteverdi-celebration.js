// Toutes les positions viennent du catalogue : aucune sélection selon le zoom ou l'inventaire.
export async function celebrateVenice({root,map,sites,images,characters=[],themeAt=30,sambaSeconds=()=>null,onMaskBurst,onCoinArrive,onAllMasksBurst,signal,reduced,wait}) {
  if(!sites.length)throw new Error('Catalogue des masques indisponible');
  const canvas=document.createElement('canvas');canvas.className='mf-fireworks';root.append(canvas);
  const g=canvas.getContext('2d'),art=await Promise.all(images.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;})));
  const sprites=art.filter(Boolean).map(img=>{const tile=document.createElement('canvas');tile.width=tile.height=128;tile.getContext('2d').drawImage(img,0,0,128,128);return tile;});if(!sprites.length)throw new Error('Images des masques indisponibles');
  const dancers=await Promise.all(characters.map(async(actor)=>{
    const img=await new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=actor.img;});
    let sprite=null;if(img){sprite=document.createElement('canvas');sprite.width=sprite.height=160;const ctx=sprite.getContext('2d');const scale=148/Math.max(img.naturalWidth,img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;ctx.drawImage(img,(160-w)/2,160-h,w,h);}
    return {...actor,sprite,origin:null};
  }));
  const dragon=await new Promise(resolve=>{const image=new Image();image.onload=()=>{const sprite=document.createElement('canvas');sprite.width=240;sprite.height=160;sprite.getContext('2d').drawImage(image,0,0,240,160);resolve({id:'festival-dragon',name:'Le dragon de la fête',sprite,dragon:true});};image.onerror=()=>resolve(null);image.src='img/narrative/festival-dragon.svg';});
  const guests=[...dancers,...(dragon?[dragon]:[])].sort(()=>Math.random()-.5);
  const districts=[
    {id:'dorsoduro',center:[12.3276,45.4300],zoom:13.8},
    {id:'san-marco',center:[12.3378,45.4336],zoom:14.0},
    {id:'castello',center:[12.3504,45.4356],zoom:13.8},
    {id:'cannaregio',center:[12.3291,45.4450],zoom:13.7},
    {id:'murano',center:[12.3520,45.4585],zoom:13.6},
    {id:'rialto',center:[12.3357,45.4380],zoom:13.9}
  ];
  let tourActive=false,tourIndex=0,nextCameraAt=Infinity,nextGuestAt=Infinity,guestIndex=0,cameos=[],repositionMasks=null;
  let chainActive=true,chainEnd=null;
  document.body.classList.add('mf-chain-active');root.dataset.finalePhase='samba-intro';
  const resize=()=>{const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;g.setTransform(d,0,0,d,0,0);};resize();window.addEventListener('resize',resize,{signal});
  let frame=0,clock=0,last=performance.now(),fireClock=0,maskStart=Infinity,bursts=0,credited=0,particles=[],coins=[],flashes=[],rockets=[];
  const masks=sites.map((site,i)=>({site,img:sprites[i%sprites.length],order:Math.random(),burst:false})).sort((a,b)=>a.order-b.order);
  masks.forEach((m,i)=>{m.delay=1.5+i*.055+Math.random()*.65;m.grow=1.1+Math.random()*1.5;});
  const meter=document.createElement('p');meter.className='mf-mask-progress';meter.setAttribute('role','status');meter.textContent='Venise se prépare à faire la fête…';root.append(meter);
  const destination=()=>{const r=document.querySelector('#hud-score svg')?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:innerWidth-35,y:25};};
  const explodeFirework=(x,y,h)=>{
    flashes.push({x,y,age:0,h});
    const count=reduced?24:140;
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2+(Math.random()-.5)*.08,v=(i%3===0?.5:1)*(100+Math.random()*200);particles.push({x,y,px:x,py:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,life:1.5+Math.random()*1.6,h:i%5===0?45:h});}
  };
  const stagePoint=m=>{
    const point=map.project([m.site.lon,m.site.lat]);
    const seed=Array.from(m.site.id).reduce((n,c)=>n*31+c.charCodeAt(0),7)>>>0;
    // Toute la collection participe à la cérémonie, même pour les masques situés au-delà du cadrage Venise–Murano.
    return {x:Math.max(56+seed%22,Math.min(innerWidth-56-seed%22,point.x)),y:Math.max(110+seed%34,Math.min(innerHeight-130-seed%34,point.y))};
  };
  const pop=m=>{
    m.burst=true;bursts++;const p=m.point||stagePoint(m),reward=onMaskBurst(m.site.id);credited+=reward;
    flashes.push({x:p.x,y:p.y,age:0,h:45});
    // Cinquante pièces réelles à l'écran par masque, gérées sur le canvas pour tenir sur mobile.
    for(let i=0;i<50;i++){const a=Math.random()*Math.PI*2,r=25+Math.random()*100;coins.push({x:p.x,y:p.y,bx:p.x+Math.cos(a)*r,by:p.y+Math.sin(a)*r,age:-Math.random()*.35,life:1+Math.random()*.65,value:reward/50,phase:Math.random()*Math.PI*2});}
    meter.textContent=`${bursts} / ${masks.length} masques · +${credited.toLocaleString('fr-FR')} pièces`;
  };
  const musicalTime=()=>{const time=sambaSeconds();return Number.isFinite(time)?time:clock+1.4;};
  const drawVictoryChain=()=>{
    if(!chainActive)return;
    const music=musicalTime(),beat=60/133;
    const fade=chainEnd===null?1:Math.max(0,1-(clock-chainEnd)/.8);
    for(let i=dancers.length-1;i>=0;i--){
      const actor=dancers[i],diveAt=2+i*.22,local=clock-diveAt;
      if(local<-.65)continue;
      const phase=(music-5)*.62-i*.36;
      const water=map.project([12.3474+.0032*Math.sin(phase),45.4320+.00055*Math.sin(phase*2)]);
      const size=Math.min(76,Math.max(48,innerWidth*.145));
      if(!actor.origin){const from=map.project(actor.from);actor.origin={x:Math.max(size/2,Math.min(innerWidth-size/2,from.x)),y:Math.max(90,Math.min(innerHeight*.4,from.y))};}
      let x=water.x,y=water.y,scale=1,angle=0,opacity=fade;
      if(local<1.6){
        const u=Math.max(0,Math.min(1,local/1.6));x=actor.origin.x+(water.x-actor.origin.x)*u;y=actor.origin.y+(water.y-actor.origin.y)*u-Math.sin(Math.PI*u)*(reduced?0:100);scale=.7+.3*Math.sin(Math.PI*u);angle=reduced?0:Math.sin(Math.PI*u)*.55;opacity*=Math.max(0,Math.min(1,(local+.65)/.65));
      }else{
        const hop=reduced?0:Math.abs(Math.sin(Math.PI*(music/beat-i*.12)));y-=hop*22;angle=reduced?0:Math.sin(music/beat*Math.PI*2-i*.4)*.10;
      }
      // Ondes et éclaboussures au moment où chacun rejoint la lagune.
      const splashAge=local-1.35;
      if(splashAge>=0){
        const impact=Math.max(0,1-splashAge/1.15),wave=1+Math.sin(music/beat*Math.PI*2-i)*.13;
        g.globalAlpha=fade*(.35+impact*.6);g.strokeStyle='#d0f7ff';g.lineWidth=2;g.beginPath();g.ellipse(water.x,water.y+size*.33,(size*.30+impact*22)*wave,5+impact*10,0,0,Math.PI*2);g.stroke();
        if(impact>0){for(let k=0;k<9;k++){const a=k/9*Math.PI*2,r=(1-impact)*42;g.beginPath();g.moveTo(water.x+Math.cos(a)*r,water.y-Math.sin(a)*r*.7);g.lineTo(water.x+Math.cos(a)*(r+4),water.y-Math.sin(a)*r*.7-5*impact);g.stroke();}}
      }
      g.save();g.globalAlpha=opacity;g.translate(x,y);g.rotate(angle);g.scale(scale,scale);
      if(actor.sprite)g.drawImage(actor.sprite,-size/2,-size/2,size,size);else{g.fillStyle='#fff';g.font='bold 13px Georgia';g.textAlign='center';g.fillText(actor.name,0,0);}
      g.restore();
    }
    g.globalAlpha=1;if(chainEnd!==null&&clock-chainEnd>=.8)chainActive=false;
  };
  const advanceFestival=()=>{
    if(!tourActive)return;
    if(clock>=nextCameraAt){
      const district=districts[tourIndex++%districts.length];root.dataset.finaleDistrict=district.id;
      if(!reduced)map.easeTo({center:district.center,zoom:district.zoom,bearing:0,pitch:0,duration:6200,easing:t=>t*t*(3-2*t)});
      nextCameraAt=clock+6.35;
    }
    if(guests.length&&clock>=nextGuestAt){
      const actor=guests[guestIndex++%guests.length],point=map.unproject([innerWidth*(.2+Math.random()*.6),innerHeight*(.3+Math.random()*.4)]);
      cameos.push({actor,at:[point.lng,point.lat],born:clock,life:actor.dragon?5:3.7,reverse:Math.random()<.5});
      nextGuestAt=clock+2.8;
    }
  };
  const drawFestivalGuests=()=>{
    for(const cameo of cameos){
      const age=clock-cameo.born,progress=age/cameo.life;if(progress>=1)continue;
      const opacity=Math.min(1,age/.45,(cameo.life-age)/.65),beat=musicalTime()/(60/133),at=map.project(cameo.at);
      let x=Math.max(48,Math.min(innerWidth-48,at.x)),y=Math.max(130,Math.min(innerHeight-160,at.y));
      const fly=cameo.actor.dragon,size=fly?Math.min(155,innerWidth*.38):Math.min(86,innerWidth*.22),hop=reduced?0:Math.abs(Math.sin(Math.PI*(beat+guestIndex*.13)))*15;
      if(fly&&!reduced){x=cameo.reverse?innerWidth+90-(innerWidth+180)*progress:-90+(innerWidth+180)*progress;y+=Math.sin(progress*Math.PI*3)*28;}
      g.save();g.globalAlpha=Math.max(0,opacity);g.translate(x,y-hop);g.rotate(reduced?0:Math.sin(beat*Math.PI)*.07);g.scale(fly&&cameo.reverse?-1:1,1);
      if(cameo.actor.sprite)g.drawImage(cameo.actor.sprite,-size/2,-size/2,size,fly?size*2/3:size);
      else{g.fillStyle='#fff';g.font='bold 13px Georgia';g.textAlign='center';g.fillText(cameo.actor.name,0,0);}
      g.restore();
    }
    g.globalAlpha=1;cameos=cameos.filter(c=>clock-c.born<c.life);
  };
  const tick=now=>{
    if(signal.aborted)return;const dt=Math.min(.25,(now-last)/1000);last=now;
    if(!document.hidden){clock+=dt;advanceFestival();fireClock+=dt;g.clearRect(0,0,innerWidth,innerHeight);g.globalCompositeOperation='source-over';
      if(fireClock>(reduced?1.5:.4)){fireClock=0;rockets.push({x:innerWidth*(.08+Math.random()*.84),y:innerHeight+20,target:innerHeight*(.08+Math.random()*.5),h:Math.random()*360});}
      g.lineCap='round';
      for(const r of rockets){const old=r.y;r.y-=dt*600;g.strokeStyle='#fff4c5';g.lineWidth=3;g.beginPath();g.moveTo(r.x,old+32);g.lineTo(r.x,r.y);g.stroke();if(r.y<=r.target){explodeFirework(r.x,r.y,r.h);r.dead=true;}}rockets=rockets.filter(r=>!r.dead);
      g.globalCompositeOperation='lighter';
      for(const p of particles){p.age+=dt;p.px=p.x;p.py=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=55*dt;p.vx*=.99;g.globalAlpha=Math.max(0,1-p.age/p.life);g.strokeStyle=`hsl(${p.h} 100% 66%)`;g.shadowColor=g.strokeStyle;g.shadowBlur=0;g.lineWidth=p.age<.25?3:1.6;g.beginPath();g.moveTo(p.px-p.vx*.055,p.py-p.vy*.055);g.lineTo(p.x,p.y);g.stroke();}particles=particles.filter(p=>p.age<p.life);
      g.shadowBlur=0;for(const f of flashes){f.age+=dt;const r=12+f.age*220;g.globalAlpha=Math.max(0,.65-f.age*1.6);const glow=g.createRadialGradient(f.x,f.y,0,f.x,f.y,r);glow.addColorStop(0,'#fff');glow.addColorStop(.2,`hsl(${f.h} 100% 72%)`);glow.addColorStop(1,'transparent');g.fillStyle=glow;g.fillRect(f.x-r,f.y-r,r*2,r*2);}flashes=flashes.filter(f=>f.age<.45);
      g.globalCompositeOperation='source-over';g.globalAlpha=1;
      if(clock>=maskStart){for(const m of masks){if(m.burst)continue;const p=m.point||stagePoint(m),age=clock-maskStart-m.delay;if(age>=m.grow){pop(m);continue;}const k=Math.max(0,age/m.grow),size=14+(reduced?28:78)*k*k;g.globalAlpha=age<0?.75:1;g.drawImage(m.img,p.x-size/2,p.y-size/2,size,size);}g.globalAlpha=1;}
      drawVictoryChain();drawFestivalGuests();
      const to=destination();
      for(const c of coins){c.age+=dt;if(c.age<0)continue;const f=Math.min(1,c.age/c.life),u=Math.min(1,f/.35),v=Math.max(0,(f-.35)/.65),ease=v*v;const x=c.x+(c.bx-c.x)*u+(to.x-c.bx)*ease,y=c.y+(c.by-c.y)*u+(to.y-c.by)*ease;g.fillStyle='#ffca31';g.strokeStyle='#fff5b0';g.lineWidth=1;g.beginPath();g.ellipse(x,y,Math.max(1,Math.abs(Math.cos(c.phase+f*12))*5),5,0,0,Math.PI*2);g.fill();g.stroke();if(f>=1){onCoinArrive(c.value);c.dead=true;}}coins=coins.filter(c=>!c.dead);
    }frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  const cleanup=()=>{cancelAnimationFrame(frame);tourActive=false;map.stop();if(repositionMasks){map.off('move',repositionMasks);window.removeEventListener('resize',repositionMasks);}canvas.remove();meter.remove();document.body.classList.remove('mf-chain-active');};signal.addEventListener('abort',cleanup,{once:true});
  try{
    // La caméra reste dans le bassin pendant l'introduction ; les six personnages plongent puis font la chenille.
    meter.textContent='La chenille de la victoire !';
    map.easeTo({center:[12.3474,45.4320],zoom:15.3,bearing:0,pitch:0,duration:reduced?0:1800});
    while(musicalTime()<themeAt)await wait(80);
    chainEnd=clock;root.dataset.finalePhase='lagoon-zoom';
    meter.textContent='Toute la lagune entre dans la fête…';
    // Éloignement progressif avant d'afficher même les masques normalement masqués à ce zoom.
    map.fitBounds([[12.303,45.424],[12.371,45.4675]],{padding:{top:80,bottom:100,left:28,right:28},duration:6500,maxZoom:13.2});
    await wait(6800);repositionMasks=()=>{for(const m of masks)if(!m.burst)m.point=stagePoint(m);};repositionMasks();map.on('move',repositionMasks);window.addEventListener('resize',repositionMasks,{signal});maskStart=clock;tourActive=true;nextCameraAt=clock+.8;nextGuestAt=clock+.4;root.dataset.finalePhase='mask-ceremony';root.dataset.finaleMasks=String(masks.length);meter.textContent=`${masks.length} masques s’éveillent…`;
    while(bursts<masks.length||coins.length)await wait(100);
    tourActive=false;map.stop();map.fitBounds([[12.303,45.424],[12.371,45.4675]],{padding:{top:80,bottom:100,left:28,right:28},duration:reduced?0:2300,maxZoom:13.2});
    root.dataset.finaleMasksBurst=String(bursts);onAllMasksBurst();meter.textContent=`Les ${bursts} masques ont éclaté !`;
    const message=document.createElement('div');message.className='mf-victory';const title=document.createElement('h1');title.textContent='Venise est en fête !';const text=document.createElement('p');text.textContent=`${bursts} masques · +${credited.toLocaleString('fr-FR')} pièces`;const button=document.createElement('button');button.type='button';button.textContent='Retrouver Venise';message.append(title,text,button);root.append(message);
    await wait(2500);message.classList.add('ready');button.focus();await new Promise(resolve=>{button.addEventListener('click',resolve,{once:true,signal});signal.addEventListener('abort',resolve,{once:true});});message.remove();
    return {count:bursts,reward:credited};
  }finally{cleanup();signal.removeEventListener('abort',cleanup);window.removeEventListener('resize',resize);}
}
