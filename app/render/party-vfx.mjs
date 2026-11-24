// Recruited teammates, party health bars, the downed marker and revive ring, and party moments
// (revive, recruit arrival, forge burst). Owned by the party worker.
import {PARTY} from '../../content/party.mjs';
import {allyBodies} from '../game/ally-ai.mjs';
import {allyName,allyRole} from '../game/party.mjs';
import {clamp,distance} from '../game/geometry.mjs';
import {renderPosition,visibleAt} from './presentation.mjs';
import {drawCast} from './cast.mjs';
import {drawDecal,rimLine,caption,drawGlyph,glyph,alpha,TONES,GROUND,DECAL} from './decal.mjs';
import {ENERGY} from './combat-vfx.mjs';

const TAU=Math.PI*2,ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const BODY={companion:96,sol:54,recruit:96},MARK={companion:'eclipse',sol:'spark',recruit:'rune'};
const colorOf=ally=>ally.color||(ally.kind==='sol'?ENERGY.amber:ally.kind==='companion'?ENERGY.pearl:'#dfeaff');
const heightOf=ally=>BODY[ally.kind]||96;
const shown=ally=>ally?.ally&&ally.maxHp>0&&(ally.kind!=='sol'||ally.active);

// A recruited keeper: their keeper sprite and clips, with a small rune gathering in the hand before each cast.
export function drawRecruit(ctx,images,ally,run,reduced=false,uiScale=1){
  const time=run?.time||0;
  drawCast(ctx,images,{...ally,npc:true},time,reduced,1);
  if(ally.downed||!(ally.cast>0.28)||reduced)return;
  const charge=clamp((0.6-ally.cast)/0.32,0,1),face=ally.faceX<0?-1:1;
  ctx.save();ctx.beginPath();glyph(ctx,'rune',ally.x+face*22,ally.y-48,time*4,4+7*charge);
  ctx.fillStyle=alpha(colorOf(ally),0.45+0.5*charge);ctx.fill();ctx.restore();
}

// Ground pass (under every body): the revive zone of a downed ally while Zeyu is close, built from the shared
// decal recipe at its true reach and filled by the revive's progress.
export function drawPartyGround(ctx,run,camera,reduced=false,uiScale=1,alpha=1){
  const hero=renderPosition(run.player,alpha),reach=PARTY.revive.reach;
  for(const ally of allyBodies(run)){
    if(!shown(ally)||!ally.downed)continue;
    const at=renderPosition(ally,alpha),fade=clamp((reach+130-distance(at,hero))/90,0,1);
    if(fade<=0||!visibleAt(at,camera,reach+40))continue;
    drawDecal(ctx,at.x,at.y+GROUND,reach,TONES.recovery,{progress:ally.revive||0,glint:!!ally.assisted,alpha:fade,reduced,time:reduced?0:run.time,scale:uiScale});
  }
}

// Top pass (after every body): compact health bars over hurt allies, the downed marker with its countdown, the
// revive ring's rim while Zeyu is close, the names of keepers who just joined, and the party's moments.
export function drawPartyBars(ctx,run,camera,uiScale=1,alpha=1,reduced=false){
  const scale=uiScale||1,hero=renderPosition(run.player,alpha);
  for(const ally of allyBodies(run)){
    if(!shown(ally))continue;
    const at=renderPosition(ally,alpha);
    if(!visibleAt(at,camera,140))continue;
    if(ally.downed){drawDowned(ctx,run,ally,at,hero,scale);continue;}
    const top=at.y+GROUND-heightOf(ally)-12*scale;
    if(ally.hp<ally.maxHp-0.5||ally.shield>0)drawBar(ctx,ally,at.x,top,scale);
    if(ally.kind==='recruit'&&ally.joinedArea===run.areaIndex&&run.areaTime<5)drawJoined(ctx,ally,at.x,top,scale,run.areaTime);
  }
  drawPartyEffects(ctx,run,camera,reduced);
}

function drawBar(ctx,ally,x,y,scale){
  const share=clamp(ally.hp/ally.maxHp,0,1),width=(ally.kind==='sol'?34:44)*scale,h=4*scale,left=x-width/2,pad=1.5*scale;
  ctx.save();
  ctx.fillStyle='#101b1ee6';ctx.fillRect(left-pad,y-pad,width+pad*2,h+pad*2);
  ctx.fillStyle=share<0.3?'#ffad81':'#95e4d0';ctx.fillRect(left,y,width*share,h);
  // The owner's colour marks the bar's left edge; a ward shows as an amber cap.
  ctx.fillStyle=colorOf(ally);ctx.fillRect(left-pad,y-pad,2*scale,h+pad*2);
  if(ally.shield>0){ctx.fillStyle='#ffd27acc';ctx.fillRect(left,y-3*scale,width*Math.min(1,ally.shield/24),2*scale);}
  ctx.restore();
}

