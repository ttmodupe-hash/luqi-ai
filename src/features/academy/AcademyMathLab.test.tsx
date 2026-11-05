// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AcademyMathLab, { quadraticModel } from './AcademyMathLab';
afterEach(cleanup);
describe('quadratic maths practical',()=>{
  it('finds roots, vertex and derivative for a reference polynomial',()=>{expect(quadraticModel(1,-5,6)).toEqual({discriminant:1,roots:[2,3],vertex:{x:2.5,y:-.25},direction:'minimum',derivative:"f'(x) = 2x + (-5)"});});
  it('handles repeated, absent and zero real roots',()=>{expect(quadraticModel(1,2,1).roots).toEqual([-1]);expect(quadraticModel(1,0,1).roots).toEqual([]);expect(quadraticModel(1,-2,0).roots).toEqual([0,2]);expect(quadraticModel(-1,0,1).direction).toBe('maximum');});
  it('rejects invalid and non-quadratic coefficients',()=>{for(const a of [0,NaN,Infinity,1e20,1e-12])expect(()=>quadraticModel(a,2,3)).toThrow();});
  it('checks residuals for multiple independent reference roots',()=>{for(const [r1,r2] of [[-10,4],[2,3],[-.5,8],[0,2],[10,10]]){const a=2,b=-2*(r1+r2),c=2*r1*r2;const result=quadraticModel(a,b,c);for(const root of result.roots)expect(a*root*root+b*root+c).toBeCloseTo(0,8);}});
  it('supports interactive changes and invalid input feedback',()=>{render(<MemoryRouter><AcademyMathLab/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Analyse quadratic'}));expect(screen.getByText(/Real roots: 2, 3/)).toBeTruthy();fireEvent.change(screen.getByLabelText('Coefficient a'),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'Analyse quadratic'}));expect(screen.getByRole('alert').textContent).toContain('finite coefficients');});
});
