'use strict';
// All courier checks, deliveries and ratings here are explicitly test simulations.
const BCDomain=(()=>{
 const checkIds=['contact','identity','vehicle','references','safety'];
 function approve(checks,ack){if(!ack||!checkIds.every(k=>checks[k]===true))throw new Error('incompleteChecks');return 'approved-demo';}
 function transition(job,action,receipt=false,approved=false){if(!job?.simulation)throw new Error('simulationOnly');if(action==='accept'&&!approved)throw new Error('checksRequired');const states={draft:['accept','accepted'],accepted:['pickup','collected'],collected:['complete','delivered']};const next=states[job.status];if(!next||next[0]!==action)throw new Error('invalidTransition');if(action==='complete'&&!receipt)throw new Error('receiptRequired');return {...job,status:next[1],receiptConfirmed:action==='complete'?true:!!job.receiptConfirmed};}
 function rate(job,scores){if(!job?.simulation||job.status!=='delivered'||!job.receiptConfirmed)throw new Error('notEligible');if(job.rating)throw new Error('alreadyRated');if(scores.length!==3||scores.some(n=>!Number.isInteger(n)||n<1||n>5))throw new Error('invalidRating');return {...job,rating:{scores:[...scores],status:'visible-demo'}};}
 function rating(jobs,courierId){const rows=[...new Map(jobs.filter(j=>j.courierId===courierId&&j.simulation&&j.status==='delivered'&&j.receiptConfirmed&&j.rating?.status==='visible-demo'&&Array.isArray(j.rating.scores)&&j.rating.scores.length===3&&j.rating.scores.every(n=>Number.isInteger(n)&&n>=1&&n<=5)).map(j=>[j.id,j])).values()];return {count:rows.length,average:rows.length?Math.round(rows.reduce((n,j)=>n+j.rating.scores.reduce((a,b)=>a+b,0)/3,0)/rows.length*10)/10:null,held:jobs.filter(j=>j.courierId===courierId&&j.rating?.status==='held-demo').length};}
 return {checkIds,approve,transition,rate,rating};
})();
if(typeof module!=='undefined')module.exports=BCDomain;
