// Authored story, encounter roles, and destinations shared by play and validation.
export const JOURNEY = [
  {
    npc: {name:'Iria', title:'Keeper of the Hours', x:585,y:1580,kind:'clock',
      before:'The Choir buried my clock’s mainspring in the Root Warden. Free the Hollow, help a keeper and escort the mainspring.',
      after:'The Living Mainspring is yours. Take it east to my brother Oren.'},
    landmark:{kind:'clock',name:'The Clock of Tomorrow',x:600,y:1248},
    exit:{x:3310,y:1780,name:'First Hour Arch',destination:'Echo Causeway'},
    token:'Living Mainspring', nextToken:'Unbound Resonance',
    link:'Time runs again. The mainspring will free the Causeway’s bell.',
    bossLore:'A gardener who held back winter, twisted into stopping all change. He hides the clock’s heart in his bark.',
    bossHint:'Keep moving and turn; spoke gaps are safe. Phase 2: ring and rush.',
    roles:['sower','thornbound','tender']
  },
  {
    npc:{name:'Oren',title:'The Unheard Bellkeeper',x:585,y:1580,kind:'bell',
      before:'The bridges still repeat the Choir’s orders. Help a keeper, escort the bell, then break the Bell Warden.',
      after:'A note without a command. Carry it north to Sera.'},
    landmark:{kind:'bell',name:'The Bell Without an Order',x:1110,y:1280},
    exit:{x:3310,y:650,name:'Open Voice Arch',destination:'Hollow Sun Court'},
    token:'Unbound Resonance',nextToken:'Remembered Names',
    link:'The bell is free. Its note will open the Court’s sun.',
    bossLore:'Once a storm warning, now one endless command: stay where you are.',
    bossHint:'Use gaps in fans and ripples; keep turning. Phase 2: bursts, chasing marks.',
    roles:['chorister','processional','bellsmith']
  },
  {
    npc:{name:'Sera',title:'Archivist of Unspoken Names',x:585,y:1580,kind:'sun',
      before:'I kept our names. Free an archive wing, protect the gathering and bring down the Crown.',
      after:'The names are free. Take our gifts east to Asha.'},
    landmark:{kind:'sun',name:'The Unsealed Orrery',x:1110,y:1550},
    exit:{x:3310,y:1650,name:'Sun Engine Stair',destination:'Emberfoundry'},
    token:'Remembered Names',nextToken:'Unchained Heart',
    link:'The names are back. The Emberfoundry can give them a heart.',
    bossLore:'The Choir’s first promise made flesh: no pain, no change, no choice. It erased its own name first.',
    bossHint:'Step between radial bolts; keep moving and turn. Phase 2: cross, ripples, spokes.',
    roles:['astral','justiciar','reaver']
  },
  {
    npc:{name:'Asha',title:'The Unchained Artificer',x:585,y:1580,kind:'clock',
      before:'Names alone will not warm the city. Help Rivet or Orin, protect the sun-heart, then break the Furnace Sovereign.',
      after:'The sun-heart beats freely. Carry it east to Lyra.'},
    landmark:{kind:'clock',name:'The Turning Crucible',x:1030,y:1300},
    exit:{x:3310,y:1750,name:'First Light Chimney',destination:'Starfall Observatory'},
    token:'Unchained Heart',nextToken:'Shared Dawn',
    link:'The heart is forged. Its warmth can wake the Observatory’s sky engine.',
    bossLore:'The first worker to keep the city warm, made to burn everything but obedience.',
    bossHint:'Leave ember marks; get behind the fan. Phase 2: break the anchor, dodge spokes.',
    roles:['cinder','emberguard','kilnkeeper']
  },
  {
    npc:{name:'Lyra',title:'Sky Watcher',x:585,y:1580,kind:'sun',
      before:'The Choir chained the stars. Help Eiran or Mira, protect the alignment, then face the Last Constellation.',
      after:'Every chain is broken. Release the gifts at the Open Horizon.'},
    landmark:{kind:'sun',name:'The Sky Engine',x:1110,y:1290},
    exit:{x:3310,y:780,name:'The Open Horizon',destination:'A shared dawn'},
    token:'Shared Dawn',nextToken:null,
    link:'Time, voice, names and warmth meet under an open sky. The dawn is shared, never owned.',
    bossLore:'A star map for lost travelers, forced to point to one destination. It mistakes every open future for darkness.',
    bossHint:'Sidestep the triple bolt; use gaps between rays. Phase 2: stars, cross, bursts, ripples.',
    roles:['lenswalker','voidlancer','astromancer']
  }
];

