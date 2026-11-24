// One input layer for every device: keyboard, mouse, touch (floating stick and buttons)
// and standard-mapping gamepads. The page switches its visible controls to whichever
// input the player used last.
const MOVE={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
const DEAD_ZONE=0.28;
export const PAD={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,BACK:8,START:9,UP:12,DOWN:13,LEFT:14,RIGHT:15};

export function createControls({body=document.body,touch,stickZone,stick,events}){
  const keys=new Set(),stickVector={x:0,y:0},padMove={x:0,y:0};
  let mode='',stickPointer=null,stickBase=null,padAim=null,padPrev=[],navHeldAt=0,navDirection=null,padFrame=0,padsSeen=0;
  let menuWasOpen=false,menuArmed=false,attackGate=false;
  const held={touch:false,pad:false};

  function setMode(next){
    if(next===mode)return;
    mode=next;for(const name of ['desktop','touch','gamepad'])body.classList.toggle('input-'+name,name===next);
    events.mode?.(next);
  }
  const prefersTouch=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
  setMode(prefersTouch?'touch':'desktop');

  // Keyboard and mouse
  addEventListener('keydown',e=>{if(!['Shift','Control','Alt','Meta','CapsLock'].includes(e.key))setMode('desktop');if(MOVE[e.code])keys.add(e.code);if(e.code==='KeyJ')keys.add(e.code);},true);
  addEventListener('keyup',e=>keys.delete(e.code),true);
  addEventListener('pointerdown',e=>setMode(e.pointerType==='mouse'?'desktop':'touch'),{capture:true,passive:true});
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&Math.abs(e.movementX)+Math.abs(e.movementY)>4)setMode('desktop');},{passive:true});

  // Floating touch stick: it appears where the thumb lands and follows a long drag.
  const knobAt=(x,y)=>{stick.style.setProperty('--kx',x+'px');stick.style.setProperty('--ky',y+'px');};
  const placeStick=(clientX,clientY)=>{const box=touch.getBoundingClientRect();touch.style.setProperty('--stick-x',(clientX-box.left)+'px');touch.style.setProperty('--stick-y',(clientY-box.top)+'px');};
  function releaseStick(){
    stickPointer=null;stickBase=null;stickVector.x=0;stickVector.y=0;knobAt(0,0);stick.classList.remove('active');
    touch.style.removeProperty('--stick-x');touch.style.removeProperty('--stick-y');
  }
  stickZone.addEventListener('pointerdown',e=>{
    if(stickPointer!==null||!events.isPlaying())return;
    e.preventDefault();stickZone.setPointerCapture?.(e.pointerId);
    stickPointer=e.pointerId;stickBase={x:e.clientX,y:e.clientY};placeStick(e.clientX,e.clientY);stick.classList.add('active');knobAt(0,0);
  });
  stickZone.addEventListener('pointermove',e=>{
    if(e.pointerId!==stickPointer)return;
    e.preventDefault();
    const radius=Math.max(24,stick.clientWidth*0.42);
    let dx=e.clientX-stickBase.x,dy=e.clientY-stickBase.y,distance=Math.hypot(dx,dy);
    if(distance>radius*1.35){const pull=(distance-radius*1.35)/distance;stickBase.x+=dx*pull;stickBase.y+=dy*pull;placeStick(stickBase.x,stickBase.y);dx=e.clientX-stickBase.x;dy=e.clientY-stickBase.y;distance=Math.hypot(dx,dy);}
    const limited=Math.min(distance,radius),unitX=distance?dx/distance:0,unitY=distance?dy/distance:0;
    knobAt(unitX*limited,unitY*limited);
    if(limited/radius<0.2){stickVector.x=0;stickVector.y=0;}else{stickVector.x=unitX;stickVector.y=unitY;}
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stickZone.addEventListener(name,e=>{if(e.pointerId===stickPointer)releaseStick();});

  // Touch ability buttons fire on contact; holding the main button keeps swinging.
  // A locked skill still reports the press, so the page can say it is not learned yet.
  for(const button of touch.querySelectorAll('[data-ability]')){
    const name=button.dataset.ability;
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);if(!button.classList.contains('locked'))button.classList.add('pressed');if(name==='slash')held.touch=true;events.ability(name);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{button.classList.remove('pressed');if(name==='slash')held.touch=false;});
    button.addEventListener('contextmenu',e=>e.preventDefault());
  }

  // Gamepads (standard mapping). Polled on its own frame loop so menus work while the game is paused.
  function readPad(){for(const pad of navigator.getGamepads?.()||[])if(pad&&pad.connected)return pad;return null;}
  function poll(now=performance.now()){
    const pad=readPad();
    if(!pad){padPrev=[];padMove.x=padMove.y=0;padAim=null;held.pad=false;return false;}
    const pressed=pad.buttons.map(b=>b.pressed||b.value>0.5),edge=index=>pressed[index]&&!padPrev[index];
    const ax=pad.axes[0]||0,ay=pad.axes[1]||0,rx=pad.axes[2]||0,ry=pad.axes[3]||0;
    let mx=Math.abs(ax)>DEAD_ZONE?ax:0,my=Math.abs(ay)>DEAD_ZONE?ay:0;
    if(pressed[PAD.LEFT])mx=-1;if(pressed[PAD.RIGHT])mx=1;if(pressed[PAD.UP])my=-1;if(pressed[PAD.DOWN])my=1;
    padAim=Math.hypot(rx,ry)>0.45?{x:rx,y:ry}:null;
    if(pressed.some(Boolean)||Math.hypot(ax,ay)>0.45||padAim)setMode('gamepad');
    const inMenu=events.isMenuOpen(),idle=!pressed.some(Boolean)&&Math.hypot(ax,ay)<0.4;
    // Input carried over from combat must not choose anything: a menu listens only after the
    // stick is centred and every button released, and an attack held into a menu stays inert after it.
    if(inMenu&&!menuWasOpen)menuArmed=false;
    if(!inMenu&&menuWasOpen)attackGate=true;
    menuWasOpen=inMenu;
    if(inMenu){
      padMove.x=padMove.y=0;held.pad=false;
      if(!menuArmed){menuArmed=idle;navDirection=null;padPrev=pressed;return true;}
      const direction=my<-0.6?'up':my>0.6?'down':mx<-0.6?'left':mx>0.6?'right':null;
      if(direction&&(direction!==navDirection||now-navHeldAt>260)){events.menu.move(direction);navHeldAt=now;}
      navDirection=direction;
      if(edge(PAD.A))events.menu.activate();
      if(edge(PAD.B)||edge(PAD.START))events.menu.back();
      // The menu's second action (on the answer screen: reroll the offer).
      if(edge(PAD.Y))events.menu.alt?.();
    }else if(events.isPlaying()){
      if(attackGate&&!pressed[PAD.A])attackGate=false;
      padMove.x=mx;padMove.y=my;held.pad=pressed[PAD.A]&&!attackGate;
      if(edge(PAD.A))events.ability('slash');
      if(edge(PAD.B))events.ability('dash');
      if(edge(PAD.X))events.ability('pulse');
      if(edge(PAD.Y))events.ability('sunbreak');
      if(edge(PAD.RB)||edge(PAD.RT))events.ability('solarLance');
      if(edge(PAD.LB)||edge(PAD.LT))events.interact();
      if(edge(PAD.START)||edge(PAD.BACK))events.pause();
    }
    padPrev=pressed;return true;
  }
  function padLoop(now){if(poll(now))padFrame=requestAnimationFrame(padLoop);else padFrame=0;}
  addEventListener('gamepadconnected',()=>{padsSeen++;events.notice?.('gamepad');if(!padFrame)padFrame=requestAnimationFrame(padLoop);});
  addEventListener('gamepaddisconnected',()=>{if(!readPad()){padMove.x=padMove.y=0;held.pad=false;events.notice?.('gamepadLost');if(mode==='gamepad')setMode(prefersTouch?'touch':'desktop');}});

  return {
    get mode(){return mode;},
    keys,
    movement(){
      let x=stickVector.x+padMove.x,y=stickVector.y+padMove.y;
      for(const code of keys){const vector=MOVE[code];if(vector){x+=vector[0];y+=vector[1];}}
      return {x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};
    },
    keyboardDirection(){let x=0,y=0;for(const code of keys){const vector=MOVE[code];if(vector){x+=vector[0];y+=vector[1];}}return x||y?{x,y}:null;},
    aim(){if(padAim)return padAim;if(stickVector.x||stickVector.y)return {...stickVector};if(padMove.x||padMove.y)return {...padMove};return null;},
    attackHeld(){return keys.has('KeyJ')||held.touch||held.pad;},
    clear(){keys.clear();held.touch=held.pad=false;if(stickPointer!==null)releaseStick();padMove.x=padMove.y=0;},
    setMode
  };
}
