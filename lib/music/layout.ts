import { type Exercise } from './model';
// Estimate intrinsic measure complexity only. OSMD performs all note/tick spacing.
export function planLayout(e:Exercise) {
 const weights=e.measures.map(m=>{const ns=m.voices.flatMap(v=>v.notes);const ticks=new Set(ns.map(n=>n.tick)).size;return 5+ticks*1.8+ns.reduce((s,n)=>s+n.pitches.length*0.65+(n.dots?0.6:0)+(n.tie?0.8:0)+(n.tuplet?0.3:0)+n.pitches.filter(p=>p.alter).length*0.45,0)+(m.voices.length>2?3:0)+(m.clef?4:0);});
 const n=e.measures.length;const systemCount=e.grade===8?Math.max(4,Math.min(6,Math.ceil(n/4))):Math.ceil(n/(e.grade<=2?3:4));
 const systems:number[][]=[];let at=0;for(let s=0;s<systemCount;s++){const count=Math.ceil((n-at)/(systemCount-s));systems.push(Array.from({length:count},()=>at++));}
 const density=e.measures.reduce((s,m)=>s+new Set(m.voices.flatMap(v=>v.notes.map(n=>n.tick))).size,0)/n;
 const complexity=e.measures.reduce((s,m)=>s+m.voices.flatMap(v=>v.notes).filter(n=>n.dots||n.tie||n.tuplet||n.pitches.length>1||n.duration<=12||n.grace||n.spread).length,0)/n;
 return {systems,weights,density,complexity};
}
export function validateRenderedPage(e:Exercise,systems:number,height:number,width:number) {const pageHeight=width*1.414;const fill=(height+130)/pageHeight;return {name:'rendered page',passed:e.grade!==8||(systems>=4&&systems<=6&&fill>=0.55&&fill<=0.98),detail:`${systems} engraved systems; ${(fill*100).toFixed(0)}% of reference A4 page; ${width} px width`};}
