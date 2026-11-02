// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InstallBrowserCheck } from '../src/components/InstallBrowserCheck';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('waits for a click, creates no request and exposes a local selectable report',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<InstallBrowserCheck/>);
 expect(screen.queryByRole('button',{name:'Show browser-check report'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Check this browser'}));
 fireEvent.click(screen.getByRole('button',{name:'Show browser-check report'}));
 const report=screen.getByRole('textbox') as HTMLTextAreaElement;
 expect(report.readOnly).toBe(true);expect(report.value).toContain('NOT a security certification');
 expect(fetcher).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Hide browser-check report'}));expect(screen.queryByRole('textbox')).toBeNull();
});
it('rechecking a changed connection invalidates the old report without sending it',()=>{
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true);render(<InstallBrowserCheck/>);
 fireEvent.click(screen.getByRole('button',{name:'Check this browser'}));
 fireEvent.click(screen.getByRole('button',{name:'Show browser-check report'}));
 vi.spyOn(navigator,'onLine','get').mockReturnValue(false);fireEvent(window,new Event('offline'));
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(screen.getByText('Offline hint; reconnect before updating')).toBeTruthy();
});
it('does not check on a connection event before user opt-in',()=>{
 render(<InstallBrowserCheck/>);fireEvent(window,new Event('offline'));
 expect(screen.queryByRole('button',{name:'Show browser-check report'})).toBeNull();
});
