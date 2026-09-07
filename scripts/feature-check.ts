import {generate,compose,type ComposeOptions} from '../lib/music/compose';
import {type Grade} from '../lib/music/model';
const fixtures:[Grade,ComposeOptions][]=[[4,{key:'G minor',metre:'4/4',feature:'chromatic'}],[6,{key:'B minor',metre:'4/4',feature:'clef'}],[7,{key:'G major',metre:'4/4',feature:'octave'}],[8,{key:'D-flat major',metre:'4/4',feature:'triplets'}],[8,{key:'C-sharp minor',metre:'4/4',feature:'ornament'}],[8,{key:'B major',metre:'4/4',feature:'spread'}]];
for(const [g,options] of fixtures){try{const e=generate(g,10,options);console.log(JSON.stringify({g,options,seed:e.seed,score:e.difficulty.total}));}catch{const e=compose(g,10,options);console.log(JSON.stringify({g,options,failed:e.validation.filter(v=>!v.passed)}));}}
