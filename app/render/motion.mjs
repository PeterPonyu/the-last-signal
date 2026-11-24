import {sampleClip,heroPose,companionPose,solPose,castPose} from '../game/animation.mjs';
import {ANIMATIONS} from '../../content/animations.mjs';
import {COMBAT} from '../../content/game.mjs';
import {PARTY} from '../../content/party.mjs';

// Render-side pose smoothing. The simulation's pose functions stay pure; this layer remembers what each actor
// last showed (keyed by stable ids) and adds facing and locomotion hysteresis, light/heavy hit reactions, a held
// firing stance, and continuous 60 fps motion: anticipation, lunge, smear, follow-through, breathing and falls.
export const MOTION={walkAfter:0.08,idleAfter:0.18,segment:0.12,faceHold:0.18,facePersist:0.1,faceClear:0.5,aimClear:0.35,fireHold:0.2,hurtGap:0.6,flash:0.14,smear:0.12,stale:0.5,limit:256};
export const PARTY_HEIGHT={hero:98,companion:96,sol:54};
export const castHeight=a=>a.bossRank==='champion'?164:a.boss?220:a.type==='pack'?64:a.lieutenant?130:a.type==='sentinel'?112:a.npc?96:100;
const PARTY_POSE={hero:heroPose,companion:companionPose,sol:solPose},LOCO=new Set(['idle','walk']),STILL=new Set(['idle','walk','speak','work']);
// Strike profiles in pixels for a 100 px body: anticipation lean-back, lunge, tilts, squash/stretch, rise/drop,
// and the smear (ghost count, spacing, turn, brightness, window; `light` ghosts glow additively). `at` is used when
// a clip has no release. Negative tilts lean back; the return swing rises and turns its smear the other way.
const S=(back,lunge,tiltBack,tiltFwd,squash,stretch,more)=>({back,lunge,tiltBack,tiltFwd,squash,stretch,rise:0,drop:0,smear:0,gap:0,gapY:0,turn:0,bright:1,window:0,light:false,at:null,...more});
const STRIKES={
 hero:{slash:S(3,6,0.05,0.07,0.05,0.07,{smear:3,gap:7,turn:0.07,light:true}),slashReturn:S(1,5,-0.04,-0.05,0.04,0.03,{rise:-2,drop:-2.5,smear:3,gap:6,gapY:3,turn:-0.07,light:true}),
  slashFinisher:S(6,10,0.09,0.11,0.09,0.11,{rise:1,smear:3,gap:10,turn:0.1,bright:1.4,window:0.17,light:true}),
  sunbreak:S(3,5,0.06,0.06,0.07,0.06,{rise:2,smear:3,gap:6,turn:0.04,light:true}),solarLance:S(5,4,0.06,0.035,0.05,0.09,{smear:3,gap:10,light:true}),cast:S(0,-2.5,0,-0.035,0,0.025,{at:0})},
 companion:{cast:S(2,4,0.04,0.05,0.03,0.04),moonCast:S(4,6,0.07,0.07,0.06,0.07,{smear:2,gap:6,turn:0.03,bright:1.2,light:true}),mend:S(0,0,0,0.02,0.04,0.02,{rise:2}),lunarNova:S(2,1,0.03,0.03,0.06,0.05,{rise:3}),ward:S(1,1,0.02,0.03,0.04,0.03,{at:0.45})},
 sol:{solVolley:S(2,-1.5,0.04,-0.06,0.06,0.05,{rise:2}),ward:S(1,0,0.02,-0.03,0.04,0.03,{at:0.45})},
 enemy:{attack:S(4,6,0.07,0.08,0.06,0.06,{at:0.5,smear:2,gap:7,turn:0.05}),cast:S(2,3,0.05,0.05,0.04,0.04)},
 boss:{attack:S(3,5,0.05,0.06,0.05,0.05,{at:0.5,smear:2,gap:6,turn:0.04}),slam:S(0,2,0.02,0.05,-0.05,0.12,{rise:5,drop:3,smear:3,gapY:-9}),cast:S(2,2,0.04,0.04,0.04,0.04)},
 npc:{cast:S(1,2,0.03,0.04,0.03,0.03)}
};
const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const lunge=t=>t<=0?0:Math.exp(-9.9*t)*Math.sin(19.65*t)/0.512;          // peaks at 1 after ~0.06 s, overshoots -0.2 at ~0.22 s
const settle=t=>t<=0?1:t>0.6?0:Math.exp(-12*t)*(Math.cos(17*t)+0.706*Math.sin(17*t)); // 1 -> 0, ~10 % overshoot
const knock=t=>t<=0||t>0.45?0:(1-Math.exp(-t/0.012))*Math.exp(-t/0.1)/0.683;  // fast push, eased return
const still=()=>({offsetX:0,offsetY:0,tilt:0,stretchX:1,stretchY:1});
const neutral=m=>{m.offsetX=m.offsetY=m.tilt=0;m.stretchX=m.stretchY=1;return m;};
const baseOf=clip=>{const i=clip.indexOf('-');return i<0?clip:clip.slice(i+1);};
// Clips that are locomotion or standing loops rather than actions (keepers speak and work in place; guides only idle).
const steady=(npc,clip)=>npc?STILL.has(baseOf(clip))||!clip.includes('-'):LOCO.has(clip);
const familyOf=asset=>!asset||asset.startsWith('hero')?'hero':asset.startsWith('companion')?'companion':asset==='solActions'?'sol':asset.endsWith('Boss')?'boss':asset==='keepersCast'||asset==='guideActions'?'npc':'enemy';

