import { describe, it, expect } from 'vitest';
import { calculateScenario } from '../src/lib/trade-scenario';

describe('AfCFTA offline illustrative scenario', () => {
  it('requires both user-provided rates rather than invented defaults', () => {
    expect(() => calculateScenario({declaredUsd:'65000',standardRate:'',comparisonRate:''}))
      .toThrow('INVALID_DUTY_SCENARIO');
  });
  it('computes accurate USD cents with explicitly hypothetical rates', () => {
    expect(calculateScenario({declaredUsd:'65000.00',standardRate:'15',comparisonRate:'2.5'}))
      .toEqual({
        declaredUsd:'65,000.00', standardRate:'15.00', comparisonRate:'2.50',
        standardDutyUsd:'9,750.00',comparisonDutyUsd:'1,625.00',
        differenceUsd:'8,125.00',direction:'lower'
      });
  });
  it('rounds precisely and handles costs increasing instead of claiming savings', () => {
    expect(calculateScenario({declaredUsd:'0.01',standardRate:'50',comparisonRate:'0'}))
      .toMatchObject({standardDutyUsd:'0.01',differenceUsd:'0.01'});
    expect(calculateScenario({declaredUsd:'100',standardRate:'4',comparisonRate:'5'}))
      .toMatchObject({direction:'higher',differenceUsd:'1.00'});
    expect(calculateScenario({declaredUsd:'100',standardRate:'5',comparisonRate:'5'}))
      .toMatchObject({direction:'equal',differenceUsd:'0.00'});
  });
  it.each([
    ['0','5','2'],['-1','5','2'],['1e4','5','2'],['100000000','5','2'],
    ['1.234','5','2'],['100','101','2'],['100','10','100.01'],
    ['100','-1','2'],['100','2.345','2'],['100','2','']
  ])('rejects unsourced or malformed input %s %s %s',(declaredUsd,standardRate,comparisonRate)=>{
    expect(()=>calculateScenario({declaredUsd,standardRate,comparisonRate})).toThrow();
  });
  it('supports exact large calculations without floating-point overflow',()=>{
    const value=calculateScenario({declaredUsd:'99999999.99',standardRate:'99.99',comparisonRate:'99.98'});
    expect(value.declaredUsd).toBe('99,999,999.99');
    expect(value.direction).toBe('lower');
  });
});
