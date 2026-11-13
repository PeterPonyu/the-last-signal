import {ACTOR_RIGS,RIG_CLIPS,POSE_KEYS} from '../../content/actors.mjs';

const ellipse=(ctx,x,y,rx,ry,fill,stroke=null)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}};
const shape=(ctx,points,fill,stroke='#171a20')=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();};
const line=(ctx,points,color,width=3)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
function metal(ctx,top,bottom,colors){const g=ctx.createLinearGradient(-35,top,45,bottom);g.addColorStop(0,colors[2]);g.addColorStop(0.35,colors[1]);g.addColorStop(0.7,colors[0]);g.addColorStop(1,colors[2]);return g;}
function poseValue(keys,progress,loop=false){
 const phase=loop?((progress%1)+1)%1:Math.max(0,Math.min(1,progress)),position=phase*(loop?8:7),index=Math.floor(position),next=loop?(index+1)%8:Math.min(7,index+1);
 return keys[index]+(keys[next]-keys[index])*(position-index);
}
export function rigPose(actor,time,reduced=false){
 const dead=actor.deathAge!==undefined,casting=actor.spell>0,attacking=actor.attack>0;
 const clip=dead?'death':actor.hit>0||actor.stagger>0?'hurt':casting||actor.chargeWarning>0?'anticipation':attacking||actor.charge>0?'attack':actor.chargeRecovery>0?'recovery':actor.moving?'walk':'idle';
 const progress=dead?actor.deathAge/RIG_CLIPS.death.duration:casting?1-actor.spell/actor.spellDuration:attacking?1-actor.attack/actor.attackDuration:actor.moving?(actor.walkPhase||0)/4:time/RIG_CLIPS.idle.duration+(actor.id||0)*0.17;
 const stride=reduced?0:poseValue(POSE_KEYS.stride,(actor.walkPhase||0)/4,true),idle=reduced?0:poseValue(POSE_KEYS.stride,time/RIG_CLIPS.idle.duration+(actor.id||0)*0.17,true);
 const reach=casting?poseValue(POSE_KEYS.rise,progress)*16:attacking?poseValue(POSE_KEYS.rise,progress)*28:actor.charge>0?28:actor.chargeWarning>0?12:0;
 return {clip,stride:actor.moving?stride:0,bob:actor.moving?Math.abs(stride)*3:idle*1.6,reach,hurt:actor.hit>0||actor.stagger>0?-5:0,death:dead?poseValue(POSE_KEYS.fall,progress):0,frame:Math.min(7,Math.floor((['walk','idle'].includes(clip)?((progress%1)+1)%1:Math.max(0,Math.min(1,progress)))*8))};
}
export function drawRig(ctx,actor,time,reduced=false,opacity=1){
 const key=actor.bossKind||actor.role||(['skirmisher','pack','sentinel','cantor'].includes(actor.type)?actor.type:actor.body),rig=ACTOR_RIGS[key];if(!rig)return false;
 const pose=rigPose(actor,time,reduced),c=rig.palette;
 ctx.save();ctx.translate(actor.x,actor.y+20-pose.bob);ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=2;
 ctx.globalAlpha=opacity;ctx.translate(pose.hurt,0);
 if(pose.death){ctx.rotate(pose.death*0.95);ctx.scale(1,1-pose.death*0.45);}
 if(actor.phaseShift>0)ctx.globalAlpha*=0.65+Math.sin(time*14)*0.2;
 if(actor.lieutenant)ctx.scale(1.22,1.22);
 if(key==='root')drawRoot(ctx,c,pose,actor.phase,time,reduced);
 else if(key==='bell')drawBell(ctx,c,pose,actor.phase,time,reduced);
 else if(key==='crown')drawCrown(ctx,c,pose,actor.phase,time,reduced);
 else if(key==='pack')drawPack(ctx,c,pose);
 else drawFigure(ctx,key,c,pose,rig.kind==='npc',time,reduced);
 ctx.restore();return true;
}
function drawRoot(ctx,c,p,phase,time,reduced){
 const coat=metal(ctx,-170,0,c);
 for(const side of [-1,1]){
  line(ctx,[[side*25,-52],[side*(45+p.stride*8),-15],[side*83,8],[side*104,5]],c[0],22);
  line(ctx,[[side*25,-52],[side*(45+p.stride*8),-15],[side*83,8]],c[1],10);
  line(ctx,[[side*50,-125],[side*(83+p.reach),-85],[side*(96+p.reach),-43]],c[0],21);
  line(ctx,[[side*50,-125],[side*(83+p.reach),-85],[side*(96+p.reach),-43]],c[2],5);
  for(let i=0;i<3;i++)line(ctx,[[side*(96+p.reach),-43],[side*(102+p.reach+i*7),-16-i*8]],c[1],7);
 }
 shape(ctx,[[-48,-145],[-57,-72],[-30,-27],[0,-42],[32,-24],[58,-70],[47,-145]],coat);
 for(let i=-2;i<=2;i++)line(ctx,[[i*15,-138],[i*12+Math.sin(i)*7,-105],[i*16,-58]],c[0],3);
 ellipse(ctx,0,-106,21,30,phase===2?'#ffe1a1':'#a5ca7b',c[2]);
 ellipse(ctx,0,-106,10,17,'#fff3bb');
 shape(ctx,[[-28,-172],[-32,-142],[0,-124],[32,-142],[26,-172],[0,-185]],coat);
 line(ctx,[[-19,-154],[-8,-150]],'#e8f4b5',4);line(ctx,[[8,-150],[19,-154]],'#e8f4b5',4);
 for(const side of [-1,1]){
  line(ctx,[[side*21,-170],[side*47,-200],[side*40,-225]],c[0],12);
  line(ctx,[[side*42,-193],[side*72,-199],[side*92,-219]],c[1],8);
  line(ctx,[[side*47,-200],[side*40,-225]],c[2],3);
  for(let i=0;i<5;i++){const x=side*(42+i*10),y=-203+(i%2)*12+(reduced?0:Math.sin(time*2+i)*2);ellipse(ctx,x,y,13,6,phase===2?'#e5bc67':c[1],c[2]);}
 }
}
function drawBell(ctx,c,p,phase,time,reduced){
 const bronze=metal(ctx,-155,-10,c);
 for(const side of [-1,1]){
  line(ctx,[[side*38,-37],[side*(53+p.stride*9),-11],[side*70,7]],c[0],17);line(ctx,[[side*38,-37],[side*(53+p.stride*9),-11]],c[2],5);
  line(ctx,[[side*60,-158],[side*(89+p.reach*0.4),-100],[side*95,-43]],c[2],7);
  for(let i=0;i<6;i++)ellipse(ctx,side*95,-45-i*9,5,6,null,c[1]);
  shape(ctx,[[side*87,-35],[side*108,-35],[side*112,-13],[side*83,-13]],bronze);
 }
 shape(ctx,[[-61,-142],[-50,-168],[50,-168],[61,-142],[65,-66],[89,-42],[83,-23],[-83,-23],[-89,-42],[-65,-66]],bronze);
 ellipse(ctx,0,-35,83,15,c[0],c[2]);ellipse(ctx,0,-35,57,10,null,c[1]);
 line(ctx,[[-54,-122],[54,-122]],c[2],4);line(ctx,[[-60,-74],[60,-74]],c[2],4);
 for(let i=-2;i<=2;i++)shape(ctx,[[i*21,-113],[i*21+7,-99],[i*21,-84],[i*21-7,-99]],c[0],c[2]);
 const swing=reduced?0:Math.sin(time*2)*8;line(ctx,[[0,-45],[swing,-10]],c[2],6);ellipse(ctx,swing,-8,14,11,c[2],c[0]);
 shape(ctx,[[-25,-180],[0,-203],[25,-180],[18,-160],[-18,-160]],bronze);
 line(ctx,[[-13,-178],[-4,-176]],c[3],4);line(ctx,[[4,-176],[13,-178]],c[3],4);
 if(phase===2){ctx.strokeStyle=c[3];for(let i=0;i<2;i++)ellipse(ctx,0,-95,97+i*8,40+i*9,null,c[3]);}
}
function drawCrown(ctx,c,p,phase,time,reduced){
 const t=reduced?0:time,stone=metal(ctx,-180,-30,c);ctx.translate(0,-20-Math.sin(t*2)*5);
 for(let i=0;i<3;i++){
  ctx.save();ctx.rotate(t*(phase===2?0.6:0.25)+i*Math.PI/3);ellipse(ctx,0,-70,103,32,null,c[2]);ctx.restore();
 }
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const x=side*(48+i*25),y=-105+i*14+Math.sin(t*2+i)*7;
  shape(ctx,[[x,y-30],[x+side*17,y-9],[x+side*11,y+28],[x-side*12,y+8]],stone,c[2]);
 }
 shape(ctx,[[-39,-142],[-30,-57],[0,-17],[30,-57],[39,-142],[0,-169]],stone,c[2]);
 shape(ctx,[[-19,-127],[0,-145],[19,-127],[13,-90],[0,-77],[-13,-90]],'#221e31',c[1]);
 line(ctx,[[-12,-114],[-3,-110]],c[3],4);line(ctx,[[3,-110],[12,-114]],c[3],4);
 shape(ctx,[[-42,-146],[-52,-193],[-24,-178],[0,-214],[24,-178],[52,-193],[42,-146]],stone,c[2]);
 for(const x of [-24,0,24])ellipse(ctx,x,-163,5,8,c[3]);
 ellipse(ctx,0,-57,12,18,phase===2?'#fff3bb':c[3],c[2]);
 for(let i=0;i<4;i++){const a=t+i*Math.PI/2;shape(ctx,[[Math.cos(a)*43,-16+Math.sin(a)*9],[Math.cos(a)*43+5,-10+Math.sin(a)*9],[Math.cos(a)*43,-4+Math.sin(a)*9],[Math.cos(a)*43-5,-10+Math.sin(a)*9]],c[2]);}
}
function drawPack(ctx,c,p){
 for(const side of [-1,1])for(const x of [-25,27])line(ctx,[[x,-23],[x+side*p.stride*8,0],[x+side*12,4]],c[0],7);
 ellipse(ctx,0,-28,38,18,c[1],c[0]);shape(ctx,[[20,-35],[48,-49],[58,-29],[47,-14],[27,-16]],c[1]);
 shape(ctx,[[32,-42],[32,-62],[43,-49]],c[2]);line(ctx,[[43,-35],[51,-33]],c[3],3);line(ctx,[[-32,-29],[-51,-42],[-59,-33]],c[1],8);
}
function drawFigure(ctx,key,c,p,friendly,time,reduced){
 const broad=['thornbound','justiciar','bellsmith','guard','smith','sentinel'].includes(key),w=broad?26:19,cloth=metal(ctx,-78,0,c);
 for(const side of [-1,1]){
  line(ctx,[[side*10,-24],[side*(12+p.stride*5),-7],[side*18,2+p.stride*side*3]],c[0],10);
  line(ctx,[[side*w,-70],[side*(w+12),-44-p.reach*0.5],[side*(w+17),-29-p.reach]],c[1],10);
  ellipse(ctx,side*(w+17),-29-p.reach,5,6,friendly?c[3]:c[2],c[0]);
 }
 shape(ctx,[[-w,-79],[w,-79],[w+7,-23],[12,-9],[0,-17],[-14,-8],[-w-7,-23]],cloth,c[0]);
 line(ctx,[[-w,-62],[w,-62]],c[2],3);line(ctx,[[0,-70],[0,-23]],c[2],2);
 ellipse(ctx,0,-91,13,17,friendly?c[3]:c[0],c[1]);
 shape(ctx,[[-15,-89],[-17,-105],[0,-115],[17,-104],[14,-86],[8,-102],[-5,-104],[-10,-87]],c[0]);
 line(ctx,[[-8,-91],[-3,-91]],friendly?'#493732':c[3],2);line(ctx,[[3,-91],[8,-91]],friendly?'#493732':c[3],2);
 if(key==='sower'||key==='keeper'){
  ellipse(ctx,-30,-27,18,16,'#857349',c[2]);for(let i=0;i<5;i++){line(ctx,[[-38+i*4,-30],[-44+i*6,-59-i%2*8]],c[1],3);ellipse(ctx,-44+i*6,-59-i%2*8,5,3,c[2]);}
 }
 if(['thornbound','guard','sentinel'].includes(key)){
  shape(ctx,[[-28,-69],[-51,-61],[-49,-22],[-32,-10],[-22,-32]],cloth,c[2]);
  if(key==='thornbound')for(const side of [-1,1])line(ctx,[[side*18,-77],[side*36,-106],[side*28,-123],[side*43,-113]],c[2],5);
 }
 if(key==='tender'){
  shape(ctx,[[-60,-95],[-40,-125],[0,-140],[40,-125],[60,-95],[21,-102],[-23,-102]],c[1],c[2]);
  for(let i=-2;i<=2;i++)line(ctx,[[0,-137],[i*22,-99]],c[2],2);
  for(const side of [-1,1])line(ctx,[[side*18,-17],[side*40,-5],[side*52,1]],c[1],6);
 }
 if(['chorister','bellsmith','smith'].includes(key)){
  if(key==='chorister'){for(let i=-1;i<=1;i++){const x=31+i*15;line(ctx,[[x,-116],[x,-72+Math.sin((reduced?0:time)*2+i)*4]],c[2],2);shape(ctx,[[x-5,-75],[x+5,-75],[x+7,-57],[x-7,-57]],c[3],c[1]);}}
  else{line(ctx,[[37,-7],[37,-102-p.reach]],c[2],6);shape(ctx,[[17,-117-p.reach],[61,-117-p.reach],[61,-96-p.reach],[17,-96-p.reach]],cloth,c[2]);}
 }
 if(key==='processional'||key==='courier'){
  if(key==='processional'){line(ctx,[[34,4],[34,-133]],c[2],4);shape(ctx,[[34,-132],[69,-119],[62,-81],[34,-94]],c[1],c[2]);}
  else{shape(ctx,[[-12,-77],[-50,-60-Math.sin((reduced?0:time)*4)*7],[-35,-48],[-3,-69]],c[1],c[2]);ellipse(ctx,25,-36,12,15,c[1],c[2]);}
 }
 if(key==='astral')for(let i=0;i<2;i++){ctx.save();ctx.translate(0,-116);ctx.rotate((reduced?0:time)*0.7+i);ellipse(ctx,0,0,36,13,null,c[3]);ellipse(ctx,36,0,5,5,c[2]);ctx.restore();}
 if(key==='justiciar'||key==='skirmisher')for(const side of [-1,1])shape(ctx,[[side*32,-28-p.reach],[side*54,-68-p.reach],[side*43,-33-p.reach],[side*36,-18-p.reach]],c[2],c[0]);
 if(key==='reaver'){line(ctx,[[40,6],[40,-135]],c[2],4);shape(ctx,[[39,-136],[6,-135],[-20,-114],[9,-124],[39,-122]],c[3],c[1]);}
 if(key==='iria'){ellipse(ctx,26,-39,14,16,'#dbc68c',c[0]);line(ctx,[[26,-49],[26,-39],[34,-34]],c[0],2);}
 if(key==='oren'||key==='cantor'){line(ctx,[[30,0],[30,-116]],c[2],4);shape(ctx,[[18,-111],[43,-111],[47,-87],[14,-87]],c[2],c[0]);}
 if(key==='engineer'){ellipse(ctx,0,-101,17,6,c[1],c[2]);line(ctx,[[34,-18],[34,-83]],c[2],4);ellipse(ctx,34,-85,9,9,null,c[2]);}
 if(key==='archivist'||key==='sera'){shape(ctx,[[22,-63],[42,-70],[59,-61],[58,-38],[40,-46],[22,-38]],c[2],c[0]);line(ctx,[[40,-68],[40,-46]],c[0],2);}
}