export function createMotionMemory(limit=MOTION.limit){return {actors:new Map(),time:-Infinity,limit,hero:null};}
export const motionMemory=createMotionMemory();
export function resetMotion(memory=motionMemory){memory.actors.clear();memory.time=-Infinity;memory.hero=null;}
function blank(key){return {key,family:'',time:-Infinity,seed:0,x:0,y:0,vx:0,vy:0,alive:true,height:100,face:1,faceAt:-Infinity,want:0,wantAt:0,loco:false,locoAt:-Infinity,move:false,moveAt:0,clip:'',clipAt:0,action:'',progress:0,fireAt:-Infinity,
 hit:0,hurt:0,stagger:0,flashAt:-Infinity,kickAt:-Infinity,kickX:0,kickY:0,kickPower:0,hurtAt:-Infinity,restAt:-Infinity,rx:0,ry:0,rt:0,rsx:0,rsy:0,last:still(),
 pose:null,motion:still(),alpha:1,flash:0,ghosts:0,ghostAlpha:0,ghostX:0,ghostY:0,ghostTilt:0,ghostBlend:'source-over',fadePose:null,fadeAlpha:0,fadeMotion:still(),gray:0};}
// One memory per run: time going backwards (a new run or a restart) clears it; stale actors are pruned past the limit.
function entry(memory,key,time){
 if(time<memory.time-1e-6)resetMotion(memory);
 memory.time=time;
 let s=memory.actors.get(key);
 if(!s){
  if(memory.actors.size>=memory.limit){
   for(const [id,other]of memory.actors)if(time-other.time>1)memory.actors.delete(id);
   if(memory.actors.size>=memory.limit)for(const other of [...memory.actors.values()].sort((a,b)=>a.time-b.time).slice(0,memory.actors.size-Math.floor(memory.limit*0.75)))memory.actors.delete(other.key);
  }
  s=blank(key);memory.actors.set(key,s);
 }
 return s;
}
function seedOf(actor,key){const id=Number(actor.id);if(Number.isFinite(id))return id*0.618034%1;let h=7;for(let i=0;i<key.length;i++)h=(h*31+key.charCodeAt(i))%1009;return h/1009;}
function begin(s,actor,family,time,height){
 const dt=time-s.time,fresh=!(dt>=0&&dt<=MOTION.stale)||s.family!==family;
 if(fresh){
  s.family=family;s.face=actor.faceX<0?-1:1;s.faceAt=-Infinity;s.want=0;s.loco=s.move=!!actor.moving;s.locoAt=-Infinity;s.moveAt=time;s.clip='';s.action='';s.progress=0;s.fireAt=-Infinity;
  s.hit=actor.hit||0;s.hurt=actor.hurt||0;s.stagger=actor.stagger||0;s.flashAt=s.kickAt=s.hurtAt=s.restAt=-Infinity;s.kickPower=0;s.seed=seedOf(actor,s.key);s.vx=s.vy=0;
 }else if(dt>0){
  // Displayed velocity (from interpolated positions) lets smears trail along the real path; teleports are clamped.
  const vx=(actor.x-s.x)/dt,vy=(actor.y-s.y)/dt,speed=Math.hypot(vx,vy),cap=speed>900?900/speed:1;s.vx=vx*cap;s.vy=vy*cap;
 }
 s.time=time;s.x=actor.x;s.y=actor.y;s.alive=!(actor.hp<=0);s.height=height;
 return fresh;
}
// Idle -> walk after continuous movement, walk -> idle after a continuous stop, and no locomotion state shorter than a segment.
function locomotion(s,moving,time,fresh){
 if(fresh)return s.loco;
 if(moving!==s.move){s.move=moving;s.moveAt=time;}
 if(moving!==s.loco&&time-s.moveAt>=(moving?MOTION.walkAfter:MOTION.idleAfter)-1e-9&&time-s.locoAt>=MOTION.segment-1e-9){s.loco=moving;s.locoAt=time;}
 return s.loco;
}
function flip(s,face,time){s.face=face;s.faceAt=time;s.rx=-s.rx;s.rt=-s.rt;s.last.offsetX=-s.last.offsetX;s.last.tilt=-s.last.tilt;}
// mode 0: free (clear, persistent intent and a minimum hold); 1: an action starts and commits its facing; 2: locked in an action.
function facing(s,want,clear,mode,time){
 if(mode===2||!want){s.want=0;return;}
 if(mode===1){if(want!==s.face)flip(s,want,time);s.want=0;return;}
 if(want===s.face||!clear){s.want=0;return;}
 if(s.want!==want){s.want=want;s.wantAt=time;}
 if(time-s.wantAt>=MOTION.facePersist-1e-9&&time-s.faceAt>=MOTION.faceHold-1e-9){flip(s,want,time);s.want=0;}
}
// A hit starts a flash and a knockback away from its likely source: the nearest Hollow for the party and keepers,
// the hero for everyone else; without a source the push goes backwards from the facing.
function impact(memory,s,actor,time,power,family){
 s.flashAt=s.kickAt=time;s.kickPower=power;
 let dx=0,dy=0;
 if(family!=='enemy'&&family!=='boss'){let best=Infinity;for(const o of memory.actors.values()){if((o.family!=='enemy'&&o.family!=='boss')||!o.alive||time-o.time>0.1)continue;const d=(o.x-actor.x)**2+(o.y-actor.y)**2;if(d<best){best=d;dx=actor.x-o.x;dy=actor.y-o.y;}}}
 else if(memory.hero&&time-memory.hero.time<0.5){dx=actor.x-memory.hero.x;dy=actor.y-memory.hero.y;}
 const length=Math.hypot(dx,dy);
 if(length>1){s.kickX=dx/length;s.kickY=dy/length;}else{s.kickX=-s.face;s.kickY=0;}
}

