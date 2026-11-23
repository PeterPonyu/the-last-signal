// Authored story, encounter roles, and destinations shared by play and validation.
export const JOURNEY = [
  {
    npc: {name:'Iria', title:'Keeper of the Hours', x:585,y:1580,kind:'clock',
      before:'I kept this clock running so no one would forget that tomorrow exists. The Choir buried its mainspring inside the Root Warden. Free the Hollow to open the Archive and Orchard roads. Help a keeper, bring the mainspring convoy home, then face the Warden. The eastern arch leads to my brother on the Echo Causeway.',
      after:'The Living Mainspring is yours. Take it through the eastern arch to Oren. His bell once carried the clock’s promise across the city; together, they can wake the Court’s sun.'},
    landmark:{kind:'clock',name:'The Clock of Tomorrow',x:600,y:1248},
    exit:{x:3310,y:1780,name:'Arch of the First Hour',destination:'Echo Causeway'},
    token:'Living Mainspring', nextToken:'Unbound Resonance',
    link:'The Garden makes time possible again. Its mainspring will release the Causeway’s captive bell.',
    bossLore:'The Root Warden was the gardener who held back winter. The Choir twisted his promise to preserve life into a command to stop all change. He carries the clock’s living heart beneath his bark.',
    bossHint:'Rootfall marks the ground. Below half health, he alternates a root procession with a hollow ring: escape outside it or stay in its safe center.',
    roles:['sower','thornbound','tender']
  },
  {
    npc:{name:'Oren',title:'The Unheard Bellkeeper',x:585,y:1580,kind:'bell',
      before:'Iria’s mainspring is turning. I can give the bell a voice again—but the bridges still repeat the Choir’s orders. Help the engineer or escort the courier, protect the moving bell, then break the Bell Warden. Carry the freed resonance through the far arch to Sera in the Court.',
      after:'Listen: a note without a command. The Unbound Resonance will loosen the Crown’s hold. Follow the northern arch to Sera. She remembers the names this city was forced to forget.'},
    landmark:{kind:'bell',name:'The Bell Without an Order',x:1110,y:1280},
    exit:{x:3310,y:650,name:'Arch of the Open Voice',destination:'Hollow Sun Court'},
    token:'Unbound Resonance',nextToken:'Remembered Names',
    link:'The Living Mainspring restores the bell. Its free resonance will open the Court’s sealed sun mechanism.',
    bossLore:'The Bell Warden once warned citizens of approaching storms. Now he broadcasts one endless command: remain where you are. Oren stayed behind to hear the voice beneath the order.',
    bossHint:'Cross the gaps in his fan of bolts or use stone cover. Below half health, alternating resonance rings leave safe centers and lanes.',
    roles:['chorister','processional','bellsmith']
  },
  {
    npc:{name:'Sera',title:'Archivist of Unspoken Names',x:585,y:1580,kind:'sun',
      before:'The clock gave us tomorrow. The bell gave us a voice. I kept our names. Free an archive wing, protect the gathering of names, and bring down the Crown of Stillness. The eastern Sun Engine opens a stair to Asha in the Emberfoundry. She can forge a living heart for the dawn.',
      after:'The Crown has fallen and the names are free. The sun engine still needs a heart. Carry our gifts through the eastern stair to Asha. Her workers have waited too long for a reason to build.'},
    landmark:{kind:'sun',name:'The Unsealed Orrery',x:1110,y:1550},
    exit:{x:3310,y:1650,name:'The Sun Engine Stair',destination:'Emberfoundry'},
    token:'Remembered Names',nextToken:'Unchained Heart',
    link:'Time and voice restore the forgotten names. Beneath the Court, the Emberfoundry can give their promised dawn a living heart.',
    bossLore:'The Crown of Stillness is the Choir’s first promise made flesh: no pain, no change, no choice. It erased its own name before taking everyone else’s. Sera remembers enough to break its final seal.',
    bossHint:'Read the radial bolts and ground mark. Below half health, the Crown alternates a cross-shaped judgement with a ring and radial volley. The marked center is safe only when the warning has a hole.',
    roles:['astral','justiciar','reaver']
  },
  {
    npc:{name:'Asha',title:'The Unchained Artificer',x:585,y:1580,kind:'clock',
      before:'The Court returned our names, but names alone will not warm the city. Help Rivet open the cooling sluices or bring Orin’s ember home. The Ash Marshal will try to stop you. Protect the sun-heart, break the Furnace Sovereign, and carry its warmth to Lyra at the Starfall Observatory.',
      after:'The sun-heart beats freely. Carry it through the eastern chimney gate to Lyra. Time, voice, names and warmth are yours; the stars must learn to let them travel.'},
    landmark:{kind:'clock',name:'The Turning Crucible',x:1030,y:1300},
    exit:{x:3310,y:1750,name:'The Chimney of First Light',destination:'Starfall Observatory'},
    token:'Unchained Heart',nextToken:'Shared Dawn',
    link:'The workers forge a heart from the city’s recovered names. Its living warmth can power the Observatory’s frozen sky engine.',
    bossLore:'The Furnace Sovereign was the first worker to keep the city warm. The Choir made it burn every possibility except obedience. Beneath its armor, the same ember still waits to serve living hands.',
    bossHint:'Falling embers mark three positions before impact. Cross the gaps in the sweeping fan. Below half health, break the forged anchor or stay inside its hollow ring, then leave the meteor marks.',
    roles:['cinder','emberguard','kilnkeeper']
  },
  {
    npc:{name:'Lyra',title:'Watcher of the Open Sky',x:585,y:1580,kind:'sun',
      before:'The Choir chained the stars so no one could imagine another road. Restore Eiran’s lenses or escort Mira’s unwritten atlas. Break the Horizon Eater, protect the alignment, and face the Last Constellation. Then carry every gift to the eastern sky engine and open your hand.',
      after:'Every chain has broken. Take time, voice, names and warmth to the Open Horizon in the east. Release them together. Tomorrow belongs to everyone who dares to take the next step.'},
    landmark:{kind:'sun',name:'The Sky Engine',x:1110,y:1290},
    exit:{x:3310,y:780,name:'The Open Horizon',destination:'A shared dawn'},
    token:'Shared Dawn',nextToken:null,
    link:'The Garden’s time, the Causeway’s voice, the Court’s names and the Foundry’s warmth meet beneath an open sky. The dawn is shared, never owned.',
    bossLore:'The Last Constellation was a map made to guide lost travelers. The Choir forced every star into one destination. It now mistakes any unwritten future for darkness, and descends to erase it.',
    bossHint:'The seeking triple commits to its aim before release; sidestep and read the gaps between radial rays. Below half health, diagonal paths escape the cross while the falling-star marks punish standing still.',
    roles:['lenswalker','voidlancer','astromancer']
  }
];

