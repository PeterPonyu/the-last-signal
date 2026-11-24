// Campaign definitions are shared by rendering, real play and asset-free evaluation.
export const CAMPAIGN = [
  {
    id:'garden',milestones:[25,65,115,160],hardMilestones:[35,110,190,265],hub:{x:2260,y:1280},arena:{x:2850,y:1230},
    routes:[
      {id:'archive',name:'Root Archive',verb:'Repair the clock',kind:'repair',reward:'forge',color:'#ead098',sites:[{x:1580,y:570},{x:1760,y:650},{x:1430,y:820}],npc:'tovin',story:'Tovin frees a golden gear; your Sunblade grows stronger.'},
      {id:'orchard',name:'First-light Orchard',verb:'Escort Luma',kind:'escort',reward:'grove',color:'#bbd690',sites:[{x:1570,y:1900},{x:1810,y:1820},{x:1420,y:1620}],npc:'luma',story:'Luma carries the seeds out; their grove heals you over time.'}
    ],
    event:{name:'The Living Mainspring',kind:'convoy',text:'Escort the mainspring',duration:34},
    champion:{id:'briar-regent',name:'The Briar Regent',role:'thornbound',speed:66,lore:'An orchard knight who sealed every road to keep one perfect spring.'},
    lieutenant:'tender',bossKind:'root',
    messages:['Iria: Each Hollow you free loosens the roots.','Two roads are open: pick one and protect its keeper.','The mainspring stirs; walk it east to the clock.','The Root Tender comes to bury tomorrow; break the counterattack.','The roots part as the Root Warden comes for the clock.'],
    npcs:[{id:'iria',name:'Iria',title:'Keeper of the Hours',kind:'clock',x:585,y:1580,body:'guide',text:'The Choir stopped tomorrow. Free the Hollow and two old roads will open.'},{id:'tovin',name:'Tovin',title:'Clockwork Smith',kind:'smith',body:'smith',text:'Guard the circle while I turn the gears. My forge will sharpen your Sunblade.'},{id:'luma',name:'Luma',title:'The Last Seed Keeper',kind:'seed',body:'keeper',text:'Stay close while I carry these seeds out. Their grove will heal you.'}]
  },
  {
    id:'causeway',milestones:[30,80,140,190],hardMilestones:[40,135,230,315],hub:{x:2220,y:1270},arena:{x:2860,y:900},
    routes:[
      {id:'towers',name:'Silent Signal Towers',verb:'Retune the signal',kind:'repair',reward:'cover',color:'#99d5dd',sites:[{x:1510,y:620},{x:1770,y:680},{x:1450,y:880}],npc:'maelin',story:'Maelin turns the bridge; its cover softens every hit.'},
      {id:'procession',name:'The Refugee Procession',verb:'Escort Vesper',kind:'escort',reward:'courier',color:'#d1b8ed',sites:[{x:1510,y:1860},{x:1770,y:1780},{x:1450,y:1600}],npc:'vesper',story:'Vesper brings the procession home; the wind quickens your step.'}
    ],
    event:{name:'The Bell Procession',kind:'convoy',text:'Escort the bell',duration:38},
    champion:{id:'march-without-end',name:'The March Without End',role:'processional',speed:76,lore:'A captain sworn never to leave a refugee behind, now marching in endless circles.'},
    lieutenant:'bellsmith',bossKind:'bell',
    messages:['Oren: The mainspring lives; let us give tomorrow a voice.','Two roads are open: the north towers or the south procession.','The bridge turns; escort the free bell across.','The Bellsmith forges a new command; shatter its hammer.','The Bell Warden hears a voice it cannot command.'],
    npcs:[{id:'oren',name:'Oren',title:'The Unheard Bellkeeper',kind:'bell',x:585,y:1580,body:'guide',text:'Iria sent you with a reason to begin. The north towers and south procession need you.'},{id:'maelin',name:'Maelin',title:'Bridge Engineer',kind:'bridge',body:'engineer',text:'Keep this circle clear while I turn the bridge. Its cover will shield you.'},{id:'vesper',name:'Vesper',title:'Signal Courier',kind:'courier',body:'courier',text:'Walk beside me to the bell. I’ll teach your steps to follow the wind.'}]
  },
  {
    id:'court',milestones:[35,90,155,220],hardMilestones:[45,150,255,365],hub:{x:2230,y:1250},arena:{x:2860,y:1420},
    routes:[
      {id:'names',name:'Archive of Lost Names',verb:'Read the names',kind:'repair',reward:'memory',color:'#d0b6ef',sites:[{x:1510,y:620},{x:1760,y:700},{x:1470,y:870}],npc:'nemi',story:'Nemi reads the erased names aloud; your light grows sharper.'},
      {id:'guard',name:'The Refusing Guard',verb:'Escort Cael',kind:'escort',reward:'guard',color:'#efc981',sites:[{x:1540,y:1900},{x:1760,y:1800},{x:1420,y:1610}],npc:'cael',story:'Cael lays down the Crown’s command; his shield now guards you.'}
    ],
    event:{name:'The Gathering of Names',kind:'gathering',text:'Hold the orrery',duration:40},
    champion:{id:'nameless-judge',name:'The Nameless Judge',role:'justiciar',speed:72,lore:'The first judge to give up a name, now condemning everyone who remembers one.'},
    lieutenant:'reaver',bossKind:'crown',
    messages:['Sera: Time and voice are here; now take back the names.','Two archive wings open: the names, or the guard who refused.','The keepers gather at the orrery; stand with them.','The Memory Reaver is closing the archive; stop it.','The Crown descends; a shared dawn needs no throne.'],
    npcs:[{id:'sera',name:'Sera',title:'Archivist of Unspoken Names',kind:'sun',x:585,y:1580,body:'guide',text:'I kept the names the Choir erased. Free an archive wing and protect the gathering.'},{id:'nemi',name:'Nemi',title:'Escaped Archivist',kind:'book',body:'archivist',text:'Keep the light on this archive while I read the names. They will sharpen your light.'},{id:'cael',name:'Cael',title:'The Refusing Guard',kind:'shield',body:'guard',text:'I refused one order too late. Walk me to the orrery; my shield is yours.'}]
  },
  {
    id:'foundry',milestones:[30,65,105,150],hardMilestones:[40,90,150,210],hub:{x:2230,y:1280},arena:{x:2850,y:1500},
    routes:[
      {id:'sluices',name:'The Cooling Sluices',verb:'Open the sluices',kind:'repair',reward:'cover',color:'#a1d8d6',sites:[{x:1530,y:610},{x:1750,y:690},{x:1430,y:850}],npc:'rivet',story:'Rivet opens the channels; the cool water shields you.'},
      {id:'embers',name:'The Ember Bearer’s Road',verb:'Escort Orin',kind:'escort',reward:'forge',color:'#f5ba7b',sites:[{x:1510,y:1870},{x:1760,y:1780},{x:1440,y:1590}],npc:'orin',story:'Orin brings the ember home; it now burns in your Sunblade.'}
    ],
    event:{name:'The Unchained Heart',kind:'convoy',text:'Escort the sun-heart',duration:36},
    champion:{id:'ash-marshal',name:'The Ash Marshal',role:'emberguard',speed:78,lore:'Once a rescue captain, it now treats every escape as a fire to put out.'},
    lieutenant:'kilnkeeper',bossKind:'furnace',
    messages:['Asha: The Court gave back our names; now we build.','Two roads are open: the cooling sluices or the ember bearer.','The new sun-heart moves; escort it to the crucible.','The Kilnkeeper tries to seal the crucible; break the counterattack.','The Furnace Sovereign leaves its throne; watch for falling embers.'],
    npcs:[{id:'asha',name:'Asha',title:'The Unchained Artificer',kind:'clock',x:585,y:1580,body:'guide',text:'We forged chains here; now we forge freedom. Rivet knows the channels, and Orin carries the last ember.'},{id:'rivet',name:'Rivet',title:'Sluice Keeper',kind:'bridge',body:'engineer',text:'Protect me while I open the old sluices. The water will cool the sun-heart and shield you.'},{id:'orin',name:'Orin',title:'The Ember Bearer',kind:'smith',body:'smith',text:'My family kept this flame through every winter. Walk me to the crucible and it will burn in your Sunblade.'}]
  },
  {
    id:'observatory',milestones:[35,75,115,165],hardMilestones:[45,100,165,225],hub:{x:2240,y:1270},arena:{x:2850,y:940},
    routes:[
      {id:'lenses',name:'The Broken Lens Array',verb:'Align the lenses',kind:'repair',reward:'memory',color:'#b9cef7',sites:[{x:1520,y:600},{x:1770,y:680},{x:1430,y:870}],npc:'eiran',story:'Eiran turns the lenses free; your light grows sharper.'},
      {id:'horizon',name:'The Horizon Library',verb:'Escort Mira',kind:'escort',reward:'grove',color:'#dfc1f5',sites:[{x:1530,y:1890},{x:1760,y:1780},{x:1430,y:1590}],npc:'mira',story:'Mira brings the atlas home; its grove heals you over time.'}
    ],
    event:{name:'The Star Alignment',kind:'gathering',text:'Hold the sky engine',duration:34},
    champion:{id:'horizon-eater',name:'The Horizon Eater',role:'voidlancer',speed:88,lore:'A star pilot ordered to close every road no ruler could see.'},
    lieutenant:'astromancer',bossKind:'constellation',
    messages:['Lyra: You brought tomorrow this far; now give it a sky.','Two roads are open: the broken lenses or the horizon keeper.','The keepers align the stars; hold the sky engine.','The Astromancer is erasing the free stars; stop it.','The Last Constellation descends; read its paths.'],
    npcs:[{id:'lyra',name:'Lyra',title:'Sky Watcher',kind:'sun',x:585,y:1580,body:'guide',text:'The Choir drew one ending across the stars. Help Eiran or Mira, then bring the keepers to the sky engine.'},{id:'eiran',name:'Eiran',title:'The Lenswright',kind:'book',body:'archivist',text:'Hold this light steady while I align the lenses. Every name deserves a star.'},{id:'mira',name:'Mira',title:'Keeper of Unwritten Horizons',kind:'seed',body:'keeper',text:'This atlas has room for roads no one has imagined. Protect me on the way to the sky engine.'}]
  }
];