// Anticipation (lean back, squash or rise) -> strike (lunge, stretch) -> follow-through (damped settle).
// Returns seconds since the release, or -1 during the wind-up.
function strike(m,f,p,span,at,k){
 if(p<at){const a=ease(p/at);m.offsetX=-f.back*k*a;m.offsetY=-f.rise*k*a;m.tilt=-f.tiltBack*a;m.stretchX=1+f.squash*0.5*a;m.stretchY=1-f.squash*a;return -1;}
 const t=(p-at)*span,l=lunge(t),push=l>0?l:0,snap=Math.exp(-t/0.035),give=Math.exp(-t/0.05);
 m.offsetX=(f.lunge*l-f.back*snap)*k;m.offsetY=(f.drop*push-f.rise*snap)*k;m.tilt=f.tiltFwd*l-f.tiltBack*snap;
 m.stretchX=1+f.stretch*push+f.squash*0.5*give;m.stretchY=1-f.stretch*0.5*push-f.squash*give;
 return t;
}
// Walks bob twice per cycle and lean into travel with speed; everything else breathes and sways on its own phase.
function ambient(m,family,base,p,time,seed,k,speed){
 if(base==='walk'){const b=0.5-0.5*Math.cos(p*4*Math.PI);m.offsetY=-1.3*k*b;m.tilt=(family==='boss'?0.006:0.01)+0.022*Math.min(1,speed/220)+0.01*b;m.stretchX=1-0.008*b;m.stretchY=1+0.014*b;return;}
 const boss=family==='boss',w=(time/(boss?3.2:family==='enemy'?2.3:2.7)+seed)*6.2832,b=Math.sin(w),amp=boss?0.016:0.012;
 m.stretchY=1+amp*b;m.stretchX=1-amp*0.45*b;m.tilt=0.012*Math.sin(w*0.61+1.7);
 if(base==='speak'){m.offsetY=-0.8*Math.max(0,Math.sin(w*3.1));m.tilt+=0.015*Math.sin(w*2.3);}
 else if(base==='work')m.offsetY=1.2*Math.max(0,Math.sin(p*6.2832));
}
function flinch(m,p,k){const f=p<0.22?ease(p/0.22):1-ease((p-0.22)/0.78);m.offsetX=-4*k*f;m.offsetY=-1.2*k*f;m.tilt=-0.07*f;m.stretchX=1+0.05*f;m.stretchY=1-0.05*f;}
function dash(m,p,k){const d=Math.sin(Math.PI*Math.min(1,Math.max(0,p)));m.offsetY=-2*k*d;m.tilt=0.06*d;m.stretchX=1+0.1*d;m.stretchY=1-0.06*d;}
// Sol's pounce follows the simulation's real leap (leapSpeed px/s for the first 0.33 s): a takeoff crouch, an airborne
// arc whose height grows with the distance travelled, nose up then down, and a squashed landing on the bite.
function leap(m,p,actor,k){
 const t=p*0.55,distance=Math.max(0,actor.leapSpeed||0)*0.33,height=(distance>4?Math.min(22,7+distance*0.09):8)*k;
 if(t<0.33){const u=Math.min(1,Math.max(0,(t-0.04)/0.29)),air=Math.sin(Math.PI*u),crouch=t<0.06?Math.sin(t/0.06*Math.PI):0;
  m.offsetX=0;m.offsetY=-height*air;m.tilt=0.12*(2*u-1)*Math.min(1,u*6,(1-u)*6);m.stretchX=1+0.08*air+0.06*crouch;m.stretchY=1-0.05*air-0.1*crouch;return air;}
 const q=t-0.33,land=Math.exp(-q/0.06),l=lunge(q);m.offsetX=2*k*l;m.offsetY=0;m.tilt=0.06*l;m.stretchX=1+0.1*land;m.stretchY=1-0.12*land;return 0;
}
function dizzy(m,time,seed,k){const w=(time/1.3+seed)*6.2832,b=Math.abs(Math.sin(w));m.tilt=0.045*Math.sin(w);m.offsetX=2.5*k*Math.sin(w+0.6);m.offsetY=-1.2*k*Math.abs(Math.sin(w*2));m.stretchX=1+0.012*b;m.stretchY=1-0.02*b;}
// Painted collapses (hero, Wardens): a recoil from the blow, then a landing squash.
function collapse(m,p,k){const a=ease(p/0.25)*(1-ease((p-0.25)/0.75)),land=p>0.72?Math.max(0,Math.exp(-(p-0.72)*14)*Math.sin((p-0.72)*34)):0;m.offsetX=-3*k*a;m.tilt=-0.05*a;m.stretchX=1+0.035*land;m.stretchY=1-0.035*land;}
function bossFall(m,t,k){const a=ease(t/0.25)*(1-ease((t-0.25)/0.8)),shake=t<0.45?Math.sin(t*55)*1.6*k*(1-t/0.45):0,land=t>0.8?Math.max(0,Math.exp(-(t-0.8)*9)*Math.sin((t-0.8)*26)):0;m.offsetX=shake-3*k*a;m.tilt=-0.035*a;m.stretchX=1+0.04*land;m.stretchY=1-0.04*land;}
// Hollow deaths: the standing recoil frame is knocked back, then pitches over toward the side the painted body lies
// on while the lying frame fades in flat and settles with a small bounce.
function topple(m,t,fall,k){const a=ease(t/0.08),u=Math.min(1,Math.max(0,(t-0.08)/0.32)),g=u*u;m.offsetX=0;m.offsetY=2*k*g;m.tilt=-0.08*a*(1-g)+fall*0.8*g;m.stretchX=1;m.stretchY=1-0.05*g;}
function lying(m,t,fall,k){const v=ease((t-0.32)/0.16),hit=t-0.4,b=hit>0?Math.exp(-hit/0.07):0;m.offsetX=0;m.offsetY=hit>0?-2.2*k*Math.exp(-hit/0.08)*Math.abs(Math.sin(hit*26)):0;m.tilt=fall*0.16*(1-v);m.stretchX=1+0.05*b;m.stretchY=1-0.04*b;}
// Downed allies: casters and keepers topple onto their back (feet on their spot, head behind them) and breathe
// slowly; Sol sinks flat onto its belly. A revive plays the fall backwards as they rise. Returns how grey the body
// is (0..1). Reduced effects lays the body down at once and keeps it still. `h` is the body height in pixels.
function fallen(m,family,actor,time,seed,h,reduced){
 const rising=!actor.downed&&actor.rise>0,age=actor.downAge||0,drop=family==='sol'?0.26:0.36;
 const lie=rising?(reduced?1:ease(actor.rise/PARTY.revive.rise)):reduced?1:Math.min(1,(age/drop)**2);
 const bounce=reduced||rising||age<drop?0:Math.exp(-(age-drop)/0.07)*Math.sin((age-drop)*32);
 const breath=reduced||rising||age<0.6?0:Math.sin((time/2.8+seed)*6.2832);
 if(family==='sol'){m.tilt=0.1*lie;m.offsetY=1.5*lie;m.stretchX=1+0.1*lie+0.05*Math.abs(bounce);m.stretchY=1-0.26*lie+0.015*breath;}
 else{m.tilt=-1.42*lie+0.05*bounce;m.offsetX=0.49*h*Math.sin(1.42*lie);m.offsetY=2*lie;m.stretchX=1+0.06*Math.abs(bounce)+0.018*breath;}
 return rising?lie:reduced?1:Math.min(1,age/0.3);
}

