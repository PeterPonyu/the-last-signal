// The Last Signal score and sound effects, rendered in one AudioWorklet: an adaptive procedural soundtrack
// (five map themes, a title theme and scene variants with layered intensity) plus a pooled effects synth,
// a shared room, and a master limiter. No imports: tests also evaluate this file as a plain script.
const FS=sampleRate,INV=1/FS,TAU=Math.PI*2,TABLE=4096,MASK=4095,SIN=new Float32Array(TABLE+1);
for(let i=0;i<=TABLE;i++)SIN[i]=Math.sin(i/TABLE*TAU);
// Phase in cycles, valid from -16 upward (FM pushes phases slightly negative).
function sin1(p){const x=(p+16)*TABLE,i=x|0,j=i&MASK;return SIN[j]+(x-i)*(SIN[j+1]-SIN[j]);}
function blep(t,dt){let v=2*t-1;if(t<dt){const x=t/dt;v-=x+x-x*x-1;}else if(t>1-dt){const x=(t-1)/dt;v-=x*x+x+x+1;}return v;}
const hz=n=>440*2**((n-69)/12),clamp=(v,a,b)=>v<a?a:v>b?b:v,ease=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const RNG=new Uint32Array([0x2545f491]);
function rand(){let x=RNG[0];x^=x<<13;x^=x>>>17;x^=x<<5;RNG[0]=x;return RNG[0]/4294967296;}
const MODES={ionian:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],lydian:[0,2,4,6,7,9,11],aeolian:[0,2,3,5,7,8,10]};
const degree=(scale,d)=>{const o=Math.floor(d/7);return scale[d-o*7]+12*o;};
// Layers: base material, calm-only texture, combat (enemy pressure), boss, Warden phase two, danger.
const BASE=0,CALM=1,COMBAT=2,BOSS=3,BOSS2=4,DANGER=5;

// Instrument presets. k: 0 tone, 1 plucked string, 2 chord pad. w: 0 sine, 1 saw, 2 triangle, 3 noise only.
// a attack s, d/r decay/release time constants, s sustain; mr/mi/ms/mt FM ratio, index, floor, decay;
// dt detuned twin; p0/pt pitch-glide start ratio and time; vd/vr/vw vibrato; td/tr tremolo; nz/nd noise;
// fl filter (1 low, 2 band, 3 high) fc/fk/q/fe/ft cutoff, key tracking, resonance, envelope; br/t60 pluck;
// h2/pd pad overtone and detune; rv/ec reverb and echo sends; hz fixed pitch; to tonal drum octave.
const DEF={k:0,w:0,g:0.2,a:0.005,d:0.3,s:0,r:0.15,mr:0,mi:0,ms:0,mt:0,dt:0,p0:1,pt:0.02,vd:0,vr:5,vw:0,td:0,tr:6,nz:0,nd:0,fl:0,fc:1000,fk:0,q:0.707,fe:0,ft:0.1,br:0.5,t60:1,h2:0,pd:0.004,rv:0.2,ec:0,hz:0,to:-24,tab:null};
// Sine pads read one table holding the fundamental plus their octave overtone.
const PAD_TABLES=new Map();
function padTable(h2){
  if(!PAD_TABLES.has(h2)){const t=new Float32Array(TABLE+1);for(let i=0;i<=TABLE;i++)t[i]=Math.sin(i/TABLE*TAU)+h2*Math.sin(2*i/TABLE*TAU);PAD_TABLES.set(h2,t);}
  return PAD_TABLES.get(h2);
}
const ins=o=>{const P=Object.assign({},DEF,o);if(P.k===2&&P.w!==1)P.tab=padTable(P.h2);return P;};
const I={
  flute:ins({mr:1,mi:0.7,ms:0.28,mt:0.25,a:0.035,d:0.5,s:0.62,r:0.14,vd:0.006,vr:5.2,vw:0.2,nz:0.1,nd:0.05,fl:1,fc:5200,g:0.3,rv:0.32,ec:0.08}),
  fiddle:ins({w:1,dt:0.003,a:0.07,d:0.5,s:0.78,r:0.16,vd:0.007,vr:5.6,vw:0.14,fl:1,fc:900,fk:1.6,q:0.9,fe:900,ft:0.18,g:0.16,rv:0.32}),
  ostf:ins({w:1,dt:0.003,a:0.008,d:0.1,s:0.15,r:0.05,fl:1,fc:900,fk:1.4,fe:1600,ft:0.05,g:0.12,rv:0.2}),
  harp:ins({k:1,br:0.55,t60:1.5,g:0.24,rv:0.36,ec:0.05}),
  pbass:ins({k:1,br:0.28,t60:1.1,g:0.46,rv:0.08}),
  drone:ins({w:1,dt:0.004,a:0.9,d:1,s:1,r:1.1,fl:1,fc:380,q:1.1,g:0.12,rv:0.3}),
  warm:ins({k:2,h2:0.28,pd:0.004,a:0.7,d:1,s:1,r:1.0,g:0.13,rv:0.45}),
  bodhran:ins({hz:96,p0:1.9,pt:0.03,a:0.001,d:0.15,nz:0.35,nd:0.02,fl:1,fc:900,g:0.5,rv:0.15}),
  frame:ins({hz:68,p0:1.6,pt:0.04,a:0.001,d:0.34,nz:0.15,nd:0.02,fl:1,fc:600,g:0.42,rv:0.2}),
  shaker:ins({w:3,nz:1,a:0.003,d:0.035,fl:2,fc:6500,q:0.9,g:0.15,rv:0.1}),
  wardrum:ins({hz:56,p0:2.3,pt:0.035,a:0.001,d:0.3,nz:0.45,nd:0.04,fl:1,fc:700,g:0.62,rv:0.25}),
  crash:ins({w:3,nz:1,a:0.004,d:0.9,fl:3,fc:5200,g:0.1,rv:0.35}),
  bell:ins({mr:3.5,mi:2.2,ms:0.25,mt:0.35,a:0.002,d:0.8,r:0.8,g:0.19,rv:0.38,ec:0.38}),
  handbell:ins({mr:2,mi:1.4,ms:0.2,mt:0.25,a:0.002,d:0.6,r:0.5,g:0.15,rv:0.4,ec:0.4}),
  towerbell:ins({mr:2.76,mi:3.2,ms:0.4,mt:0.9,a:0.003,d:1.6,g:0.24,rv:0.5,ec:0.2,to:-24}),
  mist:ins({k:2,h2:0.14,pd:0.006,a:1.2,d:1,s:1,r:1.0,g:0.11,rv:0.55,ec:0.1}),
  woodhi:ins({hz:1180,a:0.001,d:0.035,nz:0.25,nd:0.006,fl:2,fc:2200,q:1.2,g:0.14,ec:0.35}),
  woodlo:ins({hz:760,a:0.001,d:0.045,nz:0.2,nd:0.006,fl:2,fc:1500,q:1.2,g:0.14,ec:0.35}),
  taiko:ins({hz:80,p0:1.7,pt:0.04,a:0.001,d:0.33,nz:0.4,nd:0.05,fl:1,fc:520,g:0.6,rv:0.3,ec:0.12}),
  rim:ins({hz:420,a:0.001,d:0.03,nz:0.6,nd:0.03,fl:2,fc:2600,q:1.2,g:0.22,rv:0.2,ec:0.3}),
  sub:ins({a:0.02,d:0.7,s:0.8,r:0.25,g:0.26,rv:0.05}),
  brass:ins({w:1,dt:0.0025,a:0.05,d:0.35,s:0.8,r:0.18,fl:1,fc:420,fk:1.4,q:1.2,fe:2400,ft:0.12,vd:0.005,vr:5,vw:0.25,g:0.16,rv:0.38}),
  strings:ins({k:2,w:1,pd:0.004,a:0.35,d:1,s:1,r:0.6,fl:1,fc:1500,q:0.7,g:0.075,rv:0.48}),
  stab:ins({k:2,w:1,pd:0.003,a:0.012,d:0.22,s:0.2,r:0.14,fl:1,fc:900,q:0.8,fe:2200,ft:0.08,g:0.1,rv:0.32}),
  lowstr:ins({w:1,dt:0.004,a:0.012,d:0.14,s:0.35,r:0.07,fl:1,fc:500,fk:1,q:0.8,fe:700,ft:0.08,g:0.18,rv:0.25}),
  pizz:ins({k:1,br:0.4,t60:0.45,g:0.34,rv:0.32}),
  timpani:ins({p0:1.12,pt:0.05,a:0.002,d:0.5,nz:0.25,nd:0.05,fl:1,fc:380,g:0.5,rv:0.42,to:-24}),
  snare:ins({hz:190,p0:1.3,pt:0.02,a:0.001,d:0.07,nz:0.9,nd:0.11,fl:2,fc:3200,q:0.6,g:0.28,rv:0.25}),
  horn:ins({w:1,dt:0.003,a:0.08,d:0.5,s:0.8,r:0.2,fl:1,fc:340,fk:1.2,q:1.4,fe:900,ft:0.2,g:0.22,rv:0.28}),
  anvil:ins({hz:1320,mr:2.76,mi:4,ms:0.3,mt:0.03,a:0.001,d:0.32,nz:0.3,nd:0.008,fl:3,fc:400,g:0.17,rv:0.32,ec:0.1}),
  anvil2:ins({hz:1866,mr:2.76,mi:3.5,ms:0.3,mt:0.03,a:0.001,d:0.26,nz:0.25,nd:0.008,fl:3,fc:400,g:0.13,rv:0.32,ec:0.1}),
  anvilm:ins({mr:2.76,mi:3,ms:0.35,mt:0.04,a:0.001,d:0.5,g:0.14,rv:0.35,ec:0.12}),
  hammer:ins({hz:72,p0:1.8,pt:0.03,a:0.001,d:0.22,nz:0.5,nd:0.04,fl:1,fc:1100,g:0.5,rv:0.2}),
  growl:ins({w:1,dt:0.006,a:0.8,d:1,s:1,r:1.2,fl:1,fc:240,q:2.2,g:0.13,rv:0.22}),
  bellows:ins({w:3,nz:1,a:0.6,d:0.6,fl:2,fc:480,q:1.5,g:0.2,rv:0.3}),
  kick:ins({hz:48,p0:3.2,pt:0.025,a:0.001,d:0.24,nz:0.25,nd:0.006,fl:1,fc:2200,g:0.6}),
  msnare:ins({hz:330,mr:1.41,mi:1.2,mt:0.05,a:0.001,d:0.1,nz:0.8,nd:0.12,fl:2,fc:2800,q:0.7,g:0.26,rv:0.28}),
  hat:ins({w:3,nz:1,a:0.001,d:0.028,fl:3,fc:7500,g:0.11}),
  tick:ins({w:3,nz:1,a:0.001,d:0.016,fl:2,fc:5200,q:2,g:0.13}),
  tom:ins({hz:110,p0:1.5,pt:0.04,a:0.001,d:0.22,nz:0.2,nd:0.03,fl:1,fc:800,g:0.42,rv:0.25}),
  glass:ins({mr:4,mi:0.9,ms:0.1,mt:0.5,a:0.003,d:0.55,r:0.6,g:0.13,rv:0.55,ec:0.38}),
  celesta:ins({mr:2,mi:0.55,mt:0.2,a:0.002,d:0.45,g:0.13,rv:0.45,ec:0.3}),
  mbox:ins({mr:3,mi:1.1,ms:0.1,mt:0.12,a:0.001,d:0.38,g:0.12,rv:0.4,ec:0.25}),
  choir:ins({k:2,h2:0.32,pd:0.006,a:1.4,d:1,s:1,r:1.1,g:0.1,rv:0.6,ec:0.12}),
  ping:ins({a:0.002,d:0.28,g:0.07,rv:0.6,ec:0.5}),
  clap:ins({w:3,nz:1,a:0.001,d:0.09,fl:2,fc:1500,q:0.9,g:0.28,rv:0.4}),
  pulsebass:ins({w:1,a:0.004,d:0.2,s:0.3,r:0.08,fl:1,fc:180,fk:1,q:1.5,fe:1400,ft:0.06,g:0.28}),
  riser:ins({w:1,dt:0.01,p0:0.5,pt:1.6,a:0.8,d:1.5,fl:1,fc:900,q:1,g:0.06,rv:0.5}),
  signal:ins({mr:2,mi:0.7,ms:0.1,mt:0.5,a:0.004,d:0.8,r:0.5,g:0.2,rv:0.45,ec:0.45}),
  mpluck:ins({k:1,br:0.25,t60:0.8,g:0.2,rv:0.35}),
  heart:ins({hz:52,p0:1.4,pt:0.03,a:0.002,d:0.12,g:0.42}),
  trem:ins({w:1,dt:0.008,a:0.25,d:1,s:1,r:0.4,td:0.7,tr:13,fl:1,fc:2200,g:0.045,rv:0.3}),
  wind:ins({w:3,nz:1,a:1.2,d:1.4,fl:2,fc:700,q:1.2,g:0.1,rv:0.5}),
  halo:ins({dt:0.003,a:1.2,d:1,s:1,r:1.0,g:0.13,rv:0.55})
};

