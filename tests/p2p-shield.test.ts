import {it,expect} from 'vitest';
import {inspectForPredatoryScams as inspect} from '../src/lib/p2p-shield';
it.each(['Please send your OTP','Share your bank PIN','give me your pass\u200bword','SASSA card details please',
 'Registration fee for job','Pay upfront to clear debt review','Remove Form 16 for a fee','CIPC agent fee: send money'])('warns locally about %s',text=>expect(inspect(text).flagged).toBe(true));
it.each(['The spinning wheel has stopped','Our opinion is different','Study Newton’s second law','The job interview is tomorrow'])('does not flag harmless word substrings: %s',text=>expect(inspect(text).flagged).toBe(false));
it('labels a risk, not a legal verdict or a completeness guarantee',()=>{
 expect(inspect('Pay upfront for a job').warning).not.toMatch(/illegal|R125|compliant|verified/);
 expect(inspect('A different scam outside the rule list').flagged).toBe(false);
});
