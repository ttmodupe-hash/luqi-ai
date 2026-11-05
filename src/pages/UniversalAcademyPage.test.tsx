// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
const identity = vi.hoisted(() => ({ email: null as string | null }));
vi.mock('../providers/customer-session', () => ({ useOptionalCustomerSession: () => ({ session: identity.email ? { user: { email: identity.email } } : null }) }));
import UniversalAcademyPage from './UniversalAcademyPage';
const mount = () => render(<MemoryRouter><UniversalAcademyPage /></MemoryRouter>);
beforeEach(() => { identity.email=null; vi.stubGlobal('fetch',vi.fn(()=>Promise.reject(new Error('Unexpected provider/network call')))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('universal academy user journeys',()=>{
  it('shows all six tracks without a provider request or automatic video load',()=>{
    mount(); for(const name of ['Cisco CCNA','Security+ and Cyber Defence','AWS Cloud Practitioner','Python and AI Engineering','Grade 12 Maths and Physical Sciences','Solar PV, K53 and Business Foundations']) expect(screen.getByRole('button',{name,exact:true})).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull(); expect(fetch).not.toHaveBeenCalled();
  });
  it('calculates the CCNA lab locally',()=>{
    mount(); fireEvent.click(screen.getByRole('button',{name:'Hands-on lab'})); fireEvent.click(screen.getByRole('button',{name:'Calculate locally'})); expect(screen.getByText(/192\.168\.31\.255/, {selector:'pre'})).toBeTruthy(); expect(fetch).not.toHaveBeenCalled();
  });
  it('switches to a distinct security lab',()=>{
    mount();fireEvent.click(screen.getByRole('button',{name:'Security+ and Cyber Defence',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Hands-on lab'}));fireEvent.click(screen.getByRole('button',{name:'Calculate locally'}));expect(screen.getByText(/"ale": 10000/, {selector:'pre'})).toBeTruthy();expect(screen.getByRole('heading',{name:'Real SHA-256 demonstration'})).toBeTruthy();
  });
  it('does not mark merely revealing an answer as a successful attempt',()=>{
    mount();fireEvent.click(screen.getByRole('button',{name:'Practice and feedback'}));fireEvent.click(screen.getByRole('button',{name:'Show worked answer'}));expect(screen.getByRole('status').textContent).toContain('does not record');fireEvent.click(screen.getByRole('button',{name:'Study method and notebook'}));expect(screen.getByText(/0 attempts recorded/)).toBeTruthy();
  });
  it('records an attempt with a misconception explanation',()=>{
    mount();fireEvent.click(screen.getByRole('button',{name:'Practice and feedback'}));fireEvent.change(screen.getByLabelText(/Your answer/),{target:{value:'-100'}});fireEvent.click(screen.getByRole('button',{name:'Check and record attempt'}));expect(screen.getByRole('status').textContent).toContain('Not yet');fireEvent.click(screen.getByRole('button',{name:'Study method and notebook'}));expect(screen.getByText(/1 attempts recorded/)).toBeTruthy();
  });
  it('requires a deliberate action before loading external YouTube',()=>{
    mount();expect(document.querySelector('iframe')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Load YouTube player'}));const frame=document.querySelector('iframe');expect(frame?.src).toBe('https://www.youtube-nocookie.com/embed/bQ8sdpGQu8c');expect(frame?.getAttribute('sandbox')).not.toContain('allow-top-navigation');fireEvent.click(screen.getByRole('button',{name:'Unload external player'}));expect(document.querySelector('iframe')).toBeNull();
  });
  it('builds a custom local outline without scraping or claiming content validation',()=>{
    mount();fireEvent.click(screen.getByRole('button',{name:'Build custom course'}));fireEvent.change(screen.getByLabelText('Subject'),{target:{value:'Water literacy'}});fireEvent.change(screen.getByLabelText(/What should the learner/),{target:{value:'Explain and model safe filtration'}});fireEvent.change(screen.getByLabelText(/Topics, one per line/),{target:{value:'Flow\nMaterials'}});fireEvent.click(screen.getByRole('button',{name:'Build local course outline'}));expect(screen.getByText('Module 1: Flow')).toBeTruthy();expect(screen.getByText(/Learner-authored outline/)).toBeTruthy();expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps language preferences as explicit tutor requests, not fake translations',()=>{
    mount();fireEvent.click(screen.getByRole('button',{name:'Study method and notebook'}));fireEvent.change(screen.getByLabelText(/Language for your next/),{target:{value:'Sepitori'}});expect((screen.getByLabelText(/Prepared tutor request/) as HTMLTextAreaElement).value).toContain('Sepitori');expect(screen.getByText(/do not claim the English lesson has already been translated/)).toBeTruthy();expect(fetch).not.toHaveBeenCalled();
  });
  it('clears private workspace drafts synchronously on an account change',()=>{
    identity.email='first@example.test';const view=mount();fireEvent.click(screen.getByRole('button',{name:'Study method and notebook'}));fireEvent.change(screen.getByLabelText(/What did you misunderstand/),{target:{value:'Private first-account reflection'}});identity.email='second@example.test';view.rerender(<MemoryRouter><UniversalAcademyPage /></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Study method and notebook'}));expect((screen.getByLabelText(/What did you misunderstand/) as HTMLTextAreaElement).value).toBe('');
  });
});
