import {describe,it,expect} from 'vitest';
import{evaluateP2PTestCohort}from '../scripts/p2p-operator-audit';
describe('read-only P2P test-cohort operator gate',()=>{
 it('requires actual active moderator role and at least two paired candidates',()=>{
  expect(evaluateP2PTestCohort([])).toEqual({moderatorPresent:false,mutualTestPairPresent:false});
  expect(evaluateP2PTestCohort([{role:'p2p_adult',n:2000}]))
    .toEqual({moderatorPresent:false,mutualTestPairPresent:true});
  expect(evaluateP2PTestCohort([{role:'p2p_moderator',n:1},{role:'p2p_adult',n:1}]))
    .toEqual({moderatorPresent:true,mutualTestPairPresent:true});
 });
 it('student pairs are cohort-isolated: two different schools cannot be mixed',()=>{
  expect(evaluateP2PTestCohort([{role:'p2p_moderator',n:1},{role:'p2p_student:school-a',n:1},{role:'p2p_student:school-b',n:1}]))
    .toEqual({moderatorPresent:true,mutualTestPairPresent:false});
  expect(evaluateP2PTestCohort([{role:'p2p_moderator',n:1},{role:'p2p_student:school-a',n:2}]))
    .toEqual({moderatorPresent:true,mutualTestPairPresent:true});
 });
 it('ignores unrelated/unverified roles and negative or malformed aggregate counts',()=>{
  expect(evaluateP2PTestCohort([{role:'user',n:900},{role:'p2p_student:invalid !',n:10},{role:'p2p_moderator',n:-1}]))
    .toEqual({moderatorPresent:false,mutualTestPairPresent:false});
 });
});
