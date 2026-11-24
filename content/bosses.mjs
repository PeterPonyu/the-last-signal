// Boss encounters, one entry per map. Every Warden carries a guard that only blades and
// bursts can break; breaking it exposes the Warden. Both ranks rotate authored skills per
// phase. The same rules drive browser play and the headless evaluation.
export const BOSS_RULES={
  guardRanged:0.25,                       // ranged light that still reaches a guarded Warden
  exposedBonus:1.5,                       // damage taken while exposed
  exposed:{easy:4.5,normal:3.5,hard:3},   // seconds the Warden stays exposed after a break
  regrow:{easy:5.5,normal:4.5,hard:3.5},  // seconds after the exposed window before the guard returns
  guardScale:{easy:0.8,normal:1,hard:1.2},
  cadence:{easy:1.2,normal:1,hard:0.88},  // spell cooldown multiplier
  damageScale:{easy:0.65,normal:1,hard:1.2}, // boss hits; Hard's crowd already hits harder
  phaseCadence:0.85,                      // second phases cast more often
  slam:{radius:150,reach:120,hold:0.9,windup:1.2,cooldown:5.5,damage:1.6},
  chase:{steps:5,interval:0.45,radius:78},
  lead:{radius:80},
  // A guard left standing too long enrages the Warden until a blade or burst breaks it.
  enrage:{after:{easy:15,normal:12,hard:10},cadence:0.55,damage:1.2},
  boltSpeed:265,                          // boss bolts; ordinary Hollow bolts fly at 225
  summonLimit:62
};

const warden=(health,speed,guard,cooldown,phases,summon)=>({health,speed,guard,cooldown,phases,summon});
const champion=(health,cooldown,phases)=>({health,cooldown,phases});
export const BOSSES=[
  {warden:warden(5900,72,300,[2.0,2.6],[['chase','rays','lead'],['rays','ring','chase','lead']],'sower'),
   champion:champion(2600,[2.6,3.2],[['rootline','chase'],['ring','lead','chase']])},
  {warden:warden(7400,82,340,[2.0,2.6],[['fan','chase','ripple','lead'],['ripple','twin','fan','chase']],'chorister'),
   champion:champion(3800,[2.6,3.2],[['resonance','fan'],['chase','resonance','lead']])},
  {warden:warden(9500,90,380,[2.0,2.6],[['crown','chase','lead'],['cross','ripple','crown','rays']],'astral'),
   champion:champion(4300,[2.6,3.2],[['cross','chase'],['crown','lead','chase']])},
  {warden:warden(10400,84,420,[2.0,2.6],[['meteor','sweep','chase'],['forge','meteor','rays','sweep']],'cinder'),
   champion:champion(4600,[2.6,3.2],[['sweep','meteor'],['meteor','sweep','lead']])},
  {warden:warden(11200,92,460,[2.0,2.6],[['seeker','radial','lead'],['meteor','cross','twin','ripple']],'lenswalker'),
   champion:champion(5000,[2.6,3.2],[['afterimage','seeker'],['seeker','lead','chase']])}
];
export const HAZARD_FAMILIES=['thorn','chime','eclipse','ember','cosmos'];
