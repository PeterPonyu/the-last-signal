// Original vector rigs. Eight keyed poses are interpolated at render time;
// hit/telegraph deadlines remain authoritative in the numeric simulation.
export const ACTOR_RIGS={
 iria:{kind:'npc',width:100,height:110,palette:['#3e3e35','#857d55','#e9d59c','#e1bfa2']},
 oren:{kind:'npc',width:115,height:115,palette:['#303e44','#66878b','#d4ba77','#c69f82']},
 sera:{kind:'npc',width:100,height:115,palette:['#3b3246','#8d739c','#e7d7a1','#e3b99d']},
 sentinel:{kind:'enemy',width:125,height:130,palette:['#343b3d','#6e776e','#c5b68d','#dfceae']},
 cantor:{kind:'enemy',width:100,height:125,palette:['#2b3c3e','#658080','#b9b893','#b8d2d0']},
 root:{kind:'boss',width:250,height:230,palette:['#473b2a','#8c8051','#d6bf70','#c5e6a1']},
 bell:{kind:'boss',width:220,height:220,palette:['#323b4c','#8b7250','#e5bd7c','#a6e5e1']},
 crown:{kind:'boss',width:250,height:220,palette:['#292238','#8a638d','#f2c579','#dbc0f7']},
 sower:{kind:'enemy',width:100,height:120,palette:['#243b35','#587b60','#b3c67d','#dcdfaf']},
 thornbound:{kind:'enemy',width:136,height:135,palette:['#343626','#776644','#bc9c60','#c7d39c']},
 tender:{kind:'enemy',width:150,height:130,palette:['#293b32','#527e60','#a4c877','#e2e9b5']},
 chorister:{kind:'enemy',width:100,height:125,palette:['#29394b','#56839a','#abd8d9','#e5eecc']},
 processional:{kind:'enemy',width:125,height:135,palette:['#253348','#587397','#d2b074','#e2d6b6']},
 bellsmith:{kind:'enemy',width:155,height:130,palette:['#3c3430','#966e49','#d4a773','#bde4d9']},
 astral:{kind:'enemy',width:130,height:135,palette:['#30243f','#805c92','#c4a4df','#e6d3e9']},
 justiciar:{kind:'enemy',width:135,height:140,palette:['#3b2d38','#9c7155','#ecd18b','#e4b5bb']},
 reaver:{kind:'enemy',width:150,height:140,palette:['#271e38','#66527f','#bca1d8','#eee0f3']},
 skirmisher:{kind:'enemy',width:120,height:105,palette:['#302f38','#6e6874','#bba783','#f1bea3']},
 pack:{kind:'enemy',width:110,height:68,palette:['#2f3030','#696a58','#b9a47a','#edba94']},
 smith:{kind:'npc',width:100,height:105,palette:['#353b39','#87704b','#e7bb75','#edc49c']},
 keeper:{kind:'npc',width:110,height:105,palette:['#2e4035','#6a8957','#e2d89e','#e9bea0']},
 engineer:{kind:'npc',width:110,height:105,palette:['#2c3d49','#677e8b','#ddbd7d','#deb99b']},
 courier:{kind:'npc',width:105,height:105,palette:['#3d3047','#99718a','#e0bd87','#edc4a2']},
 archivist:{kind:'npc',width:110,height:110,palette:['#352e4c','#8e81a1','#dbc9a1','#e9bf9f']},
 guard:{kind:'npc',width:120,height:115,palette:['#353943','#877d72','#e2c482','#d9b394']}
};
export const RIG_CLIPS={idle:{frames:8,duration:2.4},walk:{frames:8,duration:0.8},anticipation:{frames:8,duration:0.9},attack:{frames:8,duration:0.7},recovery:{frames:8,duration:0.65},hurt:{frames:8,duration:0.22},death:{frames:8,duration:0.8}};

export const POSE_KEYS={stride:[0,0.71,1,0.71,0,-0.71,-1,-0.71],rise:[0,0.4,0.72,0.94,1,0.8,0.4,0],fall:[0,0.07,0.18,0.36,0.62,0.85,0.97,1]};
