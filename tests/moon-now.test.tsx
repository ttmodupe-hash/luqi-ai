// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import MoonNowPanel from '../src/components/MoonNowPanel';
const getPosition = vi.fn();
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T20:00:00Z'));
  getPosition.mockReset();
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:getPosition}});
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
test('renders the phase without requesting location or suggesting a camera feed', () => {
  render(<MoonNowPanel/>);
  expect(screen.getByRole('heading',{name:'Moon now'})).toBeTruthy();
  expect(screen.getByRole('img').getAttribute('aria-label')).toContain('illuminated');
  expect(screen.getByText(/not camera footage/)).toBeTruthy();
  expect(getPosition).not.toHaveBeenCalled();
  expect(screen.queryByText('Direction from true north')).toBeNull();
});
test('manual area supplies direction; clearing removes it', () => {
  render(<MoonNowPanel/>);
  fireEvent.click(screen.getByText('Enter an area manually'));
  fireEvent.change(screen.getByLabelText('Latitude'),{target:{value:'-26.2'}});
  fireEvent.change(screen.getByLabelText('Longitude'),{target:{value:'28.04'}});
  fireEvent.click(screen.getByRole('button',{name:'Apply area'}));
  expect(screen.getByText('Direction from true north')).toBeTruthy();
  expect(screen.getByText('Next estimated moonrise')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Clear location'}));
  expect(screen.queryByText('Direction from true north')).toBeNull();
  expect(getPosition).not.toHaveBeenCalled();
});
test('invalid coordinates do not create an accidental 0,0 location', () => {
  render(<MoonNowPanel/>);
  fireEvent.click(screen.getByText('Enter an area manually'));
  fireEvent.click(screen.getByRole('button',{name:'Apply area'}));
  expect(screen.getByRole('status').textContent).toContain('Enter latitude');
  expect(screen.queryByText('Direction from true north')).toBeNull();
});
test('clock updates, pauses and resumes without background refresh', () => {
  const {container}=render(<MoonNowPanel/>);
  const time=()=>container.querySelector('time')!.getAttribute('dateTime');
  const initial=time();act(()=>vi.advanceTimersByTime(60000));expect(time()).not.toBe(initial);
  fireEvent.click(screen.getByRole('button',{name:'Pause live updates'}));
  const paused=time();act(()=>vi.advanceTimersByTime(120000));expect(time()).toBe(paused);
  fireEvent.click(screen.getByRole('button',{name:'Resume live updates'}));expect(time()).not.toBe(paused);
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
  const hidden=time();act(()=>vi.advanceTimersByTime(120000));expect(time()).toBe(hidden);
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  fireEvent(document,new Event('visibilitychange'));expect(time()).not.toBe(hidden);
});
test('denied location keeps the Moon useful', () => {
  getPosition.mockImplementation((_ok: unknown, bad: () => void)=>bad());
  render(<MoonNowPanel/>);fireEvent.click(screen.getByRole('button',{name:'Use my location (optional)'}));
  expect(screen.getByRole('status').textContent).toContain('Location was not available');
  expect(screen.getByRole('img')).toBeTruthy();
});
test('late location callback cannot undo clear', () => {
  let complete!: PositionCallback;
  getPosition.mockImplementation((ok: PositionCallback)=>{complete=ok;});
  render(<MoonNowPanel/>);fireEvent.click(screen.getByRole('button',{name:'Use my location (optional)'}));
  fireEvent.click(screen.getByRole('button',{name:'Clear location'}));
  act(()=>complete({coords:{latitude:-26.2,longitude:28.04}} as GeolocationPosition));
  expect(screen.queryByText('Direction from true north')).toBeNull();
});
test('opted-in location is rounded before state is set', () => {
  getPosition.mockImplementation((ok: PositionCallback)=>ok({coords:{latitude:-26.23456,longitude:28.04567}} as GeolocationPosition));
  render(<MoonNowPanel/>);fireEvent.click(screen.getByRole('button',{name:'Use my location (optional)'}));
  expect((screen.getByLabelText('Latitude') as HTMLInputElement).value).toBe('-26.2');
  expect((screen.getByLabelText('Longitude') as HTMLInputElement).value).toBe('28');
});