// Shared shape of every clip. Returns seconds since a strike's release (or -1) so callers can place smears.
function shape(m,family,pose,def,actor,p,time,seed,k,speed){
 const clip=pose.clip,base=family==='npc'?baseOf(clip):clip;
 if(clip==='death'){if(family==='boss')bossFall(m,actor.deathAge||0,k);else collapse(m,p,k);return -1;}
 if(clip==='exposed'){dizzy(m,time,seed,k);return -1;}
 if(clip==='hurt'){flinch(m,p,k);return -1;}
 if(clip==='dash'){dash(m,p,k);return -1;}
 if(family==='sol'&&clip==='pounce'){leap(m,p,actor,k);return -1;}
 const f=STRIKES[family]?.[base];
 if(!f){ambient(m,family,base,p,time,seed,k,speed);return -1;}
 const span=(family==='enemy'||family==='boss'?(clip==='cast'?actor.spellDuration:actor.attackDuration):0)||def?.duration||0.5;
 return strike(m,f,p,span,def?.releaseAt??f.at??0.45,k);
}
// Smear ghosts sit behind the body along its motion: the profile's procedural spacing plus the displayed velocity.
function smear(s,count,alpha,gx,gy,turn,blend){
 const trail=0.028,tx=-s.vx*s.face*trail,ty=-s.vy*trail,reach=Math.hypot(tx,ty),cap=reach>26?26/reach:1;
 s.ghosts=count;s.ghostAlpha=Math.min(1,alpha);s.ghostX=gx+tx*cap;s.ghostY=gy+ty*cap;s.ghostTilt=turn;s.ghostBlend=blend;
}
function overlay(m,s,actor,time,k,reduced){
 if(actor.chargeWarning>0){m.offsetX=-2*k+Math.sin(time*52+s.seed*9)*0.7*k;m.offsetY=0;m.tilt=-0.05;m.stretchX=1.04;m.stretchY=0.94;}
 else if(actor.charge>0){m.offsetX=3*k;m.offsetY=-k;m.tilt=0.09;m.stretchX=1.08;m.stretchY=0.95;if(!reduced)smear(s,3,0.75,-3*k,0,0,'source-over');}
 if(actor.phaseShift>0)m.offsetX+=Math.sin(time*47)*1.6*k*Math.min(1,actor.phaseShift/0.3);
}
function animate(s,family,pose,actor,time,reduced,fresh){
 const m=neutral(s.motion),k=Math.sqrt(s.height/100),name=pose.name||pose.clip,def=ANIMATIONS[pose.asset].clips[name],down=baseOf(pose.clip)==='downed',dead=!down&&family!=='npc'&&actor.hp<=0,age=dead?actor.deathAge||0:0,clock=dead?age:time;
 s.pose=pose;s.alpha=1;s.ghosts=0;s.fadeAlpha=0;s.gray=0;
 if(down)s.gray=fallen(m,family,actor,time,s.seed,s.height,reduced);
 else if(dead&&def.fall){
  // Hollow death: knocked back, toppling, then the painted lying frame fades in and settles.
  const stand=def.order[0],lie=def.order[def.order.length-1];
  if(age>=0.32&&age<0.44){const c=ease((age-0.32)/0.12);s.fadePose=pose.column===stand?pose:{...pose,column:stand};s.pose=pose.column===lie?pose:{...pose,column:lie};s.fadeAlpha=Math.min(1,(1-c)*1.6);s.alpha=Math.min(1,c*1.6);
   if(reduced)neutral(s.fadeMotion);else{topple(s.fadeMotion,age,def.fall,k);lying(m,age,def.fall,k);}}
  else if(!reduced){if(age<0.32)topple(m,age,def.fall,k);else lying(m,age,def.fall,k);}
 }else if(!reduced){
  const f=STRIKES[family]?.[family==='npc'?baseOf(pose.clip):pose.clip],t=shape(m,family,pose,def,actor,pose.progress,time,s.seed,k,Math.hypot(s.vx,s.vy)),window=f?.window||MOTION.smear;
  if(f?.smear&&t>=0&&t<window){const w=1-t/window;smear(s,f.smear,w**1.2*f.bright,-f.gap*k*w,f.gapY*k*w,-f.turn*w,f.light?'lighter':'source-over');}
  // Sol's leap trails two amber after-images along its real flight.
  else if(family==='sol'&&pose.clip==='pounce'&&pose.progress<0.6&&Math.hypot(s.vx,s.vy)>120)smear(s,2,0.55*Math.sin(Math.PI*pose.progress/0.6),0,0,0,'lighter');
  if(!dead)overlay(m,s,actor,time,k,reduced);
 }
 // Inertialization: a clip change keeps the previous displacement and lets it settle out with a little overshoot.
 if(fresh){s.rx=s.ry=s.rt=s.rsx=s.rsy=0;s.restAt=-Infinity;s.clip=pose.clip;s.clipAt=time;}
 else if(pose.clip!==s.clip){const l=s.last;s.rx=l.offsetX-m.offsetX;s.ry=l.offsetY-m.offsetY;s.rt=l.tilt-m.tilt;s.rsx=l.stretchX-m.stretchX;s.rsy=l.stretchY-m.stretchY;s.restAt=clock;s.clip=pose.clip;s.clipAt=time;
  // Reduced effects never blends a pose change (a downed ally simply lies down and later stands).
  if(reduced)s.rx=s.ry=s.rt=s.rsx=s.rsy=0;}
 const h=s.restAt===-Infinity?0:settle(clock-s.restAt);
 if(h){m.offsetX+=s.rx*h;m.offsetY+=s.ry*h;m.tilt+=s.rt*h;m.stretchX+=s.rsx*h;m.stretchY+=s.rsy*h;}
 Object.assign(s.last,m);
 const kick=reduced?0:knock(dead?age:time-s.kickAt)*s.kickPower*k;
 if(kick){const local=s.kickX*s.face;m.offsetX+=kick*local;m.offsetY+=kick*s.kickY*0.45;m.tilt+=0.01*kick*local;}
 const flash=dead?age:time-s.flashAt;
 // Big bodies under constant fire flash softer; Reduced effects keeps a calm single pass.
 s.flash=flash>=0&&flash<MOTION.flash?(1-flash/MOTION.flash)**1.5*(reduced?0.4:actor.boss&&s.kickPower<6?0.6:1):0;
}