export const ENEMY_ROLES = {
  tender:{name:'Root Tender',tier:'Keeper',skin:'cantor',skill:'nurture',health:155,speed:38,radius:25,damage:12,color:'#b6d193',mark:'canopy',lore:'The orchard physician was ordered to keep every root alive, even those strangling the city.',hint:'It restores nearby Hollow after a long green wind-up. Interrupt with Sunblade or cut down the tender first.'},
  bellsmith:{name:'The Bellsmith',tier:'Keeper',skin:'sentinel',skill:'forge',health:185,speed:43,radius:27,damage:17,color:'#dfb181',mark:'hammer',lore:'A smith who forged safe crossings now hammers the same command into every bridge.',hint:'Its hammer creates a resonance anchor. Strike the crystal or pulse to cancel its ring; the center also stays safe.'},
  reaver:{name:'Memory Reaver',tier:'Keeper',skin:'cantor',skill:'afterimage',health:170,speed:67,radius:22,damage:16,color:'#cda9f1',mark:'scythe',lore:'A collector of forgotten names, moving through the places its victims just abandoned.',hint:'Three delayed afterimages mark your old path. Keep moving, then punish its exposed recovery.'},
  sower:{name:'Thorn Sower',tier:'Adept',skin:'cantor',skill:'rootfall',health:68,speed:37,radius:19,damage:13,color:'#a8cc91',mark:'sprout',
    lore:'Once the Garden’s seed keeper, it now plants borrowed memories beneath travelers’ feet.',hint:'A single root mark locks onto your old position. Keep moving after it appears.'},
  thornbound:{name:'Thornbound Custodian',tier:'Elite',skin:'sentinel',skill:'rootline',guarded:true,health:138,speed:31,radius:25,damage:17,color:'#caa66c',mark:'branches',
    lore:'The gardeners’ sworn protectors became living locks around the stolen mainspring.',hint:'Break its guard with your blade or pulse. Its three root marks erupt in sequence along a committed line.'},
  chorister:{name:'Glass Chorister',tier:'Adept',skin:'cantor',skill:'fan',health:78,speed:38,radius:19,damage:13,color:'#9edfe1',mark:'chimes',
    lore:'A bridge singer whose harmony was split into three sharp, obedient notes.',hint:'Its three-bolt fan spreads outward. Step across the aim early or use stone cover.'},
  processional:{name:'Procession Marshal',tier:'Elite',skin:'sentinel',skill:'resonance',runner:true,health:142,speed:49,radius:24,damage:17,color:'#8baed9',mark:'banner',
    lore:'It once led stranded families across the bridge. Now it marches them in circles.',hint:'Sidestep the marked rush. The two resonance rings have safe centers; don’t stop on their edges.'},
  astral:{name:'Eclipse Surveyor',tier:'Adept',skin:'cantor',skill:'radial',health:86,speed:40,radius:20,damage:14,color:'#d6a8e5',mark:'orbit',
    lore:'A royal astronomer ordered to prove that no sky existed beyond the Crown.',hint:'Six rays leave gaps between them. Move between rays or break line of sight.'},
  justiciar:{name:'Gilded Justiciar',tier:'Elite',skin:'sentinel',skill:'cross',guarded:true,health:164,speed:34,radius:26,damage:19,color:'#f0c37b',mark:'blades',
    lore:'The Court’s last judge stopped hearing names and began sentencing possibilities.',hint:'Leave the cross of five warning circles diagonally. Melee, Sunbreak, and pulse break its guard.'},
  cinder:{name:'Cinder Evoker',tier:'Adept',skin:'cantor',skill:'meteor',health:94,speed:42,radius:20,damage:12,color:'#ffba83',mark:'ember',
    lore:'A furnace tender who once watched over the workers now calls burning fragments onto anyone who leaves their assigned station.',hint:'Three ember marks fall in a committed sequence. Keep a clear route out of the circles; interrupt the cast with your blade.'},
  emberguard:{name:'Emberguard Vanguard',tier:'Elite',skin:'sentinel',skill:'sweep',guarded:true,runner:true,health:172,speed:47,radius:25,damage:15,color:'#e4ac65',mark:'furnace',
    lore:'The foundry’s rescue crew became the first line of a command that allowed no worker to leave.',hint:'Its shield resists ranged light. Break the guard with Sunblade or pulse, sidestep its rush, and cross behind the sweeping volley.'},
  kilnkeeper:{name:'The Kilnkeeper',tier:'Keeper',skin:'cantor',skill:'forge',health:188,speed:46,radius:26,damage:15,color:'#f8cd88',mark:'crucible',
    lore:'The keeper of the communal flame now seals every spark inside obedient iron.',hint:'Destroy its forged anchor to cancel the expanding ring. The ring has a safe center while your team breaks the crystal.'},
  lenswalker:{name:'Prismatic Lenswalker',tier:'Adept',skin:'cantor',skill:'seeker',health:100,speed:45,radius:20,damage:15,color:'#a6d8f6',mark:'prism',
    lore:'An apprentice who polished the stars now bends every horizon back toward the Choir.',hint:'Its three bright bolts commit to one aim. Step sideways after the wind-up, or put a pillar between you and the lens.'},
  voidlancer:{name:'Voidlance Pursuer',tier:'Elite',skin:'sentinel',skill:'afterimage',runner:true,health:180,speed:59,radius:24,damage:18,color:'#c2acee',mark:'comet',
    lore:'A guide who once crossed the dark between stars was ordered to hunt anyone searching for a new way through it.',hint:'Dodge the committed lance rush and keep moving past its delayed afterimages. Its recovery is your opening.'},
  astromancer:{name:'The Unseeing Astromancer',tier:'Keeper',skin:'cantor',skill:'radial',health:198,speed:48,radius:24,damage:17,color:'#d7b7f3',mark:'constellation',
    lore:'The Choir’s last astronomer erased the changing sky until only a single prediction remained.',hint:'Read the spokes before they spread. Cross between rays or interrupt its cast while the horizon stays open.'}
};

export const REMAINS = {hold:18,bossHold:30,fade:4,limit:48};
