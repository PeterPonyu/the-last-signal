// Hollow line-ups per map and campaign stage (0 Free the Hollow … 4 the Warden).
// A group is its formation's slots, then the stage's `adds`; Hard adds one `extra` slot and
// Easy drops one formation slot (never below three). Slot tokens are basic Hollow (walker, pack,
// runner, skirmisher, cantor, sentinel) or the map's own tiers (adept, elite, leader = the three
// roles of JOURNEY[map].roles); 'a|b' picks one with the seeded stream. Before its introduction a
// regional tier stays out of Step 1 groups (its slot becomes a walker).
// `intros` are authored first appearances: once the map's freed count reaches `at` (Normal; scaled to
// Hard's longer milestones), the next group is exactly that line-up. `moments` join the first group
// of a stage, e.g. the escort of the counterattack leader at stage 3.
// `gap` is the pause between groups per stage and `interval` the pause between bodies of one group.
// The formation name 'flank' spawns its bodies on alternating sides.
export const WAVES=[
  {map:'garden',interval:0.42,extra:'walker|pack',
    formations:{
      pursuit:['walker','pack','pack','walker|runner'],
      flank:['skirmisher','runner','skirmisher','runner'],
      support:['walker','cantor','pack','walker'],
      guarded:['sentinel','walker','walker|pack']
    },
    stages:[
      {rotation:['pursuit','support','flank'],adds:[],gap:5.6},
      {rotation:['pursuit','flank','support','guarded'],adds:['adept|adept|elite|leader'],gap:5.0},
      {rotation:['guarded','pursuit','flank','support'],adds:['adept','elite|walker','leader|walker|walker'],gap:4.6},
      {rotation:['support','guarded','pursuit','flank'],adds:['adept','elite|walker'],gap:4.3},
      {rotation:['pursuit','support','flank','guarded'],adds:['adept|walker'],gap:5.4}
    ],
    intros:[{at:6,slots:['adept','adept','walker','walker']},{at:32,slots:['elite','walker','pack','pack']},{at:72,slots:['leader','adept','walker','walker']}],
    moments:{3:['elite','adept']}},
  {map:'causeway',interval:0.4,extra:'walker|pack',
    formations:{
      choir:['cantor','walker','walker','pack'],
      flank:['skirmisher','runner','skirmisher','runner','pack'],
      pursuit:['walker','pack','pack','runner','walker'],
      guarded:['sentinel','walker','walker','pack']
    },
    stages:[
      {rotation:['pursuit','choir','flank'],adds:[],gap:5.3},
      {rotation:['choir','pursuit','guarded','flank'],adds:['adept|walker|elite|leader'],gap:4.9},
      {rotation:['guarded','choir','flank','pursuit'],adds:['adept','elite|walker','leader|walker|walker'],gap:4.5},
      {rotation:['choir','flank','guarded','pursuit'],adds:['adept','elite|walker','walker|pack'],gap:4.2},
      {rotation:['pursuit','choir','flank','guarded'],adds:['adept|walker'],gap:5.4}
    ],
    intros:[{at:6,slots:['adept','adept','walker','walker','pack']},{at:36,slots:['elite','runner','runner','walker']},{at:84,slots:['leader','adept','adept','walker']}],
    moments:{2:['elite','adept'],3:['elite','adept','adept']}},
  {map:'court',interval:0.38,extra:'walker|skirmisher',
    formations:{
      tribunal:['sentinel','walker','cantor','walker'],
      pursuit:['walker','pack','pack','runner','walker'],
      flank:['skirmisher','runner','skirmisher','runner','skirmisher'],
      procession:['walker','walker','sentinel','pack','pack']
    },
    stages:[
      {rotation:['pursuit','tribunal','flank'],adds:['walker|pack'],gap:5.0},
      {rotation:['tribunal','pursuit','flank','procession'],adds:['adept','adept|adept|elite|leader'],gap:4.6},
      {rotation:['procession','tribunal','flank','pursuit'],adds:['adept','elite|adept','leader|walker|walker'],gap:4.3},
      {rotation:['tribunal','flank','procession','pursuit'],adds:['adept','elite','elite|walker'],gap:3.9},
      {rotation:['pursuit','tribunal','flank','procession'],adds:['adept','walker|pack'],gap:5.1}
    ],
    intros:[{at:6,slots:['adept','adept','walker','walker','pack']},{at:38,slots:['elite','elite','walker','walker']},{at:95,slots:['leader','adept','walker','walker','pack']}],
    moments:{2:['elite','adept'],3:['elite','elite','adept']}},
  {map:'foundry',interval:0.36,extra:'runner|pack',
    formations:{
      crew:['runner','walker','runner','walker','pack'],
      flank:['runner','skirmisher','runner','skirmisher','pack'],
      furnace:['sentinel','cantor','walker','runner'],
      pursuit:['pack','pack','pack','walker','runner']
    },
    stages:[
      {rotation:['crew','pursuit','flank'],adds:['adept|walker'],gap:4.8},
      {rotation:['crew','flank','furnace','pursuit'],adds:['adept','adept|adept|elite|leader'],gap:4.4},
      {rotation:['furnace','crew','flank','pursuit'],adds:['runner|pack','adept','elite|adept','leader|adept|adept'],gap:4.0},
      {rotation:['flank','furnace','crew','pursuit'],adds:['adept','elite','elite|runner'],gap:3.7},
      {rotation:['crew','furnace','flank','pursuit'],adds:['adept','runner|pack'],gap:4.9}
    ],
    intros:[{at:5,slots:['adept','adept','runner','walker','walker']},{at:30,slots:['elite','elite','runner','runner']},{at:70,slots:['leader','adept','adept','walker','pack']}],
    moments:{2:['elite','adept'],3:['elite','elite','adept']}},
  {map:'observatory',interval:0.36,extra:'skirmisher|pack',
    formations:{
      constellation:['cantor','skirmisher','cantor','walker','pack'],
      flank:['skirmisher','runner','skirmisher','runner','skirmisher','pack'],
      pursuit:['walker','pack','pack','runner','walker','pack'],
      vigil:['sentinel','walker','cantor','sentinel','walker']
    },
    stages:[
      {rotation:['pursuit','constellation','flank'],adds:['adept|walker'],gap:4.6},
      {rotation:['constellation','pursuit','vigil','flank'],adds:['adept','adept|adept|elite|leader'],gap:4.2},
      {rotation:['vigil','constellation','flank','pursuit'],adds:['walker|pack','adept','elite|adept','leader|adept|adept'],gap:3.8},
      {rotation:['constellation','flank','vigil','pursuit'],adds:['adept','elite','elite|runner'],gap:3.5},
      {rotation:['pursuit','constellation','flank','vigil'],adds:['adept','elite|walker'],gap:4.7}
    ],
    intros:[{at:5,slots:['adept','adept','skirmisher','skirmisher','walker']},{at:35,slots:['elite','elite','skirmisher','runner']},{at:80,slots:['leader','adept','adept','walker','walker']}],
    moments:{2:['elite','adept','adept'],3:['elite','elite','adept','adept']}}
];
// Regional tiers name the map's own roles in JOURNEY order.
export const TIERS=['adept','elite','leader'];