// What the hero, Dawnweaver or Sol shows this frame.
export function partyDisplay(memory,actor,kind,time,reduced=false){
 const s=entry(memory,kind,time),fresh=begin(s,actor,kind,time,PARTY_HEIGHT[kind]),pose=PARTY_POSE[kind];
 if(kind==='hero'){memory.hero=s;const hurt=actor.hurt||0;if(!fresh&&hurt>s.hurt+1e-3)impact(memory,s,actor,time,5,'hero');s.hurt=hurt;}
 // A hit on the Dawnweaver or Sol is a light hit: a flash and a small knockback, never a pose swap.
 else{const hit=actor.hit||0;if(!fresh&&hit>s.hit+1e-3)impact(memory,s,actor,time,3,kind);s.hit=hit;}
 let loco=locomotion(s,!!actor.moving,time,fresh),shown=pose(actor,loco);
 // Leaving an action resumes locomotion from what the body is doing now, with no hysteresis gap.
 if(LOCO.has(shown.clip)&&s.action){s.locoAt=time;if(loco!==s.move){s.loco=loco=s.move;shown=pose(actor,loco);}}
 // Held firing stance: between auto-fired Sunshards the hero keeps gathering the next one instead of dropping to idle.
 if(kind==='hero'){if(shown.clip==='cast')s.fireAt=time;else if(shown.clip==='idle'&&time-s.fireAt<MOTION.fireHold)shown=sampleClip('heroActions','cast',COMBAT.cast.duration);}
 const act=LOCO.has(shown.clip)?'':shown.clip,restart=!!act&&(act!==s.action||shown.progress<s.progress-0.25),fx=actor.faceX||0;
 let mode=act?2:0,clear=true;
 if(restart&&act!=='hurt'&&act!=='death')mode=kind==='hero'&&Math.abs(fx)<(act==='cast'?MOTION.aimClear:0.05)?2:1;
 if(kind==='hero')clear=Math.abs(fx)>=MOTION.faceClear;
 // Followers turn while they are seen walking (or when an action commits), never by shuffling in place.
 else if(!act&&!loco)mode=2;
 else if(actor.moving){const v=Math.hypot(actor.vx||0,actor.vy||0);clear=v<1||Math.abs(actor.vx||0)>=v*0.5;}
 facing(s,fx<-0.02?-1:fx>0.02?1:0,clear,mode,time);
 s.action=act;s.progress=shown.progress;
 animate(s,kind,shown,actor,time,reduced,fresh);
 return s;
}
// What a Hollow, champion, Warden, corpse or keeper shows this frame (keys: 'e'+id for enemies and their remains, 'n'+id for keepers).
export function castDisplay(memory,actor,time,reduced=false,height=castHeight(actor)){
 const npc=!!(actor.npc||actor.body),family=npc?'npc':actor.boss&&actor.bossRank!=='champion'&&actor.bossKind?'boss':'enemy';
 const s=entry(memory,(npc?'n':'e')+actor.id,time),fresh=begin(s,actor,family,time,height),hit=actor.hit||0,stagger=actor.stagger||0;
 // Light hits flash and nudge; only a heavy hit (melee or Sunbreak stagger) flinches, at most once per hurt gap.
 if(!fresh&&(hit>s.hit+1e-3||stagger>s.stagger+1e-3)){
  const heavy=stagger>s.stagger+1e-3;
  impact(memory,s,actor,time,heavy?6:actor.boss?1.2:3,family);
  if(heavy&&family==='enemy'&&actor.hp>0&&time-s.hurtAt>=MOTION.hurtGap)s.hurtAt=time;
 }
 s.hit=hit;s.stagger=stagger;
 const hurt=family==='enemy'?time-s.hurtAt:-1,clock=reduced?0:time+s.seed*3;
 let loco=locomotion(s,!!actor.moving,time,fresh),shown=castPose(actor,clock,loco,hurt);
 if(steady(npc,shown.clip)&&s.action){s.locoAt=time;if(loco!==s.move){s.loco=loco=s.move;shown=castPose(actor,clock,loco,hurt);}}
 const act=steady(npc,shown.clip)?'':shown.clip,restart=!!act&&(act!==s.action||shown.progress<s.progress-0.25);
 facing(s,(actor.faceX||1)<0?-1:1,true,act?(restart&&act!=='hurt'&&act!=='death'&&act!=='exposed'?1:2):0,time);
 s.action=act;s.progress=shown.progress;
 animate(s,family,shown,actor,time,reduced,fresh);
 return s;
}
// Stateless motion for one pose, used where no memory exists (studios, the legacy renderer path).
export function poseMotion(actor,pose,reduced=false){
 const m=still();if(reduced)return m;
 const family=familyOf(pose.asset),def=pose.asset?ANIMATIONS[pose.asset]?.clips[pose.name||pose.clip]:null,p=Number.isFinite(pose.progress)?pose.progress:1;
 shape(m,family,pose,def,actor,p,actor.idlePhase||0,0,Math.sqrt((PARTY_HEIGHT[family]||100)/100),actor.speed||0);
 return m;
}
