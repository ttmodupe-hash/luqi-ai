import { useState } from 'react';
import { Link } from 'react-router';

/** Finite quadratic model with a numerically stable real-root calculation. */
export function quadraticModel(a: number, b: number, c: number) {
  if ([a,b,c].some(v => !Number.isFinite(v) || Math.abs(v) > 1e6) || Math.abs(a) < 1e-8) {
    throw new RangeError('Use finite coefficients no larger than 1,000,000 in magnitude, with |a| at least 0.00000001.');
  }
  const discriminant = b*b - 4*a*c;
  const x = -b/(2*a), y = a*x*x + b*x + c;
  let roots: number[] = [];
  if (discriminant === 0) roots = [x];
  else if (discriminant > 0) {
    const q = -.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(discriminant));
    roots = [q/a, c/q].sort((left,right) => left-right);
  }
  return { discriminant, roots, vertex: { x, y }, direction: a > 0 ? 'minimum' : 'maximum', derivative: `f'(x) = ${2*a}x + (${b})` };
}
export default function AcademyMathLab() {
  const [inputs,setInputs] = useState(['1','-5','6']);
  const [result,setResult] = useState<ReturnType<typeof quadraticModel>|null>(null);
  const [error,setError] = useState('');
  return <section className="academy-card"><h3>Maths practical: quadratic functions</h3>
    <p>For f(x) = ax² + bx + c, predict how the graph opens, its turning point and its real roots before calculating. These are approximate numerical results, not a complete symbolic algebra system.</p>
    <p><strong>Worked example:</strong> x² − 5x + 6 = (x − 2)(x − 3). The roots are 2 and 3, and the minimum is at (2.5, −0.25). Its derivative is 2x − 5.</p>
    <form onSubmit={e=>{e.preventDefault();setResult(null);setError('');try{if(inputs.some(v=>!v.trim()))throw new Error('Complete all three coefficients.');setResult(quadraticModel(Number(inputs[0]),Number(inputs[1]),Number(inputs[2])));}catch(e){setError(e instanceof Error?e.message:'Check the coefficients.');}}}>
      <div className="academy-fields">{['a','b','c'].map((name,i)=><label key={name}>Coefficient {name}<input inputMode="decimal" maxLength={30} value={inputs[i]} onChange={e=>{setInputs(old=>old.map((v,j)=>i===j?e.target.value:v));setResult(null);setError('');}}/></label>)}</div>
      <button type="submit">Analyse quadratic</button>
    </form>{error&&<p role="alert">{error}</p>}{result&&<div aria-live="polite"><p>Discriminant: {result.discriminant}. {result.roots.length ? `Real roots: ${result.roots.join(', ')}.` : 'No real roots; the discriminant is negative.'}</p><p>Turning point: ({result.vertex.x}, {result.vertex.y}), a {result.direction}. {result.derivative}</p><p>Check each root by substituting it into the original expression; the residual should be approximately zero.</p></div>}
    <h4>Hands-on investigation</h4><ol><li>Change c while holding a and b fixed. Predict which feature of the graph moves.</li><li>Use a = 1, b = 2, c = 1 to investigate a repeated root.</li><li>Use a = 1, b = 0, c = 1 and explain why there are no real roots.</li><li>Plot at least five points in the algebra lab, then explain how the derivative relates to the turning point.</li></ol>
    <div className="academy-actions"><Link to="/algebra-lab">Open existing algebra lab</Link><Link to="/geometry-lab">Open existing geometry lab</Link></div>
    <p className="academy-small">This activity adds Maths practice alongside Physical Sciences. It does not cover the full CAPS syllabus.</p>
  </section>;
}