export const ENEMY_ROLES = {
  tender:{name:'Root Tender',tier:'Leader',skin:'cantor',skill:'nurture',health:155,speed:38,radius:25,damage:12,color:'#b6d193',mark:'canopy',lore:'An orchard physician ordered to keep every root alive, even the strangling ones.',hint:'Interrupt its heal with Sunblade.'},
  bellsmith:{name:'The Bellsmith',tier:'Leader',skin:'sentinel',skill:'forge',health:185,speed:43,radius:27,damage:17,color:'#dfb181',mark:'hammer',lore:'A smith who forged safe crossings now hammers one command into every bridge.',hint:'Break its anchor; its ring stops.'},
  reaver:{name:'Memory Reaver',tier:'Leader',skin:'cantor',skill:'afterimage',health:170,speed:67,radius:22,damage:16,color:'#cda9f1',mark:'scythe',lore:'A collector of forgotten names, moving through places its victims just left.',hint:'Keep moving; strike its recovery.'},
  sower:{name:'Thorn Sower',tier:'Adept',skin:'cantor',skill:'rootfall',health:68,speed:37,radius:19,damage:13,color:'#a8cc91',mark:'sprout',
    lore:'Once the Garden’s seed keeper, it now plants borrowed memories underfoot.',hint:'Keep moving after its mark.'},
  thornbound:{name:'Thornbound Custodian',tier:'Elite',skin:'sentinel',skill:'rootline',guarded:true,health:138,speed:31,radius:25,damage:17,color:'#caa66c',mark:'branches',
    lore:'The gardeners’ sworn protectors, now living locks around the stolen mainspring.',hint:'Break its guard; dodge root lines.'},
  chorister:{name:'Glass Chorister',tier:'Adept',skin:'cantor',skill:'fan',health:78,speed:38,radius:19,damage:13,color:'#9edfe1',mark:'chimes',
    lore:'A bridge singer whose harmony was split into three obedient notes.',hint:'Step through gaps in its fan.'},
  processional:{name:'Procession Marshal',tier:'Elite',skin:'sentinel',skill:'resonance',runner:true,health:142,speed:49,radius:24,damage:17,color:'#8baed9',mark:'banner',
    lore:'It once led families across the bridge; now it marches them in circles.',hint:'Sidestep its rush; stand inside rings.'},
  astral:{name:'Eclipse Surveyor',tier:'Adept',skin:'cantor',skill:'radial',health:86,speed:40,radius:20,damage:14,color:'#d6a8e5',mark:'orbit',
    lore:'A royal astronomer ordered to prove no sky existed beyond the Crown.',hint:'Stand between its six rays.'},
  justiciar:{name:'Gilded Justiciar',tier:'Elite',skin:'sentinel',skill:'cross',guarded:true,health:164,speed:34,radius:26,damage:19,color:'#f0c37b',mark:'blades',
    lore:'The Court’s last judge, now sentencing possibilities instead of hearing names.',hint:'Guarded; leave its cross diagonally.'},
  cinder:{name:'Cinder Evoker',tier:'Adept',skin:'cantor',skill:'meteor',health:94,speed:42,radius:20,damage:12,color:'#ffba83',mark:'ember',
    lore:'A furnace tender who rains fire on anyone leaving their station.',hint:'Leave ember marks; interrupt with Sunblade.'},
  emberguard:{name:'Emberguard Vanguard',tier:'Elite',skin:'sentinel',skill:'sweep',guarded:true,runner:true,health:172,speed:47,radius:25,damage:15,color:'#e4ac65',mark:'furnace',
    lore:'The foundry rescue crew, now the first line of a no-escape order.',hint:'Break its guard; sidestep the rush.'},
  kilnkeeper:{name:'The Kilnkeeper',tier:'Leader',skin:'cantor',skill:'forge',health:188,speed:46,radius:26,damage:15,color:'#f8cd88',mark:'crucible',
    lore:'The guardian of the shared flame, now sealing every spark in iron.',hint:'Break its anchor; its ring stops.'},
  lenswalker:{name:'Prismatic Lenswalker',tier:'Adept',skin:'cantor',skill:'seeker',health:100,speed:45,radius:20,damage:15,color:'#a6d8f6',mark:'prism',
    lore:'An apprentice star-polisher who bends every horizon back toward the Choir.',hint:'Sidestep once its wind-up ends.'},
  voidlancer:{name:'Voidlance Pursuer',tier:'Elite',skin:'sentinel',skill:'afterimage',runner:true,health:180,speed:59,radius:24,damage:18,color:'#c2acee',mark:'comet',
    lore:'A guide through the dark between stars, ordered to hunt new paths.',hint:'Dodge the rush, then punish it.'},
  astromancer:{name:'The Unseeing Astromancer',tier:'Leader',skin:'cantor',skill:'radial',health:198,speed:48,radius:24,damage:17,color:'#d7b7f3',mark:'constellation',
    lore:'The Choir’s last astronomer, who erased the sky down to one prediction.',hint:'Stand between its spreading rays.'}
};

export const REMAINS = {hold:18,bossHold:30,fade:4,limit:48};