// Themes. Lines are bars split by '|'. Melody tokens: scale degree (0 = tonic, accidental # or b), sNN for
// semitones above the tonic, r/t/f/o/R for chord root/third/fifth/octave/low root, then :steps. Pattern
// lines give one character per step (X x o . velocities, digits = chord-tone index, - rest).
// Tracks: [type, instrument, layer, line, {o octave shift, v velocity, sec sections, len, fifth, pan}].
const THEMES={
  garden:{map:1,vol:[0.82,1.08,0.71,0.93],bpm:120,beat:3,steps:12,root:62,mode:'dorian',form:4,rv:0.3,echo:0.5,fb:0.28,
    chords:'0 6 3 0 2 6 3 4',boss:'0 5bM 6 0 0 5bM 6 4M',lead:'flute',leadSec:'1011',pad:'warm',arp:'harp',bell:'celesta',dlg:'flute',drn:'drone',
    motif:'4:3 7:2 8 9:2 8 7:3|8:2 7 6:2 4 6:3 _:3|3:2 5 7:2 5 8:3 7:3|9:2 8 7:2 6 7:6|9:3 11:2 9 8:2 7 9:3|8:2 9 10:2 8 7:3 6:3|5:2 6 7:2 8 7:3 5:3|4:3 8:2 7 6:2 5 4:3',
    tracks:[
      ['mel','fiddle',BASE,'0:6 4:6|1:6 -1:6|-2:6 3:3 5:3|4:9 2:3|2:6 4:3 6:3|1:6 3:3 1:3|-2:3 0:3 1:3 3:3|1:6 4:6',{sec:'0100'}],
      ['arp','harp',BASE,'0 1 2 3 2 1 0 1 2 4 3 2',{o:-12,v:0.8,len:3}],
      ['drone','drone',BASE,'X-----------|------------',{o:-24,fifth:1}],
      ['rel','pbass',CALM,'r:3 _:3 f:3 _:3',{o:-24}],
      ['rel','pbass',COMBAT,'r:2 r f:2 f r:2 r f:2 f',{o:-24}],
      ['drum','shaker',CALM,'o..o..o..o..'],
      ['drum','frame',CALM,'x-----o-----'],
      ['drum','bodhran',COMBAT,'X.oX.oX.oX.o'],
      ['drum','frame',COMBAT,'X-----x-----'],
      ['drum','shaker',COMBAT,'x.ox.ox.ox.o'],
      ['drum','wardrum',BOSS,'X--x--X--x--'],
      ['rel','ostf',BOSS,'o f t f o f t f o f t f'],
      ['drum','bodhran',BOSS2,'xoxxoxxoxxox',{v:0.8}],
      ['drum','crash',BOSS2,'X-----------|------------|------------|------------']
    ]},
  causeway:{map:1,vol:[0.68,0.98,1.13,1.21],bpm:96,beat:4,steps:16,root:64,mode:'aeolian',form:4,rv:0.38,echo:0.75,fb:0.42,
    chords:'0 5 2 6 0 5 3 4M',boss:'0 1bM 0 6 0 5 1bM 4M',lead:'bell',leadSec:'1101',pad:'mist',arp:'celesta',bell:'handbell',dlg:'handbell',drn:'drone',
    motif:'11:4 10:2 9:2 7:8|9:4 7:4 6:4 7:4|4:6 6:2 7:4 9:4|8:8 6:8|11:4 12:4 11:2 9:2 7:4|9:4 7:2 5:2 4:8|3:4 5:4 7:4 10:4|11:6 8:2 6#:8',
    tracks:[
      ['mel','handbell',BASE,'_:8 14:2 11:2 9:4|_:8 12:2 9:2 7:4|_:8 11:2 9:2 6:4|_:8 8:2 6:2 4:4|_:8 14:2 11:2 9:4|_:8 12:2 11:2 7:4|_:8 10:2 7:2 5:4|_:4 11:4 8:4 6#:4',{sec:'0110',v:0.8}],
      ['pad','mist',BASE,'X---------------'],
      ['drum','towerbell',BASE,'X---------------|----------------'],
      ['rel','sub',CALM,'r:12 f:4',{o:-24}],
      ['rel','sub',COMBAT,'r:3 r:3 r:2 f:3 f:3 o:2',{o:-24}],
      ['drum','woodhi',CALM,'x-------x-------'],
      ['drum','woodlo',CALM,'----o-------o---'],
      ['drum','taiko',COMBAT,'X-----x-X-----x-'],
      ['drum','rim',COMBAT,'----x-------x---'],
      ['drum','shaker',COMBAT,'.o.o.o.o.o.o.o.o'],
      ['rel','bell',COMBAT,'o:2 f:2 o:2 t:2 o:2 f:2 o:2 t:2',{v:0.5}],
      ['drum','towerbell',BOSS,'X---x---x---x---',{v:0.8}],
      ['drum','tom',BOSS,'X--x--X---X--x--'],
      ['rel','handbell',BOSS,'o f t f o f t f o f t f o f t f',{v:0.45}],
      ['drum','taiko',BOSS2,'XxxXxxXxXxxXxxXx',{v:0.8}],
      ['mel','bell',BOSS2,'14:2 13:2 14:2 13:2 14:2 13:2 14:2 13:2',{v:0.45}]
    ]},
  court:{map:1,vol:[1.4,1.72,1.49,1.81],bpm:84,beat:4,steps:12,root:60,mode:'aeolian',form:4,rv:0.42,echo:0.5,fb:0.25,
    chords:'0 5 3 4M 2 6 5 4M7',boss:'0 1bM 0 4M 0 5 3 4M7',lead:'brass',leadSec:'1011',pad:'strings',arp:'harp',bell:'celesta',dlg:'fiddle',drn:'drone',
    motif:'4:6 4:2 7:4|7:6 5:2 4:4|3:4 5:4 7:4|6#:6 7:2 8:4|9:6 8:2 7:4|8:6 6:2 4:4|5:4 7:4 9:4|8:6 6#:2 4:4',
    tracks:[
      ['mel','fiddle',BASE,'7:2 6:2 4:2 3:2 2:4|0:2 2:2 5:4 4:4|3:2 5:2 7:4 5:4|6#:4 4:4 1:4|2:2 4:2 7:4 9:4|8:4 6:4 1:4|0:4 2:4 5:4|6#:2 1:2 3:4 4:4',{sec:'0100'}],
      ['pad','strings',BASE,'X-----------',{v:1.2}],
      ['rel','pizz',CALM,'r:4 f:4 _:4',{o:-24}],
      ['rel','pizz',COMBAT,'r:2 r:2 f:2 f:2 o:2 f:2',{o:-24}],
      ['drum','timpani',CALM,'x-----------|------------'],
      ['drum','snare',COMBAT,'x--.x-.-x-..',{v:0.8}],
      ['drum','timpani',COMBAT,'X-------x---',{v:0.8}],
      ['drum','crash',COMBAT,'X-----------|------------|------------|------------',{v:0.7}],
      ['drum','timpani',BOSS,'X---x---x---',{v:0.5}],
      ['pad','stab',BOSS,'X-----------',{v:0.65}],
      ['rel','lowstr',BOSS,'r:2 r:2 f:2 r:2 t:2 f:2',{o:-12,v:0.65}],
      ['drum','snare',BOSS2,'XxxxXxxxXxxx',{v:0.55}],
      ['rel','trem',BOSS2,'o:12',{o:12,v:1.1}]
    ]},
  foundry:{map:1,vol:[0.91,0.94,0.87,0.96],bpm:118,beat:4,steps:16,root:50,mode:'phrygian',form:4,rv:0.26,echo:0.375,fb:0.3,
    chords:'0 1 0 6 0 1 5 6',boss:'0 1 0 1 0 1 4bM 6',lead:'horn',leadSec:'1011',pad:'warm',arp:'mbox',bell:'anvilm',dlg:'horn',drn:'growl',dro:12,co:12,lo:0,
    cadI:'1 6 0M 0M',cadL:'0M 3 0M 1',cad:'3:8 5:8|1:8 -1:8|s4:16|_:16',
    motif:'0:3 0 1:4 0:4 -2:4|1:6 3:2 2:8|0:3 0 1:4 4:4 3:4|2:4 1:4 0:8|7:3 7 8:4 7:4 5:4|8:6 10:2 9:8|7:3 7 5:4 4:4 3:4|2:4 3:4 1:8',
    tracks:[
      ['mel','anvilm',BASE,'14:2 14:2 15:4 14:2 13:2 11:4|15:2 15:2 17:4 16:8|14:2 14:2 15:4 18:4 17:4|16:4 15:4 14:8|14:2 14:2 15:4 14:2 13:2 11:4|15:2 15:2 17:4 16:8|14:2 14:2 15:4 11:4 12:4|9:4 10:4 8:8',{sec:'0110'}],
      ['drone','growl',BASE,'X---------------|----------------',{o:-12,fifth:1}],
      ['rel','pulsebass',CALM,'r:8 r:4 f:4',{o:-12}],
      ['rel','pulsebass',COMBAT,'r:2 r:2 r:2 o:2 r:2 r:2 f:2 r:2',{o:-12}],
      ['drum','anvil',CALM,'x-----x---------'],
      ['drum','hammer',CALM,'X---------------|----------------'],
      ['drum','bellows',CALM,'X---------------|----------------'],
      ['drum','kick',COMBAT,'X-----x---X--x--'],
      ['drum','msnare',COMBAT,'----X-------X---'],
      ['drum','hat',COMBAT,'xoxoxoxoxoxoxoxo'],
      ['drum','anvil',COMBAT,'X-----X-----X---'],
      ['drum','anvil2',COMBAT,'----o-----o-----'],
      ['drum','tom',BOSS,'X--x--X--x--X-x-'],
      ['drum','tick',BOSS,'.o.o.o.o.o.o.o.o'],
      ['rel','horn',BOSS,'r:2 r:2 o:2 r:2 t:2 r:2 f:2 r:2',{v:0.7}],
      ['drum','kick',BOSS2,'X-x-X-x-X-x-X-xx'],
      ['drum','anvil',BOSS2,'XxXxXxXxXxXxXxXx',{v:0.55}],
      ['mel','riser',BOSS2,'s12:32|_:16']
    ]},
  observatory:{map:1,vol:[0.78,0.91,1.1,1.28],bpm:100,beat:4,steps:16,root:62,mode:'lydian',form:4,rv:0.5,echo:0.75,fb:0.45,
    chords:'0 1 5 4 0 1 2 4',boss:'0 5bM 6bM 0 0 5bM 1 4',lead:'glass',leadSec:'1011',pad:'choir',arp:'glass',bell:'celesta',dlg:'glass',drn:'halo',
    cadI:'1 4 0 0',cadL:'0 1 0 4s',cad:'8:8 5:8|4:8 6:8|7:16|_:16',
    motif:'7:2 11:2 14:4 13:2 11:2 9:4|10:6 11:2 8:8|12:4 11:2 9:2 5:8|8:4 9:4 11:8|14:2 13:2 11:2 9:2 7:8|8:2 10:2 12:4 11:8|9:4 13:4 12:8|11:8 _:8',
    tracks:[
      ['mel','celesta',BASE,'4:2 7:2 9:2 7:2 4:2 7:2 11:4|5:2 8:2 10:2 8:2 5:2 8:2 12:4|5:2 9:2 12:2 9:2 5:2 9:2 11:4|4:2 6:2 8:2 11:2 8:2 6:2 4:4|4:2 7:2 9:2 7:2 4:2 7:2 11:4|5:2 8:2 10:2 8:2 5:2 8:2 12:4|2:2 4:2 9:2 4:2 2:2 4:2 6:4|4:2 8:2 11:2 13:2 11:2 8:2 4:4',{sec:'0110'}],
      ['arp','glass',BASE,'0123454321234565',{v:0.38,len:3,poly:3}],
      ['pad','choir',BASE,'X---------------'],
      ['spark','ping',CALM,'--x-----x---x---|------x-----x---',{o:12}],
      ['rel','sub',CALM,'r:16',{o:-24}],
      ['rel','pulsebass',COMBAT,'r:2 r:2 r:2 r:2 f:2 f:2 o:2 r:2',{o:-24}],
      ['drum','tick',CALM,'--o---o---o---o-',{v:0.6}],
      ['drum','kick',COMBAT,'X-------X-x-----',{v:1.2}],
      ['drum','clap',COMBAT,'----X-------X---',{v:1.2}],
      ['drum','hat',COMBAT,'.o.o.o.o.o.o.o.o'],
      ['drum','tom',BOSS,'X--x--x-X--x--x-'],
      ['arp','glass',BOSS,'5432345654323456',{o:12,v:0.3,len:2,poly:2}],
      ['pad','choir',BOSS,'X---------------',{o:12,v:0.7}],
      ['drum','kick',BOSS2,'X---X---X---X---'],
      ['rel','pulsebass',BOSS2,'r r r r r r r r r r r r r r r r',{o:-12,v:0.55}],
      ['mel','riser',BOSS2,'s12:32|_:16']
    ]},
  title:{vol:[0.66],bpm:76,beat:4,steps:16,root:62,mode:'aeolian',form:2,rv:0.45,echo:0.75,fb:0.45,chords:'0 5 2 6 0 5 3 4M',lead:'signal',leadSec:'11',
    motif:'4:3 4 7:12|6:4 5:4 4:8|2:4 4:4 6:4 9:4|8:8 7:4 6:4|4:3 4 11:12|10:4 9:4 7:8|7:4 8:4 9:4 10:4|8:12 _:4',
    tracks:[
      ['mel','handbell',BASE,'_:8 11:4 9:4|_:8 10:4 9:4|_:8 9:4 7:4|_:8 8:4 6:4|_:8 11:4 14:4|_:8 12:4 10:4|_:8 10:4 8:4|_:8 8:4 6#:4',{sec:'01',v:0.55}],
      ['pad','warm',BASE,'X---------------'],
      ['arp','mpluck',BASE,'0-2-4-2-0-2-4-2-',{o:-12,v:0.7}],
      ['rel','sub',BASE,'r:12 f:4',{o:-24}],
      ['drum','frame',BASE,'x-------o-------',{v:0.45}]
    ]},
  victory:{vol:[0.92],bpm:104,beat:4,steps:16,root:62,mode:'ionian',form:2,rv:0.42,echo:0.5,fb:0.3,chords:'0 3 5 4 0 3 4 0',lead:'brass',leadSec:'10',
    motif:'4:3 4 7:8 9:4|10:6 9:2 7:4 5:4|5:3 5 9:8 11:4|11:6 10:2 8:8|4:3 4 7:8 11:4|14:6 12:2 10:4 9:4|8:4 9:4 10:4 8:4|7:12 _:4',
    tracks:[
      ['mel','fiddle',BASE,'9:8 7:8|7:8 5:8|5:8 9:8|8:8 6:8|9:8 11:8|10:8 7:8|8:8 6:8|7:16',{sec:'01'}],
      ['pad','strings',BASE,'X---------------'],
      ['arp','bell',BASE,'0---1---2---3---',{o:12,v:0.45,sec:'10'}],
      ['arp','harp',BASE,'0-1-2-3-4-3-2-1-',{o:-12,v:0.7,sec:'01'}],
      ['rel','pizz',BASE,'r:4 r:4 f:4 r:4',{o:-24}],
      ['drum','timpani',BASE,'X---x---X---x-x-',{sec:'10'}],
      ['drum','snare',BASE,'----x-------x---',{sec:'10',v:0.6}],
      ['drum','crash',BASE,'X---------------|----------------|----------------|----------------',{sec:'10'}]
    ]},
  defeat:{vol:[0.76],bpm:58,beat:4,steps:12,root:62,mode:'aeolian',form:1,rv:0.55,echo:0.75,fb:0.4,chords:'0 5 3 4M',lead:'handbell',leadSec:'1',
    motif:'4:4 3:4 2:4|2:8 0:4|3:6 2:2 1:4|1:4 -1#:8',
    tracks:[
      ['pad','warm',BASE,'X-----------',{v:0.9}],
      ['drone','drone',BASE,'X-----------|------------',{o:-24}],
      ['drum','wind',BASE,'X-----------|------------',{v:0.8}],
      ['rel','sub',BASE,'r:12',{o:-24,v:0.6}]
    ]}
};
const MAPS=['garden','causeway','court','foundry','observatory'];
const TYPES={mel:0,rel:1,arp:2,pad:3,drum:4,drone:5,spark:6},REL={r:0,t:1,f:2,o:3,R:4},VEL={X:1,x:0.75,o:0.5,'.':0.3};

