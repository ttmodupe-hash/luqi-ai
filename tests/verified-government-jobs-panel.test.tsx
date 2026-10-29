// @vitest-environment jsdom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,fireEvent,screen,cleanup,within} from '@testing-library/react';
import VerifiedGovernmentJobsPanel from '../src/components/VerifiedGovernmentJobsPanel';
const spy=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T09:00:00+02:00'));spy.mockReset();vi.stubGlobal('fetch',spy)});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()});
it('Gauteng map choice filters real advertised references with no provider requests',()=>{
 render(<VerifiedGovernmentJobsPanel province="GP"/>);
 expect(screen.getByRole('heading',{name:'Administrative Clerk: Management Support Services'})).toBeTruthy();
 expect(screen.queryByRole('heading',{name:'Client Service Officer: COID'})).toBeNull();
 expect(screen.getByText(/HR4\/4\/4\/09\/47/)).toBeTruthy();
 expect(spy).not.toHaveBeenCalled();
});
it('does not display withdrawn posts in actionable list and discloses them in history',()=>{
 render(<VerifiedGovernmentJobsPanel province="EC"/>);
 expect(screen.queryByRole('heading',{name:'Personnel Officer: Human Resources Management'})).toBeNull();
 fireEvent.click(screen.getByLabelText(/Include withdrawn posts/));
 const withdrawn=screen.getByRole('heading',{name:'Personnel Officer: Human Resources Management'});
 expect(withdrawn).toBeTruthy();
 const article=withdrawn.closest('article')!;
 expect(within(article).getByText(/Withdrawn by the employer/)).toBeTruthy();
 expect(within(article).getByRole('link',{name:'Official withdrawal notice'}).getAttribute('href')).toContain('withdrawal');
});
it('marks deadline-passed posts as not actionable',()=>{
 vi.setSystemTime(new Date('2026-12-01T08:00:00+02:00'));
 render(<VerifiedGovernmentJobsPanel province={null}/>);
 expect(screen.getByText(/No currently listed source records/)).toBeTruthy();
 fireEvent.click(screen.getByLabelText(/Include withdrawn posts/));
 expect(screen.getAllByText(/Published closing date passed/).length).toBeGreaterThan(0);
});
it('filters stated academic requirement and warns it cannot determine eligibility',()=>{
 render(<VerifiedGovernmentJobsPanel province="MP"/>);
 fireEvent.change(screen.getByLabelText('Advertised education requirement'),{target:{value:'grade12'}});
 expect(screen.getByRole('heading',{name:'Client Service Officer: COID'})).toBeTruthy();
 expect(screen.queryByRole('heading',{name:'Field ICT Technician'})).toBeNull();
 expect(screen.getByText(/not your personal eligibility/)).toBeTruthy();
});
