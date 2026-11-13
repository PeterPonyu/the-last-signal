import { DIFFICULTIES } from '../../content/game.mjs';
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function validResult(record){
  return !!record&&record.version===1&&Object.hasOwn(DIFFICULTIES,record.difficulty)&&typeof record.won==='boolean'&&Number.isInteger(record.seed)&&record.seed>=0&&record.seed<=4294967295&&finite(record.seconds)&&Number.isInteger(record.kills)&&record.kills>=0&&Number.isInteger(record.areas)&&record.areas>=0&&record.areas<=3&&(!record.won||record.areas===3)&&record.stats&&['hitsTaken','damageTaken','coverBlocks','allyKills','meleeKills','guardBreaks','shieldBlocked','solKills'].every(k=>finite(record.stats[k]));
}
export function saveResult(storage,record){
  if(!validResult(record))return false;
  try{storage.setItem('last-signal-run-'+record.difficulty,JSON.stringify(record));return true;}catch{return false;}
}
export function readResults(storage){
  const records=[];
  for(const difficulty of Object.keys(DIFFICULTIES))try{const record=JSON.parse(storage.getItem('last-signal-run-'+difficulty));if(validResult(record)&&record.difficulty===difficulty)records.push(record);}catch{}
  return records;
}
