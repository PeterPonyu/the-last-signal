import {drawRig} from './actors.mjs';
import {canvasFont} from './typography.mjs';
import {markerLabel} from './guidance.mjs';
import {JOURNEY,ENEMY_ROLES} from '../../content/journey.mjs';
import {sampleClip} from '../game/animation.mjs';
import {drawSprite} from './sprites.mjs';
import {nearbyInteraction,gatewayPrompt} from '../game/journey.mjs';
import {visibleAt} from './presentation.mjs';
import {glow} from './world.mjs';

const circle=(ctx,x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);};
function label(ctx,text,x,y,role='small'){
  ctx.font=canvasFont(role);ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#171a18';ctx.fillStyle='#fff0c6';ctx.strokeText(text,x,y);ctx.fillText(text,x,y);
}
export function landmarkMotion(kind,time,reduced=false){
  const t=reduced?0:time;
  return {hand:t*Math.PI/15,slowHand:t*Math.PI/180,swing:Math.sin(t*1.7)*0.17,orbit:t*0.38,kind};
}
export function drawLandmark(ctx,run,camera,reduced){
  const l=JOURNEY[run.areaIndex].landmark;
  if(l.kind==='clock'){drawGardenClocks(ctx,run,camera,reduced);return;}
  if(!visibleAt(l,camera,240))return;
  const m=landmarkMotion(l.kind,run.time,reduced),lit=Math.min(3,run.campaign.stage);
  ctx.save();ctx.translate(l.x,l.y);glow(ctx,0,0,155,lit?'#f3c65a33':'#9db7ae18');
  ctx.fillStyle='#1a2421e6';ctx.strokeStyle='#d0ac65';ctx.lineWidth=5;
  ctx.save();ctx.scale(1,0.65);circle(ctx,0,0,96);ctx.fill();ctx.stroke();circle(ctx,0,0,86);ctx.lineWidth=1;ctx.stroke();
  for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);ctx.fillStyle=i<lit*4?'#ffdfa2':'#9b845a';ctx.fillRect(-2,-78,4,i%3===0?15:8);ctx.restore();}
  if(l.kind==='sun'){
    for(let i=0;i<3;i++){ctx.save();ctx.rotate(m.orbit+i*Math.PI/3);ctx.strokeStyle=['#d6a968','#e6cf8e','#91bfc5'][i];ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,72,26,0,0,Math.PI*2);ctx.stroke();circle(ctx,72,0,6);ctx.fillStyle='#ffe0a0';ctx.fill();ctx.restore();}
    glow(ctx,0,0,40,'#ffdb8a99');circle(ctx,0,0,16);ctx.fillStyle='#ffe8ae';ctx.fill();
  }else{ctx.strokeStyle='#a8d6ce';ctx.lineWidth=2;for(let i=0;i<3;i++){circle(ctx,0,0,20+(((reduced?0:run.time)*20+i*23)%62));ctx.stroke();}}
  ctx.restore();
  if(l.kind==='bell'){
    ctx.fillStyle='#8b764c';ctx.fillRect(-62,-130,12,120);ctx.fillRect(50,-130,12,120);ctx.fillRect(-64,-139,128,14);
    ctx.save();ctx.translate(0,-130);ctx.rotate(m.swing);ctx.fillStyle='#d4b579';ctx.strokeStyle='#f7d99b';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-15,15);ctx.quadraticCurveTo(-35,25,-34,70);ctx.lineTo(-44,85);ctx.lineTo(44,85);ctx.lineTo(34,70);ctx.quadraticCurveTo(35,25,15,15);ctx.closePath();ctx.fill();ctx.stroke();circle(ctx,0,90,7);ctx.fillStyle='#d6e6cc';ctx.fill();ctx.restore();
  }
  label(ctx,l.name,0,l.kind==='bell'?-157:91,'small');ctx.restore();
}
function drawGardenClocks(ctx,run,camera,reduced){
  const m=landmarkMotion('clock',run.time,reduced);
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const x=col*1200+(col%2?602:598),y=row*800+(row%2?447:353);
    if(!visibleAt({x,y},camera,210))continue;
    ctx.save();ctx.translate(x,y);ctx.scale(1,0.9);
    glow(ctx,0,0,165,'#f6d47718');ctx.strokeStyle='#e9c57a99';ctx.lineWidth=2;circle(ctx,0,0,135);ctx.stroke();
    for(let i=0;i<12;i++){ctx.save();ctx.rotate(i*Math.PI/6);ctx.fillStyle='#fff0ba99';ctx.fillRect(-2,-133,4,9);ctx.restore();}
    for(const [angle,length,width] of [[m.hand,115,4],[m.slowHand,78,7]]){
      ctx.save();ctx.rotate(angle-0.75);ctx.strokeStyle='#382d1a77';ctx.lineWidth=width+3;ctx.beginPath();ctx.moveTo(5,6);ctx.lineTo(length+5,6);ctx.stroke();
      ctx.strokeStyle='#ffdf86';ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(length,0);ctx.stroke();ctx.restore();
    }
    circle(ctx,0,0,7);ctx.fillStyle='#ffe6a0';ctx.fill();ctx.restore();
  }
}
export function drawGuide(ctx,images,run,reduced,guidance=true,scale=1,npc=run.campaign.npcs[0]){
  const near=nearbyInteraction(run)?.id===npc.id;
  ctx.save();glow(ctx,npc.x,npc.y-24,72,near?'#e3c67844':'#d5dab41c');
  if(!drawRig(ctx,npc,run.time,reduced))drawSprite(ctx,images,sampleClip('guideActions',['iria','oren','sera'][run.areaIndex],reduced?0:run.time),npc.x,npc.y,94,1);
  if(near||npc.id===run.campaign.npcs[0].id)markerLabel(ctx,'guide',guidance&&near?'Speak to '+npc.name+' · F':npc.name,npc.x,npc.y-112,scale);
  ctx.restore();
}
export function drawGateway(ctx,run,camera,reduced,guidance=true,scale=1){
  const gate=JOURNEY[run.areaIndex].exit;if(!visibleAt(gate,camera,230))return;
  const open=run.gateOpen,showLabels=open||!run.bossSpawned,t=reduced?0:run.time;
  ctx.save();ctx.translate(gate.x,gate.y);glow(ctx,0,-40,150,open?'#ffcd6a66':'#8cb5ac22');
  ctx.strokeStyle=open?'#edce8e':'#7b8f88';ctx.fillStyle='#252f2beb';ctx.lineWidth=7;
  ctx.beginPath();ctx.moveTo(-72,20);ctx.lineTo(-72,-93);ctx.quadraticCurveTo(0,-187,72,-93);ctx.lineTo(72,20);ctx.stroke();
  ctx.lineWidth=17;ctx.strokeStyle='#443d30';ctx.beginPath();ctx.moveTo(-85,28);ctx.lineTo(-85,-94);ctx.moveTo(85,28);ctx.lineTo(85,-94);ctx.stroke();
  ctx.lineWidth=2;ctx.strokeStyle='#d1b578';ctx.strokeRect(-93,-100,16,125);ctx.strokeRect(77,-100,16,125);
  if(open){
    ctx.fillStyle='#e4bc6024';ctx.beginPath();ctx.ellipse(0,-45,59,86,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<12;i++){const y=15-((t*23+i*13)%150);ctx.globalAlpha=0.25+0.5*Math.sin((15-y)/150*Math.PI);ctx.fillStyle='#ffe3a1';ctx.fillRect(Math.sin(i*8.3)*48,y,3,5);}ctx.globalAlpha=1;
    ctx.strokeStyle='#ffe8af';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-17,-38);ctx.lineTo(17,-38);ctx.lineTo(5,-50);ctx.moveTo(17,-38);ctx.lineTo(5,-26);ctx.stroke();
  }else{ctx.strokeStyle='#83b4aa';ctx.lineWidth=3;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-58,-80+i*28);ctx.lineTo(58,-80+i*28);ctx.stroke();}if(showLabels)label(ctx,'Sealed',0,-26,'small');}
  if(showLabels){
    label(ctx,gate.name,0,-172,'label');
    markerLabel(ctx,'gate',gatewayPrompt(run),0,62,scale);
    if(guidance&&!open)label(ctx,'Resolve the gathering, then defeat the Warden',0,106,'small');
  }
  ctx.restore();
}
export function drawRoleAdornment(ctx,e,time,reduced){
  if(e.hp<=0)return;
  const role=ENEMY_ROLES[e.role];if(!role&&!e.boss)return;
  const color=role?.color||'#f1cb7f',mark=role?.mark||['branches','chimes','orbit'][e.areaIndex||0],t=reduced?0:time;
  ctx.save();ctx.translate(e.x,e.y-(e.boss?112:77));ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=e.boss?3:2;
  const cast=e.spell>0?Math.sin((1-e.spell/e.spellDuration)*Math.PI)*7:0;
  if(mark==='orbit'||mark==='chimes'){
    ctx.save();ctx.rotate(mark==='orbit'?t*0.6:Math.sin(t*2)*0.12);ctx.beginPath();ctx.ellipse(0,-5,25+cast,mark==='orbit'?11:20,0,0,Math.PI*2);ctx.stroke();
    for(const x of [-20,0,20]){circle(ctx,x,-5,3);ctx.fill();}ctx.restore();
  }else if(mark==='banner'){
    ctx.beginPath();ctx.moveTo(26,65);ctx.lineTo(26,-18);ctx.lineTo(49,-11+Math.sin(t*3)*3);ctx.lineTo(26,4);ctx.stroke();
  }else{
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*14,10);ctx.lineTo(side*(22+cast),-17);ctx.lineTo(side*11,-8);ctx.moveTo(side*20,-6);ctx.lineTo(side*32,-12);ctx.stroke();}
    if(mark==='blades'){ctx.beginPath();ctx.moveTo(-32,30);ctx.lineTo(-42,-17);ctx.moveTo(32,30);ctx.lineTo(42,-17);ctx.stroke();}
  }
  if(e.boss||role.tier==='Elite'){ctx.beginPath();ctx.moveTo(-8,-24);ctx.lineTo(0,-32);ctx.lineTo(8,-24);ctx.lineTo(0,-16);ctx.closePath();ctx.stroke();}
  ctx.restore();
  if(role&&(e.spell>0||e.chargeWarning>0))label(ctx,role.name,e.x,e.y-117,'small');
}
