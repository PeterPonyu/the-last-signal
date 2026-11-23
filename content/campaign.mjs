// Campaign definitions are shared by rendering, real play and asset-free evaluation.
export const CAMPAIGN = [
  {
    id:'garden',milestones:[25,65,115,160],hardMilestones:[35,110,190,265],hub:{x:2260,y:1280},arena:{x:2850,y:1230},
    routes:[
      {id:'archive',name:'Root Archive',verb:'Repair the clockworks',kind:'repair',reward:'forge',color:'#ead098',sites:[{x:1580,y:570},{x:1760,y:650},{x:1430,y:820}],npc:'tovin',story:'Tovin frees a golden gear. The clock now remembers how to move forward.'},
      {id:'orchard',name:'First-light Orchard',verb:'Rescue the seed keeper',kind:'escort',reward:'grove',color:'#bbd690',sites:[{x:1570,y:1900},{x:1810,y:1820},{x:1420,y:1620}],npc:'luma',story:'Luma carries living seeds out of the roots. A healing grove opens behind her.'}
    ],
    event:{name:'The Living Mainspring',kind:'convoy',text:'Walk beside the mainspring to carry it to the eastern clock.',duration:34},
    champion:{id:'briar-regent',name:'The Briar Regent',role:'thornbound',health:1360,speed:66,lore:'The first orchard protector sealed the roads to save one perfect spring. It now hunts anyone carrying a seed beyond the wall.'},
    lieutenant:'tender',bossKind:'root',bossHealth:2450,bossSpeed:72,bossSkills:[['rootfall','rootfall'],['rootline','ring']],
    messages:['Iria: Every Hollow freed loosens the roots. Make a road with your courage.','Two roads answer. Restore the Archive or save the seed keeper. Your choice will travel with you.','The old mainspring is stirring. Bring your rescued keeper to the clock.','The Root Tender has come to bury tomorrow. Break its shelter.','The roots part. The Warden is coming for the living clock.'],
    npcs:[{id:'iria',name:'Iria',title:'Keeper of the Hours',kind:'clock',x:585,y:1580,body:'guide',text:'The Choir made tomorrow a forbidden word. Free the Hollow and the two old roads will awaken. I will keep your story.'},{id:'tovin',name:'Tovin',title:'Clockwork Smith',kind:'smith',body:'smith',text:'Hold the repair circle while I turn the gears. My forge will strengthen your Sunblade on every road ahead.'},{id:'luma',name:'Luma',title:'The Last Seed Keeper',kind:'seed',body:'keeper',text:'Stay near me and I can carry these seeds to safety. They will grow wherever your next road begins.'}]
  },
  {
    id:'causeway',milestones:[30,80,140,190],hardMilestones:[40,135,230,315],hub:{x:2220,y:1270},arena:{x:2860,y:900},
    routes:[
      {id:'towers',name:'Silent Signal Towers',verb:'Retune the signal',kind:'repair',reward:'cover',color:'#99d5dd',sites:[{x:1510,y:620},{x:1770,y:680},{x:1450,y:880}],npc:'maelin',story:'Maelin turns the bridge toward the free bell. A new crossing opens.'},
      {id:'procession',name:'The Refugee Procession',verb:'Guide the courier home',kind:'escort',reward:'courier',color:'#d1b8ed',sites:[{x:1510,y:1860},{x:1770,y:1780},{x:1450,y:1600}],npc:'vesper',story:'Vesper brings the stranded procession across. Its voices now answer the bell.'}
    ],
    event:{name:'The Bell Procession',kind:'convoy',text:'Escort the free bell across the turning bridge.',duration:38},
    champion:{id:'march-without-end',name:'The March Without End',role:'processional',health:1720,speed:76,lore:'A captain who vowed never to abandon the last refugee was trapped in a procession that the Choir would never allow to arrive.'},
    lieutenant:'bellsmith',bossKind:'bell',bossHealth:3100,bossSpeed:82,bossSkills:[['fan','fan'],['resonance','radial']],
    messages:['Oren: The mainspring is alive. Let us give tomorrow a voice.','Silence the towers or bring the procession home. Both roads can break the Choir.','The bridge answers your choice. Escort the free bell across it.','The Bellsmith is forging another command. Shatter its hammer.','The platform turns. The Bell Warden has heard a voice it cannot command.'],
    npcs:[{id:'oren',name:'Oren',title:'The Unheard Bellkeeper',kind:'bell',x:585,y:1580,body:'guide',text:'Iria sent more than a mainspring. She sent a reason to begin. The northern towers and southern procession need you.'},{id:'maelin',name:'Maelin',title:'Bridge Engineer',kind:'bridge',body:'engineer',text:'Keep this circle clear while I turn the bridge. Our crossing will carry cover into the Court.'},{id:'vesper',name:'Vesper',title:'Signal Courier',kind:'courier',body:'courier',text:'Travel beside me. I will carry every rescued name ahead of you, and teach your steps to follow the wind.'}]
  },
  {
    id:'court',milestones:[35,90,155,220],hardMilestones:[45,150,255,365],hub:{x:2230,y:1250},arena:{x:2860,y:1420},
    routes:[
      {id:'names',name:'Archive of Lost Names',verb:'Release the memories',kind:'repair',reward:'memory',color:'#d0b6ef',sites:[{x:1510,y:620},{x:1760,y:700},{x:1470,y:870}],npc:'nemi',story:'Nemi reads the erased names aloud. The imprisoned memories become stars.'},
      {id:'guard',name:'The Refusing Guard',verb:'Lead the guard to the sun',kind:'escort',reward:'guard',color:'#efc981',sites:[{x:1540,y:1900},{x:1760,y:1800},{x:1420,y:1610}],npc:'cael',story:'Cael lays down the Crown’s command. His shield now guards a choice, not a throne.'}
    ],
    event:{name:'The Gathering of Names',kind:'gathering',text:'Stand within the orrery to return time, voice and names to the sun.',duration:40},
    champion:{id:'nameless-judge',name:'The Nameless Judge',role:'justiciar',health:2010,speed:72,lore:'The first judge to surrender a name now condemns every voice that remembers one.'},
    lieutenant:'reaver',bossKind:'crown',bossHealth:3800,bossSpeed:90,bossSkills:[['crown','crown'],['cross','crown']],
    messages:['Sera: Time and voice are here. Now return the names the Crown stole.','Two archive wings open. Choose the names or the guard who refused the final order.','The rescued keepers gather at the sun engine. Stand with them.','The Memory Reaver is closing the archive. Give the stolen names a future.','The Crown descends. A shared dawn will have no throne.'],
    npcs:[{id:'sera',name:'Sera',title:'Archivist of Unspoken Names',kind:'sun',x:585,y:1580,body:'guide',text:'I remember the names the Choir erased. Free the two archive wings. Our earlier choices will stand beside us at the sun. Below it, Asha is waiting to forge a heart for our dawn.'},{id:'nemi',name:'Nemi',title:'Escaped Archivist',kind:'book',body:'archivist',text:'Keep the light on this archive while I speak their names. The memories will sharpen your ranged light.'},{id:'cael',name:'Cael',title:'The Refusing Guard',kind:'shield',body:'guard',text:'I refused one order too late. Let me walk beside you to the orrery. My shield belongs to the people now.'}]
  },
  {
    id:'foundry',milestones:[30,65,105,150],hardMilestones:[40,90,150,210],hub:{x:2230,y:1280},arena:{x:2850,y:1500},
    routes:[
      {id:'sluices',name:'The Cooling Sluices',verb:'Restore the cooling channels',kind:'repair',reward:'cover',color:'#a1d8d6',sites:[{x:1530,y:610},{x:1750,y:690},{x:1430,y:850}],npc:'rivet',story:'Rivet opens the buried channels. Cool water runs beneath the forge, and the sun-heart can be carried without a chain.'},
      {id:'embers',name:'The Ember Bearer’s Road',verb:'Bring the living ember home',kind:'escort',reward:'forge',color:'#f5ba7b',sites:[{x:1510,y:1870},{x:1760,y:1780},{x:1440,y:1590}],npc:'orin',story:'Orin carries a flame the Choir could not extinguish. The workers gather around it and turn their tools toward tomorrow.'}
    ],
    event:{name:'The Unchained Heart',kind:'convoy',text:'Escort the new sun-heart from the cooling hall to the eastern crucible.',duration:36},
    champion:{id:'ash-marshal',name:'The Ash Marshal',role:'emberguard',health:2280,speed:78,lore:'Once the leader of the furnace rescue crew, the marshal now mistakes every escape for a fire that must be extinguished.'},
    lieutenant:'kilnkeeper',bossKind:'furnace',bossHealth:3700,bossSpeed:84,bossSkills:[['meteor','sweep'],['forge','meteor']],
    messages:['Asha: The Court returned our names. Now we will build something worthy of them.','Open the cooling sluices or rescue the ember bearer. A living heart needs more than fire.','The Ash Marshal has followed the warmth. Break its command and escort the new heart.','The Kilnkeeper is trying to seal the crucible. Break the counterattack.','The Furnace Sovereign leaves its throne. Keep the heart moving and read the falling embers.'],
    npcs:[{id:'asha',name:'Asha',title:'The Unchained Artificer',kind:'clock',x:585,y:1580,body:'guide',text:'Sera sent the names we once forged into chains. We will forge their freedom instead. Rivet knows the channels; Orin carries the last living ember.'},{id:'rivet',name:'Rivet',title:'Keeper of the Cooling Sluices',kind:'bridge',body:'engineer',text:'Protect me while I open these old sluices. The water will cool the sun-heart and reinforce our shelter.'},{id:'orin',name:'Orin',title:'The Ember Bearer',kind:'smith',body:'smith',text:'My family kept this flame alive through every forbidden winter. Walk beside me to the crucible, and we will put it into your blade.'}]
  },
  {
    id:'observatory',milestones:[35,75,115,165],hardMilestones:[45,100,165,225],hub:{x:2240,y:1270},arena:{x:2850,y:940},
    routes:[
      {id:'lenses',name:'The Broken Lens Array',verb:'Align the wandering lenses',kind:'repair',reward:'memory',color:'#b9cef7',sites:[{x:1520,y:600},{x:1770,y:680},{x:1430,y:870}],npc:'eiran',story:'Eiran turns the lenses away from the Choir’s single star. Every rescued name becomes a direction the light can travel.'},
      {id:'horizon',name:'The Horizon Library',verb:'Escort the horizon keeper',kind:'escort',reward:'grove',color:'#dfc1f5',sites:[{x:1530,y:1890},{x:1760,y:1780},{x:1430,y:1590}],npc:'mira',story:'Mira brings a living atlas to the sky engine. Its blank pages welcome roads no ruler has chosen yet.'}
    ],
    event:{name:'The Alignment of Free Stars',kind:'gathering',text:'Stand beside the sky engine while the keepers align time, voice, names and warmth.',duration:34},
    champion:{id:'horizon-eater',name:'The Horizon Eater',role:'voidlancer',health:2540,speed:88,lore:'A star pilot who crossed every known road was ordered to close the ones no ruler could see.'},
    lieutenant:'astromancer',bossKind:'constellation',bossHealth:4200,bossSpeed:92,bossSkills:[['seeker','radial'],['meteor','cross']],
    messages:['Lyra: You brought tomorrow this far. Now give it a sky without a ceiling.','Restore the broken lenses or rescue the horizon keeper. No single road can hold the whole sky.','The Horizon Eater has arrived. Break its lance and gather beneath the sky engine.','The Astromancer is erasing the free stars. Protect the alignment from its counterattack.','The Last Constellation descends. Read its paths, protect one another, and choose an open dawn.'],
    npcs:[{id:'lyra',name:'Lyra',title:'Watcher of the Open Sky',kind:'sun',x:585,y:1580,body:'guide',text:'The Choir drew one ending across every star. Your four gifts can erase that command. Help Eiran or Mira, then bring the keepers to the sky engine.'},{id:'eiran',name:'Eiran',title:'The Lenswright',kind:'book',body:'archivist',text:'Hold this light steady while I align the lenses. Every remembered name deserves a place in the sky.'},{id:'mira',name:'Mira',title:'Keeper of Unwritten Horizons',kind:'seed',body:'keeper',text:'This atlas has room for roads we have not imagined. Protect me on the way to the sky engine, and the shared dawn will keep growing.'}]
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
 {id:'volley',name:'Twin Dawn',family:'Sunshard',text:'A second aimed light shard at 55% power.',max:1},
 {id:'focus',name:'Far Horizon',family:'Sunshard',text:'Automatic fire reaches 90 steps farther.',max:2},
 {id:'tempo',name:'Quickening Light',family:'Sunshard',text:'Fire interval reduced by 12%.',max:2},
 {id:'edge',name:'Golden Edge',family:'Sunblade',text:'Sunblade and Sunbreak power +25%.',max:3},
 {id:'cleave',name:'Open Road',family:'Sunblade',text:'Sword reach +24 and a wider swing.',max:2},
 {id:'flow',name:'Flowing Resolve',family:'Sunblade',text:'Sunblade cooldown −15%; Sunbreak −12%.',max:2},
 {id:'finisher',name:'Dawn’s Answer',family:'Sunblade',text:'Sword attacks deal +40% below half enemy health.',max:1},
 {id:'resolve',name:'Resolve',family:'Dawn',text:'Maximum health +20. Heal 45.',max:3},
 {id:'stride',name:'Windward Step',family:'Dawn',text:'Move 10% faster; dash cooldown −15%.',max:2},
 {id:'ward',name:'Sheltering Light',family:'Dawn',text:'Gain a 22-point shield every 18 seconds.',max:2},
 {id:'mend',name:'Shared Dawn',family:'Dawn',text:'Dawnweaver heals 8 more, 3 seconds sooner.',max:2}
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