function chordsOf(text,scale){
  return text.trim().split(/\s+/).map(token=>{
    const m=/^(-?\d+)([#b]?)([Mmsu7]*)$/.exec(token);if(!m)throw new Error('Bad chord '+token);
    const d=+m[1],acc=m[2]==='#'?1:m[2]==='b'?-1:0,flags=m[3],base=degree(scale,d);
    let third=degree(scale,d+2)-base,fifth=degree(scale,d+4)-base;
    if(acc||flags.includes('M')){third=4;fifth=7;}
    if(flags.includes('m')){third=3;fifth=7;}
    if(flags.includes('s'))third=5;if(flags.includes('u'))third=2;
    const tones=[0,third,fifth];if(flags.includes('7'))tones.push(10);
    return {root:base+acc,tones:Float32Array.from(tones)};
  });
}
// Suspended chords alternate sus2/sus4, using only tones of the mode (Phrygian has no whole-step second).
const susOf=(list,scale)=>list.map((c,i)=>{
  const inMode=t=>scale.includes((((c.root+t)%12)+12)%12),pick=[i%2?5:2,i%2?2:5].find(inMode);
  return {root:c.root,tones:Float32Array.of(0,pick??c.tones[1],c.tones[2])};
});
function lineOf(text,scale,steps,type){
  const bars=text.split('|'),n=bars.length,at=new Int16Array(n*steps).fill(-1),code=[],len=[],vel=[];
  if(type>=2){
    const flat=bars.map(bar=>bar.replace(/\s+/g,'').padEnd(steps,'-').slice(0,steps)).join('');
    for(let i=0;i<flat.length;i++){
      const c=flat[i];if(c==='-')continue;
      let k=1;while(k<flat.length&&flat[(i+k)%flat.length]==='-')k++;
      at[i]=code.length;code.push(/\d/.test(c)?+c:0);vel.push(VEL[c]??1);len.push(k);
    }
  }else bars.forEach((bar,b)=>{
    let pos=0;
    for(const token of bar.trim().split(/\s+/)){
      const m=/^(_|s-?\d+|-?\d+[#b]?|[rtfoR])(?::(\d+))?$/.exec(token);if(!m)throw new Error('Bad token '+token);
      const l=+(m[2]||1),p=m[1];
      if(p!=='_'&&pos<steps){
        at[b*steps+pos]=code.length;len.push(l);vel.push(1);
        code.push(type===1?REL[p]:p[0]==='s'?+p.slice(1):degree(scale,parseInt(p,10))+(p.endsWith('#')?1:p.endsWith('b')?-1:0));
      }
      pos+=l;
    }
  });
  return {bars:n,at,code:Float32Array.from(code),len:Float32Array.from(len),vel:Float32Array.from(vel)};
}
// One arrangement per theme and scene, built once so that scene changes only swap references.
function arrange(key,scene){
  const T=THEMES[key],scale=MODES[T.mode],S=T.steps,tracks=[],motif=T.motif.split('|'),rest=`|_:${S}`,bar='-'.repeat(S),strike='X'+bar.slice(1);
  const add=(type,name,layer,line,o={})=>{
    const P=I[name];if(!P)throw new Error('Unknown instrument '+name);const t=TYPES[type];
    tracks.push({t,P,L:layer,o:o.o||0,v:o.v??1,pan:o.pan||0,sec:o.sec?parseInt([...o.sec].reverse().join(''),2):255,part:o.part||0,fifth:!!o.fifth,hold:o.len||0,
      pri:o.pri??(t<2?3:t===3||t===5?2:1),poly:o.poly??(t===2?4:t===6?3:t===5&&o.fifth?4:2),...lineOf(line,scale,S,t)});
  };
  const A={key,scene,area:MAPS.indexOf(key),gain:(T.vol||[1,1,1,1])[['play','answer','dialogue','clear'].indexOf(scene)]??1,root:T.root,scale,steps:S,bpm:T.bpm,beat:T.beat,form:T.form||4,chordBars:1,intro:0,introChords:null,
    chords:chordsOf(T.chords,scale),bossChords:T.boss?chordsOf(T.boss,scale):null,adaptive:false,tracks,rv:T.rv,echo:T.echo,fb:T.fb,resume:0};
  const drone=(v,len)=>add('drone',T.drn,BASE,strike+`|${bar}`.repeat(len-1),{o:-24+(T.dro||0),v});
  if(scene==='play'){
    A.adaptive=!!T.map;add('mel',T.lead,BASE,T.motif,{sec:T.leadSec,pri:4,o:T.lo||0});
    for(const [type,name,layer,line,o] of T.tracks)add(type,name,layer,line,o);
    if(T.map){add('drum','heart',DANGER,S===12?'X-x---X-x---':'X-x-----X-x-----');add('mel','trem',DANGER,`s12:${2*S}${rest}`);add('mel','trem',DANGER,`s13:${2*S}${rest}`,{pan:0.4});}
  }else if(scene==='answer'){
    A.chordBars=2;A.chords=susOf(A.chords,scale);A.bossChords=null;
    add('arp',T.arp,BASE,S===12?'012343234542':'0123432101234542',{v:0.5,len:3});
    add('pad',T.pad,BASE,strike+'|'+bar,{v:0.8});
    add('mel',T.bell,BASE,motif.slice(0,2).join('|')+rest+rest,{v:0.5,o:T.lo||0});
    drone(0.7,4);
  }else if(scene==='dialogue'){
    A.bpm=T.bpm*0.5;A.form=2;A.bossChords=null;
    add('pad',T.pad,BASE,strike,{v:0.75});
    add('mel',T.dlg,BASE,T.motif,{v:0.55,sec:'10',o:T.lo||0});
    drone(0.6,2);
  }else{
    A.bpm=T.bpm*0.8;A.intro=4;A.introChords=chordsOf(T.cadI||'3 4M 0 0',scale);A.chords=chordsOf(T.cadL||'0 3 0 4s',scale);A.bossChords=null;
    add('mel',T.lead,BASE,T.cad||(S===12?'5:6 3:6|4:6 s11:6|7:12|_:12':'5:8 3:8|4:8 s11:8|7:16|_:16'),{part:1,o:T.co||0,pri:4});
    add('mel',T.bell,BASE,`_:${S}${rest}|7:${S}${rest}`,{part:1,v:0.8,o:(T.co||0)+12});
    add('pad',T.pad,BASE,strike);
    add('arp',T.arp,BASE,S===12?'0-1-2-3-2-1-':'0-1-2-3-4-3-2-1-',{part:2,v:0.42,len:4});
    add('mel',T.bell,BASE,motif[0]+rest+rest+rest,{part:2,v:0.4,o:T.lo||0});
    drone(0.6,2);
  }
  return A;
}
const SCORE={title:arrange('title','play'),victory:arrange('victory','play'),defeat:arrange('defeat','play')};
for(const scene of ['play','answer','dialogue','clear'])SCORE[scene]=MAPS.map(key=>arrange(key,scene));

// One synth voice: tone (oscillator, FM, noise, filter), Karplus-Strong string, or detuned chord pad.
// All state is preallocated; render() only touches numbers and the caller's buffers.
const KILL=Math.exp(-1/(0.004*FS)),SOFT=Math.exp(-1/(0.025*FS));let SEED=0x1234567;
class Voice{
  constructor(pluck){
    this.on=false;this.P=DEF;this.kind=0;this.layer=0;this.prio=0;this.tag=-1;this.inst=0;this.head=false;this.owner=null;this.serial=0;this.age=0;this.killing=false;this.outL=0;this.outR=0;
    this.gl=0;this.gr=0;this.amp=0;this.stage=0;this.aInc=0;this.dMul=0;this.sus=0;this.rMul=0;this.hold=0;this.wait=0;
    this.f=0;this.ft=0;this.gMul=0;this.ph=0;this.ph2=0;this.mph=0;this.mi=0;this.ms=0;this.miMul=1;this.vph=0;this.vwait=0;this.tph=0;
    this.nzv=0;this.nzMul=1;this.ns=(SEED=Math.imul(SEED,1103515245)+12345|0)||1;this.fe=0;this.s1=0;this.s2=0;this.s3=0;this.s4=0;this.rv=0;this.ec=0;
    this.buf=pluck?new Float32Array(TABLE):null;this.len=2;this.w=0;this.z=0;this.fb=0;
    this.ni=new Float32Array(8);this.np=new Float32Array(8);this.nn=0;
  }
  start(P,f,vel,pan,hold,wait,layer,prio){
    const th=(clamp(pan,-1,1)+1)*Math.PI/4,g=P.g*vel;
    this.on=true;this.killing=false;this.P=P;this.kind=P.k;this.layer=layer;this.prio=prio;this.tag=-1;this.age=0;
    this.gl=Math.cos(th)*g;this.gr=Math.sin(th)*g;this.amp=0;this.stage=0;this.aInc=1/Math.max(1,P.a*FS);
    this.dMul=Math.exp(-1/(Math.max(0.001,P.d)*FS));this.sus=P.k===1?1:P.s;this.rMul=Math.exp(-1/(Math.max(0.001,P.r)*FS));
    this.hold=Math.max(1,hold|0);this.wait=Math.max(0,wait|0);
    this.ft=f;this.f=f*P.p0;this.gMul=Math.exp(-1/(Math.max(0.0005,P.pt)*FS));this.ph=0;this.ph2=0.25;this.mph=0;
    this.mi=P.mi/TAU;this.ms=P.ms/TAU;this.miMul=P.mt>0?Math.exp(-1/(P.mt*FS)):1;this.vph=0;this.vwait=P.vw*FS;this.tph=0;
    this.nzv=P.nz;this.nzMul=P.nd>0?Math.exp(-1/(P.nd*FS)):1;this.fe=P.fe;this.s1=this.s2=this.s3=this.s4=0;this.rv=P.rv;this.ec=P.ec;
    if(P.k===1)this.excite(f);
    return this;
  }
  chord(freqs,n){
    const d=this.P.pd,k=1/Math.sqrt(Math.max(1,n));this.nn=n;
    for(let j=0;j<n;j++){this.ni[2*j]=freqs[j]*(1-d)*INV;this.ni[2*j+1]=freqs[j]*(1+d)*INV;this.np[2*j]=rand();this.np[2*j+1]=rand();}
    this.gl*=k;this.gr*=k;return this;
  }
  excite(f){
    const b=this.buf,D=clamp(FS/f-0.5,2,TABLE-8),N=Math.ceil(D)+2,c=0.12+0.85*this.P.br;
    let lp=0,mean=0,peak=0;
    for(let i=0;i<N;i++){lp+=c*(rand()*2-1-lp);b[i]=lp;mean+=lp;}
    mean/=N;for(let i=0;i<N;i++){b[i]-=mean;const a=Math.abs(b[i]);if(a>peak)peak=a;}
    const k=peak>0?0.9/peak:0;for(let i=0;i<N;i++)b[i]*=k;
    this.len=D;this.w=N&MASK;this.z=0;this.fb=Math.pow(10,-3/(this.P.t60*f))*0.5;
  }
  kill(rate=KILL){if(this.on&&!this.killing){this.killing=true;this.stage=2;this.rMul=rate;}}
  render(L,R,RV,EC,from,to,lg){
    if(this.wait>0){const n=Math.min(this.wait,to-from);this.wait-=n;from+=n;if(from>=to)return;}
    this.age+=to-from;
    if(this.kind===1)this.pluck(L,R,RV,EC,from,to,lg);else if(this.kind===2)this.pad(L,R,RV,EC,from,to,lg);else this.tone(L,R,RV,EC,from,to,lg);
  }
  tone(L,R,RV,EC,from,to,lg){
    const P=this.P,n=to-from,fl=P.fl;
    let vib=1,vib1=1,trem=1,trem1=1,a1=0,a2=0,a3=0,k=0;
    if(P.vd>0){if(this.vwait>0)this.vwait-=n;else{vib=1+P.vd*sin1(this.vph);this.vph+=P.vr*n*INV;vib1=1+P.vd*sin1(this.vph);}}
    if(P.td>0){trem=1-P.td*0.5*(1+sin1(this.tph));this.tph+=P.tr*n*INV;trem1=1-P.td*0.5*(1+sin1(this.tph));}
    const dvib=(vib1-vib)/n,dtrem=(trem1-trem)/n;
    if(fl){const fc=clamp(P.fc+P.fk*this.ft+this.fe,20,FS*0.45),g=Math.tan(Math.PI*fc*INV);k=1/P.q;a1=1/(1+g*(g+k));a2=g*a1;a3=g*a2;if(this.fe!==0)this.fe*=Math.exp(-n/(P.ft*FS));}
    const gl=this.gl*lg,gr=this.gr*lg,rv=this.rv*(gl+gr)*0.5,ec=this.ec*(gl+gr)*0.5,w=P.w,mr=P.mr,ms=this.ms,dt=P.dt,ft=this.ft,gMul=this.gMul,aInc=this.aInc,dMul=this.dMul,sus=this.sus,rMul=this.rMul,miMul=this.miMul,nzMul=this.nzMul;
    let amp=this.amp,stage=this.stage,hold=this.hold,f=this.f,ph=this.ph,ph2=this.ph2,mph=this.mph,mi=this.mi,nzv=this.nzv,ns=this.ns,s1=this.s1,s2=this.s2,last=0;
    for(let i=from;i<to;i++){
      if(stage===0){amp+=aInc;if(amp>=1){amp=1;stage=1;}}else if(stage===1)amp=sus+(amp-sus)*dMul;else amp*=rMul;
      if(--hold===0&&stage<2)stage=2;
      if(stage>0&&amp<1e-3&&(stage===2||sus===0)){this.on=false;break;}
      vib+=dvib;trem+=dtrem;f=ft+(f-ft)*gMul;const inc=f*vib*INV;ph+=inc;if(ph>=1)ph-=1;
      let s=0;
      if(w===0){
        if(mr>0){mph+=inc*mr;if(mph>=1)mph-=1;mi=ms+(mi-ms)*miMul;s=sin1(ph+mi*sin1(mph));}else s=sin1(ph);
        if(dt>0){ph2+=inc*(1+dt);if(ph2>=1)ph2-=1;s=(s+sin1(ph2))*0.6;}
      }else if(w===1){s=blep(ph,inc);if(dt>0){const i2=inc*(1+dt);ph2+=i2;if(ph2>=1)ph2-=1;s=(s+blep(ph2,i2))*0.6;}}
      else if(w===2)s=1-4*Math.abs(ph-0.5);
      if(nzv>1e-5){ns^=ns<<13;ns^=ns>>>17;ns^=ns<<5;s+=nzv*ns*4.656612873e-10;nzv*=nzMul;}
      if(fl){const v3=s-s2,v1=a1*s1+a2*v3,v2=s2+a2*s1+a3*v3;s1=2*v1-s1;s2=2*v2-s2;s=fl===1?v2:fl===2?k*v1:s-k*v1-v2;}
      const o=s*amp*trem;L[i]+=o*gl;R[i]+=o*gr;RV[i]+=o*rv;EC[i]+=o*ec;last=o;
    }
    this.outL=last*gl;this.outR=last*gr;this.amp=amp;this.stage=stage;this.hold=hold;this.f=f;this.ph=ph;this.ph2=ph2;this.mph=mph;this.mi=mi;this.nzv=nzv;this.ns=ns;this.s1=s1;this.s2=s2;
  }
  pad(L,R,RV,EC,from,to,lg){
    const P=this.P,n=to-from,nn=this.nn,ni=this.ni,np=this.np,tab=P.tab,saw=P.w===1,fl=P.fl;
    let a1=0,a2=0,a3=0;
    if(fl){const fc=clamp(P.fc+this.fe,20,FS*0.45),g=Math.tan(Math.PI*fc*INV),k=1/P.q;a1=1/(1+g*(g+k));a2=g*a1;a3=g*a2;if(this.fe!==0)this.fe*=Math.exp(-n/(P.ft*FS));}
    const gl=this.gl*lg,gr=this.gr*lg,rv=this.rv*0.5,ec=this.ec*0.5,aInc=this.aInc,dMul=this.dMul,sus=this.sus,rMul=this.rMul;
    let amp=this.amp,stage=this.stage,hold=this.hold,s1=this.s1,s2=this.s2,s3=this.s3,s4=this.s4,lastL=0,lastR=0;
    for(let i=from;i<to;i++){
      if(stage===0){amp+=aInc;if(amp>=1){amp=1;stage=1;}}else if(stage===1)amp=sus+(amp-sus)*dMul;else amp*=rMul;
      if(--hold===0&&stage<2)stage=2;
      if(stage>0&&amp<1e-3&&(stage===2||sus===0)){this.on=false;break;}
      let sl=0,sr=0;
      for(let j=0;j<nn;j++){
        const jl=2*j,jr=jl+1;let pl=np[jl]+ni[jl];if(pl>=1)pl-=1;np[jl]=pl;let pr=np[jr]+ni[jr];if(pr>=1)pr-=1;np[jr]=pr;
        if(saw){sl+=blep(pl,ni[jl]);sr+=blep(pr,ni[jr]);}else{let x=pl*TABLE,k=x|0;sl+=tab[k]+(x-k)*(tab[k+1]-tab[k]);x=pr*TABLE;k=x|0;sr+=tab[k]+(x-k)*(tab[k+1]-tab[k]);}
      }
      if(fl){let v3=sl-s2,v1=a1*s1+a2*v3,v2=s2+a2*s1+a3*v3;s1=2*v1-s1;s2=2*v2-s2;sl=v2;v3=sr-s4;v1=a1*s3+a2*v3;v2=s4+a2*s3+a3*v3;s3=2*v1-s3;s4=2*v2-s4;sr=v2;}
      sl*=amp;sr*=amp;lastL=sl*gl;lastR=sr*gr;L[i]+=lastL;R[i]+=lastR;const m=lastL+lastR;RV[i]+=m*rv;EC[i]+=m*ec;
    }
    this.outL=lastL;this.outR=lastR;this.amp=amp;this.stage=stage;this.hold=hold;this.s1=s1;this.s2=s2;this.s3=s3;this.s4=s4;
  }
  pluck(L,R,RV,EC,from,to,lg){
    const b=this.buf,D=this.len,di=D|0,fr=D-di,fb=this.fb,gl=this.gl*lg,gr=this.gr*lg,rv=this.rv*(gl+gr)*0.5,ec=this.ec*(gl+gr)*0.5,aInc=this.aInc,rMul=this.rMul;
    let w=this.w,z=this.z,amp=this.amp,stage=this.stage,hold=this.hold,peak=0,last=0;
    for(let i=from;i<to;i++){
      if(stage===0){amp+=aInc;if(amp>=1){amp=1;stage=1;}}else if(stage===2){amp*=rMul;if(amp<1e-3){this.on=false;break;}}
      if(--hold===0&&stage<2)stage=2;
      const r0=(w-di)&MASK,y0=b[r0],y=y0+(b[(r0-1)&MASK]-y0)*fr;
      b[w]=fb*(y+z);z=y;w=(w+1)&MASK;
      const o=y*amp;L[i]+=o*gl;R[i]+=o*gr;RV[i]+=o*rv;EC[i]+=o*ec;last=o;
      if(o>peak)peak=o;else if(-o>peak)peak=-o;
    }
    this.outL=last*gl;this.outR=last*gr;this.w=w;this.z=z;this.amp=amp;this.stage=stage;this.hold=hold;
    if(this.on&&this.age>FS*0.05&&peak<2e-4)this.on=false;
  }
}

// Sound effects: priority p (0 ui … 3 boss/journey), at most m at once, pitch jitter j, and layers.
// A layer takes a preset (name or inline), a pitch (f Hz, n scale degree or s semitones above the
// current key's tonic in octave 4, c/cs chord for pads), delay t, hold h, velocity v and pan.
const fxOf=(p,m,layers,j=0.03)=>({p,m,j,id:0,l:layers.map(([P,o={}])=>Object.assign({P:typeof P==='string'?I[P]:ins(P),f:0,n:null,s:null,c:null,cs:null,t:0,h:0.6,v:1,pan:0},o))});
const whoosh=(fc,fe,ft,d,g,q=1.2)=>({w:3,nz:1,a:0.004,d,fl:2,fc,fe,ft,q,g,rv:0.18});
const thump=(f,d,g,x={},o={})=>[{p0:2,pt:0.04,a:0.002,d,g,...x},{f,...o}];
const SHARD={mr:1.37,mi:3,mt:0.05,a:0.001,d:0.25,g:0.1,rv:0.3},SPARK={pd:0.004,k:2,h2:0.28,a:0.012,d:0.5,g:0.2,rv:0.45};
const SFX={
  slash:fxOf(1,3,[[whoosh(700,2600,0.07,0.07,0.42,1.4)],[{mr:2.41,mi:1.8,mt:0.06,a:0.002,d:0.08,g:0.12,rv:0.15},{f:1750,pan:0.15}]],0.06),
  'slash-finisher':fxOf(2,2,[[whoosh(500,3200,0.1,0.12,0.5,1.1)],thump(62,0.14,0.5,{p0:2.2,pt:0.03}),['bell',{n:7,v:0.9}]]),
  dash:fxOf(1,2,[[whoosh(2600,-2000,0.09,0.12,0.4,1.6)],[{p0:0.6,pt:0.06,a:0.005,d:0.09,g:0.09},{f:420}]],0.05),
  pulse:fxOf(2,2,[thump(55,0.22,0.48),[SPARK,{c:[0,4,7]}],[{td:0.6,tr:18,a:0.02,d:0.4,g:0.06,rv:0.5},{n:14}]]),
  sunbreak:fxOf(3,1,[thump(48,0.45,0.62,{p0:2.6,pt:0.06,nz:0.35,nd:0.05,fl:1,fc:900}),[{w:3,nz:1,fl:2,fc:1600,q:0.8,a:0.001,d:0.06,g:0.4}],['glass',{n:7,t:0.08,v:0.8}],['glass',{n:9,t:0.14,v:0.8}],['glass',{n:11,t:0.2,v:0.8}]]),
  'solar-lance':fxOf(2,1,[[{w:1,p0:6,pt:0.05,fl:1,fc:3000,q:2,a:0.002,d:0.25,g:0.17},{f:320}],[{mr:1.5,mi:1.2,mt:1,vd:0.02,vr:23,a:0.02,d:0.45,g:0.12,rv:0.25},{f:640}],[{w:3,nz:1,fl:3,fc:3000,a:0.001,d:0.05,g:0.2}]]),
  hurt:fxOf(2,1,[thump(110,0.12,0.48,{p0:1.8,pt:0.03,nz:0.4,nd:0.04,fl:1,fc:1200}),[{w:2,dt:0.06,a:0.003,d:0.12,g:0.11},{f:310}]],0.04),
  ward:fxOf(1,1,[[{mr:1,mi:1.2,mt:0.3,a:0.004,d:0.6,g:0.14,rv:0.4},{n:7}],[{mr:1,mi:1.2,mt:0.3,a:0.004,d:0.6,g:0.12,rv:0.4},{n:11,t:0.06}]]),
  'ward-hit':fxOf(1,2,[[{mr:1.41,mi:1.5,mt:0.04,a:0.001,d:0.09,g:0.12,nz:0.2,nd:0.02,fl:3,fc:1500},{f:2400}]],0.06),
  mend:fxOf(1,2,[['celesta',{n:4,v:0.9}],['celesta',{n:7,t:0.07,v:0.9}],['celesta',{n:9,t:0.14,v:0.9}]]),
  'guard-break':fxOf(2,1,[[{w:3,nz:1,fl:2,fc:2200,q:0.7,a:0.001,d:0.08,g:0.45}],[SHARD,{f:1900}],[SHARD,{f:2650,t:0.015,pan:-0.3}],[SHARD,{f:3400,t:0.03,pan:0.3}],thump(80,0.15,0.4)]),
  upgrade:fxOf(2,1,[['bell',{n:7,v:0.75}],['bell',{n:9,t:0.07,v:0.75}],['bell',{n:11,t:0.14,v:0.75}],['bell',{n:14,t:0.21,v:0.75}]],0),
  beacon:fxOf(2,1,[['bell',{n:7,v:0.8}],['bell',{n:11,t:0.02,v:0.7}],['bell',{n:14,t:0.04,v:0.6}],[{k:2,h2:0.3,a:0.3,d:1.2,g:0.13,rv:0.5},{c:[0,4,7]}]],0),
  lantern:fxOf(1,1,[[{w:3,nz:1,fl:1,fc:300,fe:1500,ft:0.12,a:0.05,d:0.25,g:0.36}],['handbell',{n:11,t:0.05,v:0.7}]]),
  stage:fxOf(2,1,[['bell',{n:4,v:0.75}],['bell',{n:8,v:0.6}],['bell',{n:7,t:0.22,v:0.8}],['bell',{n:11,t:0.22,v:0.65}],['bell',{n:14,t:0.22,v:0.55}]],0),
  'gate-open':fxOf(3,1,[[{w:3,nz:1,fl:1,fc:120,a:0.3,d:1.2,g:0.5}],[{k:2,h2:0.3,a:0.25,d:1.6,g:0.2,rv:0.6},{c:[0,4,7,9]}],['bell',{n:14,t:0.1}],['bell',{n:11,t:0.2}],['bell',{n:9,t:0.3}],['bell',{n:7,t:0.4}],thump(45,0.8,0.42,{pt:0.05})],0),
  area:fxOf(2,1,[['bell',{n:4,v:0.8}],['bell',{n:7,t:0.12,v:0.8}],[whoosh(400,1800,0.3,0.3,0.22)]],0),
  'area-clear':fxOf(3,1,[['bell',{n:4,v:0.7}],['bell',{n:7,t:0.06,v:0.7}],['bell',{n:9,t:0.12,v:0.7}],['bell',{n:11,t:0.18,v:0.7}],['bell',{n:14,t:0.24,v:0.7}],[{k:2,h2:0.3,a:0.05,d:1.2,g:0.17,rv:0.55},{c:[0,4,7],t:0.3}]],0),
  victory:fxOf(3,1,[[{p0:1.15,pt:0.05,a:0.002,d:0.3,g:0.45,nz:0.2,nd:0.04,fl:1,fc:400},{f:73,v:0.55}],[{p0:1.15,pt:0.05,a:0.002,d:0.3,g:0.45,nz:0.2,nd:0.04,fl:1,fc:400},{f:73,t:0.12,v:0.75}],
    [{p0:1.15,pt:0.05,a:0.002,d:0.5,g:0.45,nz:0.2,nd:0.04,fl:1,fc:400},{f:73,t:0.24}],[{k:2,w:1,pd:0.003,a:0.04,d:1.5,fl:1,fc:2400,g:0.15,rv:0.5},{cs:[0,4,7,12],t:0.24}],['bell',{s:24,t:0.3}],['bell',{s:28,t:0.4}]],0),
  defeat:fxOf(3,1,[[{w:1,p0:2,pt:0.5,fl:1,fc:800,a:0.01,d:1.2,g:0.16},{f:110}],['handbell',{s:12}],['handbell',{s:10,t:0.25}],['handbell',{s:7,t:0.5}],thump(40,1,0.45,{pt:0.05},{t:0.75})],0),
  boss:fxOf(3,1,[[{k:2,w:1,pd:0.004,a:0.6,d:1,fl:1,fc:600,q:1.2,g:0.15,rv:0.4},{cs:[-12,-11],h:0.6}],[{p0:2,pt:0.05,a:0.002,d:0.8,g:0.55,nz:0.3,nd:0.08,fl:1,fc:600},{f:42,t:0.6}],['towerbell',{s:-12,t:0.6}]],0),
  'boss-phase':fxOf(3,1,[[{w:3,nz:1,fl:2,fc:1500,fe:-1200,ft:0.4,a:0.45,d:0.05,g:0.36}],[{p0:2,pt:0.05,a:0.002,d:0.7,g:0.5},{f:40,t:0.45}],[{k:2,h2:0.2,a:0.01,d:0.9,g:0.13,rv:0.5},{cs:[0,1,6],t:0.45}]],0),
  'boss-exposed':fxOf(3,1,[[{w:3,nz:1,fl:2,fc:2600,q:0.6,a:0.001,d:0.1,g:0.48}],[SHARD,{f:2100}],[SHARD,{f:2900,t:0.012,pan:-0.35}],[SHARD,{f:3700,t:0.024,pan:0.35}],['bell',{n:14,v:1}],thump(70,0.2,0.42)],0),
  'boss-guard':fxOf(2,1,[[{w:1,p0:0.5,pt:0.25,fl:1,fc:700,a:0.15,d:0.35,g:0.15},{f:110}],[{p0:1.4,pt:0.02,a:0.001,d:0.08,nz:0.5,nd:0.02,fl:1,fc:1800,g:0.33},{f:160,t:0.3}]],0),
  'boss-enraged':fxOf(3,1,[[{w:3,nz:1,fl:1,fc:2600,fe:-2200,ft:0.4,a:0.3,d:0.5,g:0.4}],[{w:1,dt:0.03,fl:1,fc:500,vd:0.03,vr:7,a:0.2,d:0.8,g:0.17},{f:55}]],0),
  'boss-summon':fxOf(2,1,[[{p0:1.8,pt:0.3,a:0.05,d:0.5,g:0.065,rv:0.5},{f:900,pan:-0.3}],[{p0:1.8,pt:0.3,a:0.05,d:0.5,g:0.065,rv:0.5},{f:953,pan:0.3}],[whoosh(300,900,0.5,0.6,0.24)],
    [{p0:1.5,pt:0.02,a:0.001,d:0.06,g:0.14},{f:300,t:0.3}],[{p0:1.5,pt:0.02,a:0.001,d:0.06,g:0.14},{f:300,t:0.42}],[{p0:1.5,pt:0.02,a:0.001,d:0.06,g:0.14},{f:300,t:0.54}]],0),
  'champion-defeated':fxOf(3,1,[['bell',{n:7}],['bell',{n:11,t:0.03}],['bell',{n:14,t:0.06}],['bell',{n:16,t:0.09}],[{k:2,h2:0.3,a:0.2,d:1.4,g:0.14,rv:0.6},{c:[0,4,7]}]],0),
  'route-complete':fxOf(2,1,[[{k:2,h2:0.3,a:0.03,d:0.35,g:0.12,rv:0.4},{c:[3,5,7]}],[{k:2,h2:0.3,a:0.03,d:1,g:0.14,rv:0.5},{c:[0,4,7],t:0.3}],['bell',{n:7,t:0.3,v:0.8}]],0),
  'npc-captured':fxOf(2,1,[[{w:2,a:0.005,d:0.2,g:0.12},{n:4}],[{w:2,a:0.005,d:0.25,g:0.12},{n:3,t:0.18}],thump(70,0.15,0.32,{p0:1.4,pt:0.03}),[{p0:1.4,pt:0.03,a:0.002,d:0.15,g:0.32},{f:70,t:0.18}]],0),
  milestone:fxOf(1,1,[['bell',{n:7,v:0.7}],['bell',{n:10,t:0.09,v:0.7}]],0),
  'sol-volley':fxOf(1,2,[[{p0:0.7,pt:0.02,a:0.002,d:0.05,g:0.075},{f:1400}],[{p0:0.7,pt:0.02,a:0.002,d:0.05,g:0.075},{f:1750,t:0.05}],[{p0:0.7,pt:0.02,a:0.002,d:0.05,g:0.075},{f:2100,t:0.1}]]),
  'lunar-nova':fxOf(2,1,[[whoosh(3000,-2200,0.25,0.25,0.22)],['glass',{n:11,v:0.8}],['glass',{n:14,t:0.04,v:0.8}],['glass',{n:16,t:0.08,v:0.8}]],0),
  answer:fxOf(2,1,[['glass',{n:7,v:0.85}],['glass',{n:8,t:0.06,v:0.85}],['glass',{n:11,t:0.12,v:0.85}],['glass',{n:15,t:0.18,v:0.85}]],0),
  'skill-learned':fxOf(3,1,[['bell',{n:7}],['bell',{n:9,t:0.05}],['bell',{n:11,t:0.1}],['bell',{n:14,t:0.15}],['bell',{n:16,t:0.2}],[{k:2,h2:0.3,a:0.15,d:1.5,g:0.17,rv:0.6},{c:[0,4,7,9]}]],0),
  reroll:fxOf(1,1,[[{w:3,nz:1,fl:2,fc:3000,q:2,a:0.001,d:0.025,g:0.2}],[{w:3,nz:1,fl:2,fc:3600,q:2,a:0.001,d:0.025,g:0.2},{t:0.04}],[{w:3,nz:1,fl:2,fc:4200,q:2,a:0.001,d:0.025,g:0.2},{t:0.08}],[{p0:0.6,pt:0.03,a:0.002,d:0.08,g:0.08},{f:900,t:0.1}]],0),
  'gift-orbit':fxOf(0,1,[[{td:0.6,tr:22,a:0.01,d:0.12,g:0.07,rv:0.2},{f:520}],[{w:3,nz:1,fl:2,fc:2400,q:1.5,a:0.01,d:0.1,g:0.08}]],0.08),
  'gift-comet':fxOf(2,1,[[{p0:7,pt:0.18,a:0.01,d:0.3,g:0.065},{f:300}],thump(50,0.35,0.36,{nz:0.3,nd:0.05,fl:1,fc:800},{t:0.25}),[{w:3,nz:1,fl:2,fc:1800,a:0.001,d:0.06,g:0.28},{t:0.25}]]),
  'gift-chain':fxOf(1,2,[[{mr:3.1,mi:4,mt:0.04,a:0.001,d:0.05,g:0.075},{f:700}],[{mr:3.1,mi:4,mt:0.04,a:0.001,d:0.05,g:0.075},{f:1050,t:0.03}],[{mr:3.1,mi:4,mt:0.04,a:0.001,d:0.05,g:0.075},{f:840,t:0.06}],[{w:3,nz:1,fl:3,fc:4000,a:0.001,d:0.04,g:0.11}]],0.08),
  'gift-bloom':fxOf(1,1,[['harp',{n:9,v:0.6}],['harp',{n:11,t:0.06,v:0.6}],['harp',{n:14,t:0.12,v:0.6}],[{w:3,nz:1,fl:3,fc:5000,a:0.03,d:0.15,g:0.055}]]),
  'ally-down':fxOf(2,1,[[{w:2,a:0.005,d:0.18,g:0.11},{s:7}],[{w:2,a:0.005,d:0.35,g:0.11},{s:3,t:0.16}],[{p0:1.5,pt:0.03,a:0.002,d:0.12,g:0.28},{f:90,t:0.1}]],0),
  'ally-up':fxOf(2,1,[['bell',{s:7,v:0.7}],['bell',{s:12,t:0.1,v:0.7}],['bell',{s:19,t:0.2,v:0.6}]],0),
  recruit:fxOf(3,1,[[{k:2,h2:0.3,a:0.2,d:1.4,g:0.15,rv:0.55},{cs:[0,4,7,12]}],['bell',{s:12,t:0.1,v:0.75}],['bell',{s:16,t:0.2,v:0.75}],['bell',{s:19,t:0.3,v:0.75}],['bell',{s:24,t:0.4,v:0.75}]],0),
  'rule-flip':fxOf(3,1,[[{w:3,nz:1,fl:2,fc:4000,fe:-3500,ft:0.5,a:0.6,d:0.05,g:0.26}],[{k:2,h2:0.3,a:0.02,d:1.2,g:0.15,rv:0.6},{cs:[0,7,12,16],t:0.6}],['bell',{s:24,t:0.6,v:0.8}]],0),
  'rule-toll':fxOf(2,1,[['towerbell',{s:-12,v:1.2}],[{a:0.01,d:2,g:0.055,rv:0.4},{s:-24}]],0),
  'rule-vent':fxOf(2,1,[[{w:3,nz:1,fl:3,fc:3500,a:0.02,d:0.5,g:0.22}],[{w:3,nz:1,fl:1,fc:150,a:0.05,d:0.6,g:0.38}]],0),
  'rule-star':fxOf(2,2,[[{p0:4,pt:0.25,a:0.01,d:0.35,g:0.055,rv:0.5},{f:700}],['glass',{n:14,t:0.3,v:0.9}],[{w:3,nz:1,fl:3,fc:4000,a:0.001,d:0.05,g:0.14},{t:0.3}]]),
  'rule-roots':fxOf(1,1,[[{w:1,vd:0.06,vr:9,fl:2,fc:600,q:3,a:0.05,d:0.3,g:0.1},{f:95}],[{w:3,nz:1,fl:2,fc:3500,q:1,td:0.7,tr:30,a:0.02,d:0.25,g:0.11}]]),
  'rule-still':fxOf(2,1,[[{a:0.4,d:0.8,g:0.045,rv:0.6},{s:24}],[{w:3,nz:1,fl:1,fc:300,a:0.3,d:0.6,g:0.1}],[{k:2,h2:0.1,a:0.3,d:1,g:0.06,rv:0.5},{cs:[0,7]}]],0),
  affix:fxOf(1,1,[['handbell',{s:13,v:0.55}],['handbell',{s:12,t:0.07,v:0.55}],[{w:3,nz:1,fl:1,fc:400,a:0.01,d:0.15,g:0.11}]],0),
  'ui-hover':fxOf(0,1,[[{a:0.001,d:0.018,g:0.03,rv:0.05},{f:2100}]],0),
  'ui-select':fxOf(1,1,[[{a:0.002,d:0.05,g:0.055,rv:0.1},{s:19}],[{a:0.002,d:0.08,g:0.055,rv:0.1},{s:24,t:0.045}]],0),
  'ui-back':fxOf(1,1,[[{a:0.002,d:0.05,g:0.055,rv:0.1},{s:19}],[{a:0.002,d:0.08,g:0.055,rv:0.1},{s:12,t:0.045}]],0),
  rule:fxOf(1,1,[[{w:3,nz:1,fl:2,fc:2000,fe:-1500,ft:0.3,a:0.3,d:0.1,g:0.16}],['handbell',{s:12,t:0.3,v:0.6}]],0),
  other:fxOf(1,1,[[{a:0.002,d:0.08,g:0.045,rv:0.2},{s:12}]],0)
};
SFX['event-complete']=SFX['route-complete'];
Object.values(SFX).forEach((design,i)=>{design.id=i+1;});
const FAMILIES=[['ui-','ui-select'],['gift-','gift-bloom'],['ally-','ally-up'],['rule-','rule'],['affix','affix'],['boss-','boss-guard'],['skill-','skill-learned'],['answer','answer']];

// A deck plays one arrangement with its own clock and voices; two or three decks crossfade on changes.
const VOICES=28,PLUCKS=8;
class Deck{
  constructor(){
    this.v=[];for(let i=0;i<VOICES;i++)this.v.push(new Voice(i<PLUCKS));this.grow(128);
    this.A=null;this.active=false;this.g=0;this.to=0;this.rate=0;this.a0=0;this.a1=0;this.bar=0;this.pos=0;this.next=0;this.stepLen=1;
    this.croot=0;this.third=3;this.fifth=7;this.tones=new Float32Array(9);this.chordN=new Float32Array(4);this.pn=0;this.freqs=new Float32Array(4);this.serial=0;
  }
  grow(n){this.L=new Float32Array(n);this.R=new Float32Array(n);this.RV=new Float32Array(n);this.EC=new Float32Array(n);}
  assign(A,bar,boss){this.A=A;this.active=true;this.bar=bar;this.pos=0;this.next=0;this.stepLen=FS*60/A.bpm/A.beat;this.g=0;this.to=0;this.a0=this.a1=0;this.setChord(boss);}
  fade(to,seconds){this.to=to;this.rate=1/Math.max(1,seconds*FS);}
  stop(){for(const v of this.v)v.on=false;if(this.A)this.A.resume=this.bar;this.A=null;this.active=false;this.g=this.to=this.a0=this.a1=0;}
  setChord(boss){
    const A=this.A,intro=this.bar<A.intro,b=intro?this.bar:this.bar-A.intro,list=intro?A.introChords:(boss&&A.bossChords)||A.chords;
    const c=list[Math.floor(b/A.chordBars)%list.length],T=c.tones,n=T.length,key=A.root,center=key+4;
    let r=((c.root%12)+12)%12;if(r>=7)r-=12;this.croot=r;this.third=T[1];this.fifth=T[2];
    for(let j=0;j<n;j++){let m=key+r+T[j];while(m<center-6)m+=12;while(m>=center+6)m-=12;this.chordN[j]=m;}this.pn=n;
    for(let j=0;j<9;j++)this.tones[j]=key+r+T[j%3]+12*((j/3)|0);
  }
  tick(score){
    const A=this.A,S=A.steps,s=this.pos,bar=this.bar,lg=score.lg,key=A.root,step=this.stepLen;
    if(s===0){if((bar<A.intro?bar:bar-A.intro)%A.chordBars===0)this.setChord(score.mood.boss>=2);if(score.lead===this)score.onBar(this);}
    const sec=((bar/8)|0)%A.form;
    for(const T of A.tracks){
      if(T.part===1?bar>=A.intro:T.part===2&&bar<A.intro)continue;
      if(!((T.sec>>sec)&1)||(A.adaptive?T.L!==BASE&&lg[T.L]<0.02:T.L>CALM))continue;
      const e=T.at[((T.part===2?bar-A.intro:bar)%T.bars)*S+s];if(e<0)continue;
      const vel=T.vel[e]*T.v*(0.93+0.14*rand()),len=(T.hold||T.len[e])*step,t=T.t;
      if(t===0)this.note(T,hz(key+T.o+T.code[e]),vel,len*0.94);
      else if(t===1){const c=T.code[e];this.note(T,hz(key+T.o+this.croot+(c===0?0:c===1?this.third:c===2?this.fifth:c===3?12:-12)),vel,len*0.9);}
      else if(t===2)this.note(T,hz(this.tones[Math.min(8,T.code[e])]+T.o),vel,len);
      else if(t===3){const v=this.voiceFor(T,false);if(v){for(let j=0;j<this.pn;j++)this.freqs[j]=hz(this.chordN[j]+T.o);v.start(T.P,0,vel,T.pan,len*0.98,0,T.L,T.pri).chord(this.freqs,this.pn);}}
      else if(t===4)this.note(T,T.P.hz>0?T.P.hz:hz(key+this.croot+T.P.to+T.o),vel,len);
      else if(t===5){this.note(T,hz(key+T.o),vel,len*0.98);if(T.fifth)this.note(T,hz(key+T.o+7),vel*0.7,len*0.98);}
      else this.note(T,hz(this.tones[3+((rand()*6)|0)]+T.o),vel,len);
    }
    if(++this.pos>=S){this.pos=0;this.bar++;}
  }
  note(T,f,vel,len){const v=this.voiceFor(T,T.P.k===1);if(v)v.start(T.P,f,vel,T.pan,len,0,T.L,T.pri);}
  // Each track keeps at most T.poly voices: its oldest one fades out (25 ms) to make room.
  voiceFor(T,pluck){
    let count=0,oldest=null;
    for(const v of this.v)if(v.on&&!v.killing&&v.owner===T){count++;if(!oldest||v.serial<oldest.serial)oldest=v;}
    if(oldest&&count>=T.poly)oldest.kill(SOFT);
    const v=this.alloc(pluck,T.pri);if(v){v.owner=T;v.serial=++this.serial;}return v;
  }
  // Free voice, else fade out the least important sounding one and drop this note.
  alloc(pluck,pri){
    const V=this.v;let victim=null,score=Infinity;
    if(pluck){for(let i=0;i<PLUCKS;i++){const v=V[i];if(!v.on)return v;const s=v.amp*(v.prio+1)*(v.stage===2?0.3:1);if(s<score){score=s;victim=v;}}}
    else for(let i=VOICES-1;i>=0;i--){const v=V[i];if(!v.on)return v;const s=v.amp*(v.prio+1)*(v.stage===2?0.3:1);if(s<score){score=s;victim=v;}}
    if(victim&&victim.prio<=pri)victim.kill(SOFT);
    return null;
  }
  render(lg,from,to){const ad=this.A.adaptive;for(const v of this.v)if(v.on)v.render(this.L,this.R,this.RV,this.EC,from,to,ad?lg[v.layer]:v.layer<=CALM?1:0);}
}

const SCENES=['title','play','answer','pause','dialogue','clear','victory','defeat'];
const FADES={answer:[0.7,0.9],dialogue:[1,1],clear:[1.2,1.4],victory:[1.5,1.5],defeat:[1.4,1.5],title:[1.2,1.2],pause:[0.8,0.8]},FROM_ANSWER=[0.9,0.8],FROM_MENU=[1,1],TRAVEL=[1.4,1.4],MAP_CHANGE=[1.5,1.5];
const FX_VOICES=28,FX_LIVE=20,LIMIT=0.85;

class DawnScore extends AudioWorkletProcessor{
  constructor(){
    super();
    this.samples=0;this.enabled=false;this.level=0;this.levelTo=0;this.levelRate=0;this.mute=1;this.muteTo=1;this.muteRate=1/(0.25*FS);this.mu=1;this.mg=0;
    this.scene='play';this.area=0;this.pending=-1;this.announce=false;this.mood={intensity:0,boss:0,danger:0};
    this.si=0;this.sb=0;this.sb2=0;this.sd=0;this.lg=new Float32Array(6);this.lg[BASE]=1;this.lg[CALM]=1;
    this.decks=[new Deck(),new Deck(),new Deck()];this.lead=null;this.waitA=null;this.waitIn=1;
    this.fx=[];for(let i=0;i<FX_VOICES;i++)this.fx.push(new Voice(i<4));this.inst=0;this.chordF=new Float32Array(4);
    this.key=62;this.scale=MODES.dorian;this.cap=0;this.grow(128);
    this.cut=1;this.cutTo=1;this.pg=1;this.p1=this.p2=this.p3=this.p4=this.q1=this.q2=0;this.duck=1;this.gain=1;this.needPrev=1;this.energy=0;
    this.eSize=Math.ceil(FS*1.3);this.eL=new Float32Array(this.eSize);this.eR=new Float32Array(this.eSize);this.ew=0;
    this.edA=FS*0.4;this.edB=FS*0.4;this.edTo=FS*0.4;this.exf=1;this.efb=0.3;this.efbTo=0.3;this.elL=0;this.elR=0;
    const k=FS/48000;this.rn=Int32Array.from([1559,1871,2251,2671],n=>Math.round(n*k));this.rb=Array.from(this.rn,n=>new Float32Array(n));
    this.ri=new Int32Array(4);this.rz=new Float32Array(4);this.rg=Float32Array.from(this.rn,n=>Math.pow(10,-3*n/(FS*2.4)));
    this.an=Int32Array.from([225,556],n=>Math.round(n*k));this.ab=Array.from(this.an,n=>new Float32Array(n));this.ai=new Int32Array(2);
    this.rvMix=0.3;this.rvTo=0.3;this.resL=0;this.resR=0;this.resK=Math.exp(-1/(0.004*FS));
    this.port.onmessage=({data})=>this.message(data);
  }
  grow(n){
    this.cap=n;for(const d of this.decks)d.grow(n);
    for(const name of ['mL','mR','mRV','mEC','sL','sR','sRV','sEC','yL','yR','dL','dR'])this[name]=new Float32Array(n);
  }
  message(d){
    if(!d||typeof d!=='object')return;
    if(d.kind==='enabled')this.setEnabled(!!d.value,Number(d.fade)||0);
    else if(d.kind==='mood')this.setMood(d);
    else if(d.kind==='sfx')this.trigger(String(d.name??''),d.gain,d.pan,d.pitch);
    else if(d.kind==='mute'){this.muteTo=d.value?0:1;this.muteRate=1/(Math.max(0.05,Number(d.fade)||0.25)*FS);}
  }
  setEnabled(on,fade){
    if(on){
      if(this.enabled)return;this.enabled=true;this.levelTo=1;this.announce=true;
      if(this.lead||this.waitA){this.levelRate=1/(0.6*FS);this.retarget(1,1);}else{this.level=1;this.mg=0;this.retarget(0.8,0.8);}
    }else{
      if(!this.enabled&&this.level<=0)return;this.enabled=false;this.levelTo=0;
      if(fade>0)this.levelRate=1/(fade*FS);else this.stopMusic(true);
    }
  }
  // Without a fade the music stops at once (and, with no effect sounding, so do the room's tails).
  stopMusic(hard){
    for(const d of this.decks)if(d.active)d.stop();
    this.lead=null;this.waitA=null;this.level=0;this.levelTo=0;this.mg=0;
    if(hard&&!this.fx.some(v=>v.on)){
      this.eL.fill(0);this.eR.fill(0);this.elL=this.elR=0;for(const b of this.rb)b.fill(0);for(const b of this.ab)b.fill(0);this.rz.fill(0);
      this.dL.fill(0);this.dR.fill(0);this.p1=this.p2=this.p3=this.p4=this.q1=this.q2=0;this.gain=1;this.needPrev=1;this.energy=0;
    }
  }
  setMood(d){
    const m=this.mood;
    if(Number.isFinite(d.intensity))m.intensity=clamp(+d.intensity,0,1);
    if(Number.isFinite(d.boss))m.boss=clamp(d.boss|0,0,3);
    if(Number.isFinite(d.danger))m.danger=clamp(+d.danger,0,1);
    const scene=SCENES.includes(d.scene)?d.scene:this.scene,changed=scene!==this.scene;let area=this.area;
    if(Number.isFinite(d.area)){
      const next=clamp(d.area|0,0,MAPS.length-1);
      // A map change inside one scene waits for the bar line; a scene change carries it at once.
      if(next!==this.area&&!changed&&this.lead&&this.enabled)this.pending=next;else{this.pending=-1;area=next;}
    }
    if(changed||area!==this.area){const from=this.scene;this.scene=scene;this.area=area;const f=FADES[scene]||(from==='answer'?FROM_ANSWER:from==='pause'||from==='dialogue'?FROM_MENU:TRAVEL);this.retarget(f[0],f[1]);}
    this.keyFrom();
  }
  desired(){
    const s=this.scene;
    if(s==='title'||s==='victory'||s==='defeat')return SCORE[s];
    if(s==='pause')return this.lead?this.lead.A:SCORE.play[this.area];
    return SCORE[s][this.area];
  }
  keyFrom(){const A=this.desired();this.key=60+((A.root%12)+12)%12;this.scale=A.scale;}
  retarget(fadeIn,fadeOut){
    this.cutTo=this.scene==='pause'?0:1;
    if(!this.enabled)return;
    const A=this.desired();let target=null;
    for(const d of this.decks)if(d.active&&d.A===A)target=d;
    for(const d of this.decks)if(d.active&&d!==target)d.fade(0,fadeOut);
    if(target){target.fade(1,fadeIn);this.lead=target;this.waitA=null;this.room(target.A);return;}
    this.lead=null;this.waitA=A;this.waitIn=fadeIn;this.claim();
  }
  // Start the wanted arrangement on a silent deck; a map theme resumes at the phrase it left.
  claim(){
    for(const d of this.decks)if(!d.active){
      const A=this.waitA,bar=A.scene==='play'&&A.area>=0?A.resume-A.resume%4:0;
      d.assign(A,bar,this.mood.boss>=2);d.fade(1,this.waitIn);this.lead=d;this.waitA=null;this.room(A);return;
    }
  }
  room(A){this.rvTo=A.rv;this.edTo=clamp(A.echo*60/A.bpm,0.08,1.2)*FS;this.efbTo=A.fb;}
  // Tells the page once per start (and per bar-quantised map change) that music is sounding.
  onBar(deck){
    if(this.pending>=0){const next=this.pending;this.pending=-1;if(next!==this.area){this.area=next;this.retarget(MAP_CHANGE[0],MAP_CHANGE[1]);this.keyFrom();this.announce=true;}}
    if(this.announce){this.announce=false;this.port.postMessage({kind:'bar',area:this.area,scene:this.scene,bar:deck.bar});}
  }
  trigger(name,gain,pan,pitch){
    let D=Object.hasOwn(SFX,name)?SFX[name]:null;
    if(!D){for(const [prefix,family] of FAMILIES)if(name.startsWith(prefix)){D=SFX[family];break;}if(!D)D=SFX.other;}
    const pool=this.fx,g=Number.isFinite(gain)?clamp(gain,0,2):1,p=Number.isFinite(pan)?clamp(pan,-1,1):0,k=Number.isFinite(pitch)&&pitch>0?clamp(pitch,0.25,4):1;
    let heads=0,oldest=Infinity,live=0;
    for(const v of pool)if(v.on&&!v.killing){live++;if(v.tag===D.id&&v.head){heads++;if(v.inst<oldest)oldest=v.inst;}}
    if(heads>=D.m)for(const v of pool)if(v.on&&v.inst===oldest&&!v.killing){v.kill();live--;}
    // Keep a fixed number of live voices: fade the least important, oldest ones out first.
    while(live+D.l.length>FX_LIVE){
      let victim=null;for(const v of pool)if(v.on&&!v.killing&&v.prio<=D.p&&(!victim||v.prio<victim.prio||v.prio===victim.prio&&v.inst<victim.inst))victim=v;
      if(!victim)break;victim.kill();live--;
    }
    const inst=++this.inst,jitter=1+(rand()*2-1)*D.j;
    D.l.forEach((layer,index)=>{
      const pluck=layer.P.k===1;let v=null;
      for(let i=pluck?0:pool.length-1;pluck?i<4:i>=0;i+=pluck?1:-1)if(!pool[i].on){v=pool[i];break;}
      if(!v)for(let i=pluck?0:pool.length-1;pluck?i<4:i>=0;i+=pluck?1:-1){const c=pool[i];if(c.killing&&(!v||Math.abs(c.outL)+Math.abs(c.outR)<Math.abs(v.outL)+Math.abs(v.outR)))v=c;}
      if(!v)return;if(v.on){this.resL+=v.outL;this.resR+=v.outR;}v.outL=v.outR=0;
      let f=layer.f;if(layer.n!==null)f=hz(this.key+degree(this.scale,layer.n));else if(layer.s!==null)f=hz(this.key+layer.s);
      v.start(layer.P,f*k*jitter,g*layer.v,p+layer.pan,layer.h*FS,layer.t*FS,-1,D.p);
      if(layer.c||layer.cs){const list=layer.c||layer.cs;for(let j=0;j<list.length;j++)this.chordF[j]=hz(this.key+(layer.c?degree(this.scale,list[j]):list[j]))*k;v.chord(this.chordF,list.length);}
      v.tag=D.id;v.inst=inst;v.head=index===0;
    });
  }
  blockMood(dt){
    const m=this.mood,i=m.intensity,bt=m.boss===0?0:m.boss===1?0.75:1,lg=this.lg,boss=1-Math.exp(-dt/1.1);
    this.si+=(i-this.si)*(1-Math.exp(-dt/(i>this.si?1.2:4)));this.sb+=(bt-this.sb)*boss;this.sb2+=((m.boss===3?1:0)-this.sb2)*boss;
    this.sd+=(m.danger-this.sd)*(1-Math.exp(-dt/(m.danger>this.sd?0.4:2)));
    const combat=Math.max(ease(0.12,0.55,this.si),Math.min(1,this.sb*1.3));
    lg[BASE]=1;lg[CALM]=1-combat;lg[COMBAT]=combat;lg[BOSS]=this.sb;lg[BOSS2]=this.sb2;lg[DANGER]=this.sd;
  }
  process(inputs,outputs){
    const out=outputs[0];if(!out||!out.length)return true;
    const L=out[0],R=out.length>1?out[1]:null,N=L.length;
    if(N!==this.cap){this.grow(N);this.gain=1;this.needPrev=1;}
    const music=this.enabled||this.level>0;let sfx=false;for(const v of this.fx)if(v.on){sfx=true;break;}
    if(!music&&!sfx&&this.energy<1e-5){L.fill(0);if(R)R.fill(0);return true;}
    const dt=N*INV,inv=1/N,mL=this.mL,mR=this.mR,mRV=this.mRV,mEC=this.mEC,sL=this.sL,sR=this.sR,sRV=this.sRV,sEC=this.sEC;
    this.blockMood(dt);
    if(this.level!==this.levelTo){const step=this.levelRate*N;this.level=this.levelTo>this.level?Math.min(this.levelTo,this.level+step):Math.max(this.levelTo,this.level-step);if(this.level<=0&&!this.enabled)this.stopMusic(false);}
    if(this.waitA&&this.enabled)this.claim();
    mL.fill(0);mR.fill(0);mRV.fill(0);mEC.fill(0);sL.fill(0);sR.fill(0);sRV.fill(0);sEC.fill(0);
    if(this.enabled||this.level>0){
      for(const d of this.decks){
        d.a0=d.a1;if(!d.active)continue;
        if(d.g!==d.to){const step=d.rate*N;d.g=d.to>d.g?Math.min(d.to,d.g+step):Math.max(d.to,d.g-step);}
        if(d.g<=0&&d.to===0&&this.lead!==d){d.stop();continue;}
        d.a1=Math.sin(d.g*Math.PI/2)*d.A.gain;d.L.fill(0);d.R.fill(0);d.RV.fill(0);d.EC.fill(0);
      }
      for(let pos=0;pos<N;){
        for(const d of this.decks)if(d.active)while(d.next<=0){d.tick(this);d.next+=d.stepLen;}
        let seg=N-pos;for(const d of this.decks)if(d.active){const k=Math.ceil(d.next);if(k<seg)seg=k;}
        if(seg<=0)continue;
        for(const d of this.decks)if(d.active){d.render(this.lg,pos,pos+seg);d.next-=seg;}
        pos+=seg;
      }
      for(const d of this.decks)if(d.active&&(d.a0>0||d.a1>0)){
        const a0=d.a0,da=(d.a1-a0)*inv,dL=d.L,dR=d.R,dRV=d.RV,dEC=d.EC;
        for(let i=0;i<N;i++){const a=a0+da*i;mL[i]+=dL[i]*a;mR[i]+=dR[i]*a;mRV[i]+=dRV[i]*a;mEC[i]+=dEC[i]*a;}
      }
      this.samples+=N;
    }
    let speak=0;
    if(sfx){for(const v of this.fx)if(v.on)v.render(sL,sR,sRV,sEC,0,N,1);for(let i=0;i<N;i++){const a=Math.abs(sL[i])+Math.abs(sR[i]);if(a>speak)speak=a;}}
    // Block-rate controls, interpolated per sample below.
    const kc=1-Math.exp(-dt/0.25);this.cut+=(this.cutTo-this.cut)*kc;this.pg+=((this.cutTo>0.5?1:0.42)-this.pg)*kc;
    const duckTo=1-Math.min(0.3,speak*0.45);this.duck=duckTo<this.duck?duckTo:this.duck+(duckTo-this.duck)*(1-Math.exp(-dt/0.3));
    this.mute=this.muteTo<this.mute?Math.max(this.muteTo,this.mute-this.muteRate*N):Math.min(this.muteTo,this.mute+this.muteRate*N);
    const kf=1-Math.exp(-dt/1.2);this.rvMix+=(this.rvTo-this.rvMix)*kf;this.efb+=(this.efbTo-this.efb)*kf;
    if(this.exf>=1&&Math.abs(this.edTo-this.edA)>1){this.edB=this.edTo;this.exf=0;}
    const mg0=this.mg,mg1=this.level*this.pg*this.duck;this.mg=mg1;
    const fc=Math.min(650*Math.pow(27.7,this.cut),FS*0.45),pgk=Math.tan(Math.PI*fc*INV),b1=1/(1+pgk*(pgk+1.4142)),b2=pgk*b1,b3=pgk*b2,c1=1-Math.exp(-TAU*fc*INV);
    let p1=this.p1,p2=this.p2,p3=this.p3,p4=this.p4,q1=this.q1,q2=this.q2;
    const eL=this.eL,eR=this.eR,size=this.eSize,efb=this.efb,xfStep=1/(0.05*FS),edB=this.edB;let ew=this.ew,elL=this.elL,elR=this.elR,exf=this.exf,edA=this.edA;
    const rb=this.rb,B0=rb[0],B1=rb[1],B2=rb[2],B3=rb[3],n0=this.rn[0],n1=this.rn[1],n2=this.rn[2],n3=this.rn[3],g0=this.rg[0],g1=this.rg[1],g2=this.rg[2],g3=this.rg[3];
    let i0=this.ri[0],i1=this.ri[1],i2=this.ri[2],i3=this.ri[3],z0=this.rz[0],z1=this.rz[1],z2=this.rz[2],z3=this.rz[3];
    const A0=this.ab[0],A1=this.ab[1],an0=this.an[0],an1=this.an[1],wet=this.rvMix*0.55;let ai0=this.ai[0],ai1=this.ai[1];
    const yL=this.yL,yR=this.yR,resK=this.resK;let peak=0,resL=this.resL,resR=this.resR;
    for(let i=0;i<N;i++){
      const mg=mg0+(mg1-mg0)*i*inv;
      let v3=mL[i]-p2,v1=b1*p1+b2*v3,v2=p2+b2*p1+b3*v3;p1=2*v1-p1;p2=2*v2-p2;let l=v2;
      v3=mR[i]-p4;v1=b1*p3+b2*v3;v2=p4+b2*p3+b3*v3;p3=2*v1-p3;p4=2*v2-p4;let r=v2;
      q1+=c1*(mRV[i]-q1);q2+=c1*(mEC[i]-q2);
      l=l*mg+sL[i]+resL;r=r*mg+sR[i]+resR;resL*=resK;resR*=resK;
      // Ping-pong echo; a delay-time change crossfades between two read heads instead of sweeping pitch.
      let rp=ew-edA;if(rp<0)rp+=size;let ri=rp|0,rf=rp-ri,rj=ri+1>=size?0:ri+1;
      let yl=eL[ri]+(eL[rj]-eL[ri])*rf,yr=eR[ri]+(eR[rj]-eR[ri])*rf;
      if(exf<1){rp=ew-edB;if(rp<0)rp+=size;ri=rp|0;rf=rp-ri;rj=ri+1>=size?0:ri+1;const bl=eL[ri]+(eL[rj]-eL[ri])*rf,br=eR[ri]+(eR[rj]-eR[ri])*rf;yl+=(bl-yl)*exf;yr+=(br-yr)*exf;exf+=xfStep;if(exf>=1)edA=edB;}
      elL+=0.5*(yr-elL);elR+=0.5*(yl-elR);eL[ew]=q2*mg+sEC[i]+elL*efb;eR[ew]=elR*efb;if(++ew>=size)ew=0;
      l+=yl*0.5;r+=yr*0.5;
      // Four-line feedback delay network room, fed through two diffusers.
      let x=(q1*mg+sRV[i])*0.5+(yl+yr)*0.1,bv=A0[ai0],w=x+0.6*bv;x=bv-0.6*w;A0[ai0]=w;if(++ai0>=an0)ai0=0;
      bv=A1[ai1];w=x+0.6*bv;x=bv-0.6*w;A1[ai1]=w;if(++ai1>=an1)ai1=0;
      const d0=B0[i0],d1=B1[i1],d2=B2[i2],d3=B3[i3];
      z0+=0.45*((d0+d1+d2+d3)*0.5-z0);z1+=0.45*((d0-d1+d2-d3)*0.5-z1);z2+=0.45*((d0+d1-d2-d3)*0.5-z2);z3+=0.45*((d0-d1-d2+d3)*0.5-z3);
      B0[i0]=x+z0*g0;B1[i1]=x+z1*g1;B2[i2]=z2*g2-x;B3[i3]=z3*g3-x;if(++i0>=n0)i0=0;if(++i1>=n1)i1=0;if(++i2>=n2)i2=0;if(++i3>=n3)i3=0;
      l+=(d0+d2*0.6)*wet;r+=(d1+d3*0.6)*wet;
      yL[i]=l;yR[i]=r;const a=l<0?-l:l,b=r<0?-r:r;if(a>peak)peak=a;if(b>peak)peak=b;
    }
    this.edA=edA;this.resL=Math.abs(resL)<1e-9?0:resL;this.resR=Math.abs(resR)<1e-9?0:resR;this.p1=p1;this.p2=p2;this.p3=p3;this.p4=p4;this.q1=q1;this.q2=q2;this.ew=ew;this.elL=elL;this.elR=elR;this.exf=Math.min(1,exf);
    this.ri[0]=i0;this.ri[1]=i1;this.ri[2]=i2;this.ri[3]=i3;this.rz[0]=z0;this.rz[1]=z1;this.rz[2]=z2;this.rz[3]=z3;this.ai[0]=ai0;this.ai[1]=ai1;
    // Look-ahead limiter: the output runs one block late, so the gain reaches what the next block needs in time.
    const need=peak>LIMIT?LIMIT/peak:1,target=Math.min(need,this.needPrev),g0l=this.gain,g1l=target<g0l?target:g0l+(target-g0l)*(1-Math.exp(-dt/0.15));
    const dL=this.dL,dR=this.dR,mu0=this.mu,mu1=this.mute;
    for(let i=0;i<N;i++){
      const t=i*inv,g=(g0l+(g1l-g0l)*t)*(mu0+(mu1-mu0)*t);let l=dL[i]*g,r=dR[i]*g;
      l=l>0.99?0.99:l<-0.99?-0.99:l;r=r>0.99?0.99:r<-0.99?-0.99:r;
      if(R){L[i]=l;R[i]=r;}else L[i]=(l+r)*0.5;
    }
    this.gain=g1l;this.needPrev=need;this.mu=mu1;this.dL=yL;this.dR=yR;this.yL=dL;this.yR=dR;this.energy=peak;
    return true;
  }
}
registerProcessor('dawn-score',DawnScore);
