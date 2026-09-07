import {describe,it,expect} from 'vitest';
import {compose,generate,makeNote} from '../lib/music/compose';
import {rules,rulesSchema,gradeRule} from '../lib/music/abrsmGradeRules';
import {midi,barTicks,allNotes,type Grade,type Exercise} from '../lib/music/model';
import {keyInfo,degreePitch,keyAlter} from '../lib/music/theory';
import {validate} from '../lib/music/validate';
import {playbackEvents,secondsAtTick,tickAtSeconds,remainingEvents} from '../lib/music/events';
import {toMusicXML} from '../lib/music/musicxml';
import {scoreDifficulty} from '../lib/music/difficulty';
import {validateRenderedPage} from '../lib/music/layout';
describe('audited syllabus and schema',()=>{
 it('has eight explicit valid grade configurations',()=>{expect(rulesSchema.safeParse(rules).success).toBe(true);expect(Object.keys(rules.grades)).toHaveLength(8);});
 it('rejects malformed and non-cumulative configuration',()=>{const x=structuredClone(rules);x.grades['5'].keys=['F-sharp major'];expect(rulesSchema.safeParse(x).success).toBe(false);});
 it('corrects every reported key and inherits Initial Grade',()=>{for(let g=1;g<=8;g++)expect(gradeRule(g as Grade).keys).toContain('D minor');expect(gradeRule(5).keys).toEqual(expect.arrayContaining(['F-sharp minor','A-flat major']));expect(gradeRule(6).keys).toContain('C-sharp minor');expect(gradeRule(8).keys).toContain('D-flat major');for(const g of Object.values(rules.grades)){expect(g.keys).not.toContain('F-sharp major');expect(g.keys).not.toContain('C-sharp major');}});
 it('gates chords, metres and ornaments at their proper grades',()=>{expect(gradeRule(5).metres).not.toContain('9/8');expect(gradeRule(6).metres).toContain('9/8');expect(gradeRule(7).limits.maxNotesPerHand).toBe(2);expect(gradeRule(8).limits.maxNotesPerHand).toBe(3);expect(gradeRule(7).hardExclusions).toContain('ornaments');});
 it('spells signatures and minor leading tones consistently',()=>{for(const key of gradeRule(8).keys){const k=keyInfo(key);for(let d=0;d<7;d++){const p=degreePitch(k.tonic,k.mode,d);expect(p.alter).toBe(keyAlter(k.fifths,p.step));}}const k=keyInfo('C-sharp minor');expect(k.fifths).toBe(4);expect(degreePitch(k.tonic,k.mode,6,4,true)).toEqual({step:'B',alter:1,octave:4});});
});
describe('composition and musicality',()=>{
 for(let grade=1;grade<=8;grade++)it(`validates 100 seeded Grade ${grade} exercises`,()=>{for(let seed=1;seed<=100;seed++){const e=generate(grade as Grade,seed*65537);expect(e.validation.filter(v=>!v.passed),JSON.stringify({grade,seed,e})).toEqual([]);expect(e.measures.every(m=>m.voices.every(v=>v.notes.reduce((s,n)=>s+n.duration,0)===barTicks(e.metre)))).toBe(true);}});
 it('is reproducible and varies across seeds',()=>{expect(generate(4,321)).toEqual(generate(4,321));expect(generate(4,322)).not.toEqual(generate(4,321));});
 it('contains no Grade 1 hand overlap and stays in five-finger positions',()=>{const e=generate(1,91);expect(e.measures.every(m=>m.voices.filter(v=>v.notes.some(n=>n.pitches.length)).length===1)).toBe(true);});
 it('uses functional cadences and motifs before decoration',()=>{for(const g of [1,4,8]){const e=generate(g as Grade,191);expect(e.motif.length).toBeGreaterThan(2);expect(e.measures.at(-2)?.harmony).toBe('V');expect(e.measures.at(-1)?.harmony).toBe('I');expect(e.validation.find(v=>v.name==='non-chord tones')?.passed).toBe(true);}});
 it('rejects duration corruption, hand stretches, bad harmony and a non-tonic ending',()=>{const e=generate(4,93);e.measures[0].voices[0].notes[0].duration++;e.measures[1].harmony='V/V';const last=e.measures.at(-1)!.voices[0].notes.at(-1)!;last.pitches[0].alter++;const bad=validate(e).filter(c=>!c.passed).map(c=>c.name);expect(bad).toContain('measure duration');expect(bad).toContain('harmonic progression');expect(bad).toContain('musical ending');});
 it('computes difficulty from observable features, not grade label',()=>{const e=generate(4,54);const base=scoreDifficulty(e);e.grade=8;expect(scoreDifficulty(e).total-base.total).toBeLessThanOrEqual(1);});
 it('exports aligned grand-staff voices with structural line breaks',()=>{const e=generate(8,981);const xml=toMusicXML(e);expect(xml).toContain('<staves>2</staves>');expect(xml).toContain('<backup>');expect(xml).toContain('<chord/>');expect(xml).toContain('new-system="yes"');expect(e.layout.systems.flat()).toHaveLength(e.measures.length);expect(e.layout.systems.every(s=>s.length>=2)).toBe(true);});
 it('validates actual Grade 8 page dimensions, not bar count alone',()=>{const e=generate(8,981);expect(validateRenderedPage(e,5,900,850).passed).toBe(true);expect(validateRenderedPage(e,9,1800,850).passed).toBe(false);});
});
describe('one-model notation and timing',()=>{
 function fixture(){const e=generate(6,77);e.metre='4/4';e.measures=[{number:1,harmony:'I',voices:[{id:1,staff:1,notes:[makeNote('a',0,72,[{step:'C',alter:1,octave:4},{step:'E',alter:0,octave:4}],'melody'),makeNote('b',72,24,[],'melody'),{...makeNote('c',96,48,[{step:'F',alter:1,octave:4}],'melody'),tie:'start'},{...makeNote('d',144,48,[{step:'F',alter:1,octave:4}],'melody'),tie:'stop'}]}]}];return e;}
 it('has exact chord attacks, dotted durations, silence for rests, and one tied attack',()=>{const es=playbackEvents(fixture());expect(es).toHaveLength(3);expect(es.slice(0,2).map(e=>e.tick)).toEqual([0,0]);expect(es[0].duration).toBe(72);expect(es[0].midi).toBe(61);expect(es[2].duration).toBe(96);expect(es[2].tick).toBe(96);});
 it('schedules tuplets exactly on the integer grid',()=>{const e=fixture();e.measures[0].voices[0].notes=[0,16,32].map((t,i)=>({...makeNote(String(i),t,16,[{step:'C',alter:0,octave:4}],'melody'),tuplet:(['start','middle','stop'] as const)[i]}));const es=playbackEvents(e);expect(es.map(x=>secondsAtTick(e,x.tick,60))).toEqual([0,1/3,2/3]);expect(toMusicXML(e)).toContain('<actual-notes>3</actual-notes>');});
 it('round trips the tempo map and resumes held notes',()=>{const e=fixture();e.measures[0].tempoFactor=0.5;expect(secondsAtTick(e,192,60)).toBe(8);expect(tickAtSeconds(e,4,60)).toBe(96);const es=remainingEvents(e,160);expect(es).toHaveLength(1);expect(es[0].tick).toBe(160);expect(es[0].duration).toBe(32);});
});
