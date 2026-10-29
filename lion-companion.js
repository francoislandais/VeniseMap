// Geographic flight and companion state. Progress stores recruitment; animation stays local.
export function createLionCompanion({ map, getLion, getPlayer, recruited, visible = () => true }) {
  let state = null, lastTick = 0;
  const target = p => ({lat:p.lat - .00016,lon:p.lon - .00016});
  const distance = (a,b) => Math.hypot((a.lon-b.lon)*Math.cos(a.lat*Math.PI/180),a.lat-b.lat)*111195;
  const position = W => { const p=W.marker.getLngLat();return {lat:p.lat,lon:p.lng}; };
  function summon() {
    const W=getLion();
    state={phase:'pending',from:W?.marker?position(W):null,elapsed:0};lastTick=0;
  }
  function update(now) {
    const W=getLion(),p=getPlayer();
    if(!recruited()) { state=null;lastTick=0;if(W?.marker){const el=W.marker.getElement();el.classList.remove("follows-player","lion-arriving");delete el.dataset.companionPhase;}return null; }
    if(!W?.marker)return null;
    if(!p){lastTick=0;return {...position(W),dx:0,dy:0};}
    if(!visible()){lastTick=0;return {...position(W),dx:0,dy:0};}
    const dest=target(p),dt=lastTick?Math.min(160,Math.max(0,now-lastTick)):0;lastTick=now;
    // Existing companions resume beside their player; only a new offering summons a flight.
    if(!state)state={phase:'following',q:dest};
    if(state.phase==='pending') {
      state.from ||= position(W);state.zoom=map.getZoom();state.elapsed=0;state.phase='framing';
      const a=map.project([state.from.lon,state.from.lat]),b=map.project([p.lon,p.lat]);
      const canvas=map.getCanvas(),width=canvas.clientWidth,height=canvas.clientHeight;
      const top=Math.min(90,height*.18),bottom=Math.min(150,height*.25),side=Math.min(65,width*.17);
      const outside=q=>q.x<side||q.x>width-side||q.y<top||q.y>height-bottom;
      state.reframe=outside(a)||outside(b);
      if(state.reframe)map.fitBounds([[Math.min(state.from.lon,p.lon),Math.min(state.from.lat,p.lat)],[Math.max(state.from.lon,p.lon),Math.max(state.from.lat,p.lat)]],{padding:{top,bottom,left:side,right:side},maxZoom:Math.min(state.zoom,16),duration:1000,essential:true});
      state.wait=state.reframe?1100:350;
      state.duration=Math.min(8500,Math.max(4200,distance(state.from,dest)/.6));
    }
    let q;
    if(state.phase==='framing') {
      q=state.from;state.elapsed+=dt;
      if(state.elapsed>=state.wait){state.phase='flying';state.elapsed=0;}
    } else if(state.phase==='flying') {
      state.elapsed+=dt;const t=Math.min(1,state.elapsed/state.duration),u=t*t*(3-2*t);
      const dx=dest.lon-state.from.lon,dy=dest.lat-state.from.lat,arc=Math.sin(Math.PI*u)*.075;
      q={lon:state.from.lon+dx*u-dy*arc,lat:state.from.lat+dy*u+dx*arc*.5};
      if(t>=1) {
        state.phase='following';state.q=q;
        if(state.reframe)map.easeTo({center:[p.lon,p.lat],zoom:Math.min(state.zoom,18),duration:1200,essential:true});
      }
    } else {
      const previous=state.q||dest,blend=1-Math.exp(-dt/380);
      q={lat:previous.lat+(dest.lat-previous.lat)*blend,lon:previous.lon+(dest.lon-previous.lon)*blend};
      if(distance(q,dest)<.3)q=dest;state.q=q;
    }
    const old=position(W),a=map.project([old.lon,old.lat]),b=map.project([q.lon,q.lat]);
    const el=W.marker.getElement(),moving=state.phase==='flying'||distance(old,q)>.1;
    el.classList.add('follows-player');el.classList.toggle('lion-arriving',state.phase!=='following');
    el.classList.toggle('flying',moving);el.classList.toggle('landed',!moving);
    el.dataset.companionPhase=state.phase;
    return {...q,dx:b.x-a.x,dy:b.y-a.y};
  }
  // Avoid elapsed hidden time turning the visible journey into an apparent teleport.
  function pause(){lastTick=0;}
  return {summon,update,pause};
}
