// Map rules: every map has one living rule with a hostile phase (the Choir's) and a kind phase
// once the party breaks it at an authored step (`flipStage` is the campaign stage, Step N/5 = stage+1).
// Unit anchors are authored along each map's roads; the engine nudges every unit clear of the map's
// obstacles at run time (`clear` = distance kept outside an obstacle's rim, `avoid` = distance kept
// from spawn, wells, keepers' roads, the gathering and the exit) and drops a unit with no clear ground.
// Speeds and casts are multipliers, mending and burns are per second or per strike before difficulty.
export const RULE_LABELS={hostile:'Against you',kind:'With you'};

export const RULES=[
  {id:'roots',name:'Grasping Roots',icon:'roots',flipStage:2,
    text:{hostile:'Roots slow all, mend Hollow',kind:'Roots mend you, hold Hollow'},
    flip:'The roots turn against the Choir',
    unit:{kind:'patch',radius:80,clear:24,avoid:150,
      anchors:[{x:1380,y:1180},{x:1820,y:1400},{x:2560,y:1170},{x:1150,y:820},{x:1180,y:1760},{x:2050,y:640},{x:2200,y:1900},{x:3000,y:1450},{x:880,y:1120}]},
    hostile:{slow:0.62,bossSlow:0.82,mend:3,mendShare:0.015},
    kind:{slow:0.88,hold:0.3,bossHold:0.72,hero:4,ally:5,keeper:5}},
  {id:'echo',name:'The Echo',icon:'bell',flipStage:3,
    text:{hostile:'Tolls hasten Hollow',kind:'Tolls stagger Hollow · strike bells'},
    flip:'The free bell rings for you',
    unit:{kind:'bell',radius:28,clear:44,avoid:120,
      anchors:[{x:1520,y:1060},{x:1540,y:1500},{x:2420,y:1060},{x:2380,y:1500},{x:2700,y:690},{x:3020,y:1180},{x:1900,y:640},{x:1960,y:1900}]},
    toll:{interval:12,first:6,speed:760,bellReach:760,echoReach:460,strikeCooldown:7,strikeReach:46},
    hostile:{haste:3.5,speed:1.25,bossSpeed:1.1,cast:1.3,bossCast:1.1},
    kind:{stagger:0.7,daze:3,bossCast:0.75,quick:4,speed:1.22}},
  {id:'still',name:'Stillness',icon:'column',flipStage:3,
    text:{hostile:'Columns slow shots, speed casts',kind:'Columns of light empower you'},
    flip:'Remembered names light the columns',
    unit:{kind:'column',radius:92,clear:20,avoid:140,
      anchors:[{x:1500,y:1250},{x:1890,y:1570},{x:2560,y:1210},{x:2650,y:1720},{x:1300,y:860},{x:1300,y:1720},{x:2250,y:800},{x:3050,y:1100}]},
    shots:{hostile:0.45,friendly:0.55},
    hostile:{cast:1.8,bossCast:1.35},
    kind:{guard:0.7,exposed:1.25,empower:1.3}},
  {id:'heat',name:'Furnace Heat',icon:'vent',flipStage:3,
    text:{hostile:'Vents burn everyone',kind:'Vents burn Hollow, warm you'},
    flip:'The furnace answers the new heart',
    unit:{kind:'vent',radius:30,clear:46,avoid:170,
      anchors:[{x:1350,y:1150},{x:1450,y:1450},{x:2000,y:900},{x:1950,y:1700},{x:2550,y:1150},{x:2560,y:1820},{x:3050,y:1250},{x:2400,y:560},{x:1150,y:1850}]},
    vent:{radius:84,warning:1.5,period:11,jitter:4,first:3,reach:820,pending:2,strikeCooldown:6,strikeWarning:0.5,strikeReach:40},
    hostile:{burn:16},
    kind:{burn:70,hero:12,ally:16,keeper:16}},
  {id:'stars',name:'Falling Stars',icon:'star',flipStage:4,
    text:{hostile:'Stars strike everyone',kind:'Stars strike Hollow, leave light'},
    flip:'The freed stars fall on the Hollow',
    unit:{kind:'sky',radius:0,clear:0,avoid:0,anchors:[]},
    star:{radius:74,warning:1.7,first:4,hostileEvery:4.2,kindEvery:2.8,scatter:240,reach:650,cluster:150},
    hostile:{burn:20},
    kind:{burn:80,pool:70,poolLife:6,hero:5,ally:6,keeper:6}}
];

// HUD and canvas icons for the rule chip: 24×24 stroke paths in the SYMBOLS format, coloured by map accent.
export const RULE_ICONS={
  roots:{color:'#b2d988',path:'M12 2 V12 M12 6 Q8 3 5 5 Q8 8 12 8 M12 12 Q7 13 4 18 M12 12 Q17 13 20 18 M12 12 V22 M12 16 Q9 18 8 22 M12 16 Q15 18 16 22'},
  bell:{color:'#8de5e7',path:'M5 16 Q8 14 8 9 A4 4 0 0 1 16 9 Q16 14 19 16 Z M10 19 Q12 21 14 19 M12 3 V5 M2 8 Q1 11 2 14 M22 8 Q23 11 22 14'},
  column:{color:'#d3acff',path:'M6 22 H18 M8 22 V6 M16 22 V6 M5 6 H19 M7 3 H17 M12 9 V19 M10 12 H14'},
  vent:{color:'#ff9f71',path:'M3 21 H21 M5 21 V17 H19 V21 M9 17 V21 M12 17 V21 M15 17 V21 M12 14 Q8 11 11 7 Q12 9 13 5 Q17 10 12 14 Z'},
  star:{color:'#a7cfff',path:'M16 3 L17.6 8.4 L23 10 L17.6 11.6 L16 17 L14.4 11.6 L9 10 L14.4 8.4 Z M2 22 L10 14 M6 22 L9.5 18.5'}
};