// Hard's denser formations need their own objectives so pressure does not
// accidentally shorten the campaign. No time gate delays a completed fight.
export function campaignMilestones(areaIndex,difficulty='normal'){
 const area=CAMPAIGN[areaIndex];
 return difficulty==='hard'?area.hardMilestones:area.milestones;
}

export const NPC_COMBAT={
 smith:{health:200,damage:22,range:240,interval:2.2,skill:'Forge spark'},
 keeper:{health:180,damage:16,range:330,interval:2,skill:'Seed light'},
 engineer:{health:190,damage:18,range:350,interval:2.1,skill:'Signal bolt'},
 courier:{health:170,damage:15,range:390,interval:1.8,skill:'Guiding flare'},
 archivist:{health:180,damage:19,range:370,interval:2.2,skill:'Memory shard'},
 guard:{health:240,damage:26,range:200,interval:2,skill:'Shield light'}
};

export const UPGRADES=[
 {id:'radiance',name:'Radiance',family:'Sunshard',text:'Sunshard damage +28%.',max:3},
 {id:'volley',name:'Twin Dawn',family:'Sunshard',text:'Fire a second Sunshard at 55% power.',max:1},
 {id:'focus',name:'Far Horizon',family:'Sunshard',text:'Sunshard range +90.',max:2},
 {id:'tempo',name:'Quickening Light',family:'Sunshard',text:'Sunshard fire interval −12%.',max:2},
 {id:'edge',name:'Golden Edge',family:'Sunblade',text:'Sunblade and Sunbreak power +25%.',max:3},
 {id:'cleave',name:'Open Road',family:'Sunblade',text:'Sunblade reach +24 and a wider arc.',max:2},
 {id:'flow',name:'Flowing Resolve',family:'Sunblade',text:'Sunblade cooldown −15%; Sunbreak −12%.',max:2},
 {id:'finisher',name:'Dawn’s Answer',family:'Sunblade',text:'Sunblade, Sunbreak +40% below half enemy health.',max:1},
 {id:'resolve',name:'Resolve',family:'Dawn',text:'Maximum health +20. Heal 45.',max:3},
 {id:'stride',name:'Windward Step',family:'Dawn',text:'Move 10% faster; dash cooldown −15%.',max:2},
 {id:'ward',name:'Sheltering Light',family:'Dawn',text:'Gain a 22-point shield every 18s.',max:2},
 {id:'mend',name:'Shared Dawn',family:'Dawn',text:'Dawnweaver heals 8 more, 3s sooner.',max:2}
];
export const UPGRADE_THRESHOLDS=[8,22,42,68,100,138,180,230,285,350,425,510,600,700,810,930,1060,1200];
export function upgradeChoices(run){
 const owned=run.upgrades||{},out=[];
 for(const family of ['Sunshard','Sunblade','Dawn']){
  const cards=UPGRADES.filter(c=>c.family===family&&(owned[c.id]||0)<c.max);
  if(cards.length)out.push(cards[(run.level-1)%cards.length]);
 }
 return out;
}
