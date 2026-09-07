export type Grade = 1|2|3|4|5|6|7|8;
export type Pitch = { step: 'C'|'D'|'E'|'F'|'G'|'A'|'B'; alter: number; octave: number };
export type Harmony = 'I'|'ii'|'IV'|'V'|'vi'|'V/V';
export type DurationType = 'whole'|'half'|'quarter'|'eighth'|'16th';
export type Note = {
  id: string; tick: number; duration: number; type: DurationType; dots?: number;
  pitches: Pitch[]; tie?: 'start'|'stop'|'continue'; tuplet?: 'start'|'middle'|'stop';
  articulation?: 'staccato'|'accent'|'tenuto'; slur?: 'start'|'stop';
  role: 'melody'|'bass'|'inner'; velocity: number; grace?:Pitch; spread?:boolean;
};
export type Voice = { id: number; staff: 1|2; notes: Note[] };
export type Measure = { number: number; harmony: Harmony; voices: Voice[]; phraseEnd?: boolean;
  dynamic?: 'pp'|'p'|'mp'|'mf'|'f'|'ff'; pedal?: boolean; unaCorda?: boolean;
  clef?: 'treble'|'bass'; octaveShift?: 0|1; tempoFactor?: number;
};
export type Check = { name: string; passed: boolean; detail: string };
export type Exercise = {
  seed: number; grade: Grade; title: string; style: string; key: string; fifths: number;
  mode: 'major'|'minor'; tonic: Pitch; metre: string; tempo: number; phraseStructure: number[];
  motif: number[]; measures: Measure[]; difficulty: { total: number; features: Record<string,number> };
  validation: Check[]; layout: { systems: number[][]; weights: number[]; density: number; complexity: number };
};
export const PPQ = 48;
export const natural = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
export const midi = (p: Pitch) => 12*(p.octave+1)+natural[p.step]+p.alter;
export const barTicks = (metre: string) => { const [n,d]=metre.split('/').map(Number); return n*PPQ*4/d; };
export const mod = (n:number,d:number) => ((n%d)+d)%d;
export const allNotes = (e:Exercise) => e.measures.flatMap(m=>m.voices.flatMap(v=>v.notes));