function drawDowned(ctx,run,ally,at,hero,scale){
  const reach=PARTY.revive.reach,tone=TONES.recovery,progress=clamp(ally.revive||0,0,1),ground=at.y+GROUND;
  const fade=clamp((reach+130-distance(at,hero))/90,0,1);
  if(fade>0){
    // The ring's rim at the true revive reach; its bright arc is the revive so far.
    ctx.save();ctx.globalAlpha*=fade;
    rimLine(ctx,at.x,ground,reach,tone,ally.assisted?1:0.7);
    if(progress>0){ctx.beginPath();ctx.arc(at.x,ground,reach,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.lineCap='round';ctx.strokeStyle=alpha(tone.rim,0.95);ctx.lineWidth=DECAL.rim+1.8;ctx.stroke();}
    ctx.restore();
  }
  // Marker: a stone-grey medallion over the lying body with the ally's mark and a countdown ring.
  const r=11*scale,y=at.y-(ally.kind==='sol'?34:44);
  ctx.save();
  ctx.fillStyle=alpha('#0e1414',0.88);ctx.beginPath();ctx.arc(at.x,y,r,0,TAU);ctx.fill();
  ctx.strokeStyle=alpha(TONES.locked.ink,0.95);ctx.lineWidth=1.4*scale;ctx.stroke();
  if(progress>0){ctx.beginPath();ctx.arc(at.x,y,r+2.6*scale,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.lineCap='round';ctx.strokeStyle=tone.ink;ctx.lineWidth=2.2*scale;ctx.stroke();}
  drawGlyph(ctx,MARK[ally.kind]||'rune',at.x,y,-Math.PI/2,6.5*scale,alpha(colorOf(ally),0.9));
  ctx.restore();
  caption(ctx,ally.assisted?'Reviving':'Back in '+Math.max(1,Math.ceil(ally.reviveIn||0))+'s',at.x,y-r-12*scale,ally.assisted?tone:TONES.locked,scale);
}

// A keeper who joined at this map's start: their name and role over their head for the first seconds.
function drawJoined(ctx,ally,x,top,scale,age){
  const fade=Math.min(clamp(age/0.4,0,1),clamp(5-age,0,1));if(fade<=0)return;
  ctx.save();ctx.globalAlpha*=fade;
  caption(ctx,allyName(ally),x,top-30*scale,{rim:'#fff4dc'},scale);
  caption(ctx,allyRole(ally),x,top-12*scale,{rim:colorOf(ally)},scale);
  ctx.restore();
}

const FX=new Set(['ally-burst','ally-down','ally-up','recruit-join']);
function drawPartyEffects(ctx,run,camera,reduced){
  for(const fx of run.effects){
    if(!FX.has(fx.kind)||!(fx.life>0)||fx.age>=fx.life||!visibleAt(fx,camera,160))continue;
    const t=clamp(fx.age/fx.life,0,1);
    ctx.save();ctx.lineCap='round';
    if(fx.kind==='ally-burst')forgeBurst(ctx,fx,t,reduced);
    else if(fx.kind==='ally-down')dust(ctx,fx);
    else if(fx.kind==='ally-up')rising(ctx,fx,t,reduced,TONES.recovery.glow,TONES.recovery.rim);
    else rising(ctx,fx,t,reduced,TONES.objective.glow,ENERGY.white,true);
    ctx.restore();
  }
}
// Forge sparks: a hot core over the struck Hollow and sparks thrown out to the burst's true radius.
function forgeBurst(ctx,fx,t,reduced){
  const r=fx.radius||80,y=fx.y-18,g=ctx.createRadialGradient(fx.x,y,0,fx.x,y,r*(0.45+0.55*ease(t*2)));
  g.addColorStop(0,alpha('#fff0c8',0.75*(1-t)));g.addColorStop(0.45,alpha('#ffb46b',0.45*(1-t)));g.addColorStop(1,alpha('#ff8a4c',0));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(fx.x,y,r,0,TAU);ctx.fill();
  if(reduced)return;
  ctx.beginPath();
  for(let i=0;i<8;i++){const a=i*TAU/8+0.3,d=r*(0.25+0.75*ease(t));glyph(ctx,'spark',fx.x+Math.cos(a)*d,y+Math.sin(a)*d*0.7,a,7*(1-t)+2);}
  ctx.fillStyle=alpha('#ffd9a8',1-t);ctx.fill();
}
// Falling down: one small dust puff at the feet (simple feedback, gone within 0.35 s).
function dust(ctx,fx){
  const s=clamp(fx.age/0.35,0,1);if(s>=1)return;
  ctx.fillStyle=alpha('#cbbfa6',0.35*(1-s));ctx.beginPath();ctx.ellipse(fx.x,fx.y+GROUND,12+12*s,4+4*s,0,0,TAU);ctx.fill();
}
// Revive (mint) and a keeper's arrival (gold): a column of light over the body and a ring opening at the feet.
function rising(ctx,fx,t,reduced,glow,rim,descend=false){
  const fade=t<0.2?t/0.2:1-(t-0.2)/0.8,foot=fx.y+GROUND,top=foot-(descend?170:130)*(descend?1:0.6+0.4*ease(t)),width=34;
  const g=ctx.createLinearGradient(0,foot,0,top);g.addColorStop(0,alpha(glow,0.55*fade));g.addColorStop(1,alpha(glow,0));
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(fx.x,(foot+top)/2,width/2,(foot-top)/2,0,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(fx.x,foot,22+48*ease(t),(22+48*ease(t))*0.45,0,0,TAU);ctx.strokeStyle=alpha(rim,0.8*fade);ctx.lineWidth=2;ctx.stroke();
  if(reduced)return;
  ctx.beginPath();
  for(let i=0;i<5;i++){const p=(t*1.3+i*0.2)%1,dx=Math.sin(i*2.4+t*3)*14;glyph(ctx,descend?'cosmos':'petal',fx.x+dx,descend?top+(foot-top)*p:foot-p*90,descend?Math.PI/2:-Math.PI/2,4+2*(1-p));}
  ctx.fillStyle=alpha(rim,0.85*fade);ctx.fill();
}
