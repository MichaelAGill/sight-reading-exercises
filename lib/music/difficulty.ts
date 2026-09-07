import { type Exercise, allNotes, midi, PPQ } from './model';
import { keyAlter } from './theory';
import { gradeRule } from './abrsmGradeRules';
// Density features use counts PER BAR, so longer exercises do not inflate every term.
// Binary features are presence costs. No score depends on a student's performance.
export function scoreDifficulty(e:Exercise) {
 const notes=allNotes(e), pitched=notes.filter(n=>n.pitches.length),bars=e.measures.length;
 const perBar=(f:(n:typeof notes[number])=>boolean)=>notes.filter(f).length/bars;
 const melodic=pitched.filter(n=>n.role==='melody');let leaps=0,movement=0;
 for(let i=1;i<melodic.length;i++){const d=Math.abs(midi(melodic[i].pitches.at(-1)!)-midi(melodic[i-1].pitches.at(-1)!));if(d>2)leaps++;if(d>5)movement++;}
 const maxVoices=Math.max(...e.measures.map(m=>m.voices.filter(v=>v.notes.some(n=>n.pitches.length)).length));
 const f:Record<string,number>={
  length:bars*0.35,keySignature:Math.abs(e.fifths)*0.75,newKey:gradeRule(e.grade).introducedKeys.includes(e.key)?1:0,
  accidentals:pitched.reduce((s,n)=>s+n.pitches.filter(p=>p.alter!==keyAlter(e.fifths,p.step)).length,0)/bars*2,
  rhythmicIrregularity:perBar(n=>n.duration<PPQ)*1.1,dotted:perBar(n=>!!n.dots)*1.2,ties:perBar(n=>n.tie==='start')*2,
  syncopation:perBar(n=>n.tick%PPQ!==0&&n.duration>=PPQ&&!n.tuplet)*2.5,triplets:perBar(n=>n.tuplet==='start')*3,
  irregularMetre:/^(5|7)\//.test(e.metre)?4:0,compoundMetre:/^(6|9|12)\/8/.test(e.metre)?2:0,
  handMovement:movement/bars*1.5,melodicLeaps:leaps/bars*0.7,chords:perBar(n=>n.pitches.length>1)*1.3,
  independentVoices:Math.max(0,maxVoices-1)*3,clefChanges:e.measures.filter(m=>m.clef).length*1.5,
  registerChanges:e.measures.filter(m=>m.octaveShift===1).length*1.5,
  articulation:perBar(n=>!!n.articulation)*0.4,dynamics:e.measures.filter(m=>m.dynamic).length*0.4,
  pedalling:e.measures.some(m=>m.pedal)?2:0,unaCorda:e.measures.some(m=>m.unaCorda)?1:0,
  ornaments:notes.filter(n=>n.grace).length*2,spreadChords:notes.filter(n=>n.spread).length*1.5,tempoChanges:e.measures.filter(m=>m.tempoFactor&&m.tempoFactor!==1).length*1.2,
 };
 return {total:Math.round(Object.values(f).reduce((a,b)=>a+b,0)*10)/10,features:Object.fromEntries(Object.entries(f).map(([k,v])=>[k,Math.round(v*100)/100]))};
}
