// Simplified Chinese for the world feature, keyed by exact English source text (same shape as zh.mjs).
// Merged by src/i18n/index.mjs; owned by the world worker.
// Glossary: map rule 地图法则, Against you 对你不利, With you 对你有利, gift 馈赠, Hollow 空壳者,
// free 解放, Sunblade 日刃, Sunshard 日晶, bell 钟, vent 喷口, column 光柱.
export const ZH={
  // Map rules: names, HUD states, effect lines and the turn banners (content/environment.mjs)
  'Grasping Roots':'缠根',
  'The Echo':'回响',
  'Stillness':'静止',
  'Furnace Heat':'熔炉热浪',
  'Falling Stars':'坠星',
  'Against you':'对你不利',
  'With you':'对你有利',
  'Roots slow all, mend Hollow':'根须拖慢众人，治愈空壳者',
  'Roots mend you, hold Hollow':'根须治愈你，缠住空壳者',
  'Tolls hasten Hollow':'钟鸣令空壳者加速',
  'Tolls stagger Hollow · strike bells':'钟鸣震慑空壳者 · 敲钟',
  'Columns slow shots, speed casts':'光柱减缓弹道，加快施法',
  'Columns of light empower you':'光柱为你增强力量',
  'Vents burn everyone':'喷口灼烧所有人',
  'Vents burn Hollow, warm you':'喷口灼烧空壳者，温暖你',
  'Stars strike everyone':'坠星击中所有人',
  'Stars strike Hollow, leave light':'坠星击中空壳者，留下光芒',
  'The roots turn against the Choir':'根须转而对抗圣咏团',
  'The free bell rings for you':'自由之钟为你而鸣',
  'Remembered names light the columns':'被铭记的名字点亮光柱',
  'The furnace answers the new heart':'熔炉回应新的心脏',
  'The freed stars fall on the Hollow':'自由的星辰坠向空壳者',
  // Canvas captions (src/render/environment-vfx.mjs)
  'Strike the bell':'敲钟',
  'Strike the vent':'击打喷口',
  // Enemy gifts: name prefixes and hints (content/affixes.mjs)
  'Thorned':'荆棘',
  'Rooted':'扎根',
  'Echoing':'回声',
  'Hastened':'疾行',
  'Nameless':'无名',
  'Judged':'受审',
  'Molten':'熔火',
  'Forged':'铁铸',
  'Starbound':'星缚',
  'Eclipsed':'蚀影',
  'Stalwart':'坚韧',
  'Frenzied':'狂怒',
  'Splitting':'分裂',
  'Bursts into thorns when freed':'被解放时迸出荆棘',
  'Resists shards; dig it out':'抵御日晶；用日刃斩除',
  'Repeats each spell as a mark':'每次施法都留下回声印记',
  'Moves and strikes faster':'移动与攻击更快',
  'Fades, then appears beside you':'隐去后出现在你身旁',
  'Returns a bolt for shards':'被日晶击中时反射光弹',
  'Drips slag that erupts':'滴落会爆发的熔渣',
  'Iron guard; break with blades':'铁甲护体；用日刃击破',
  'Calls small stars on you':'召唤小星坠向你',
  'Shields nearby Hollow; free it first':'庇护周围空壳者；先解放它',
  'Larger and much tougher':'体型更大，更加坚韧',
  'Rages when badly hurt':'重伤时陷入狂怒',
  'Splits in two when freed':'被解放时一分为二'
};
export const ZH_PATTERNS=[
  // Gifted Hollow: "<gift> <name>" (src/game/affixes.mjs affixTitle); both parts translate on their own.
  [/^(Thorned|Rooted|Echoing|Hastened|Nameless|Judged|Molten|Forged|Starbound|Eclipsed|Stalwart|Frenzied|Splitting) (.+)$/,'$1·$2']
];
