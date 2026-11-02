// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ContentStudioPage from '../src/pages/ContentStudioPage';
vi.mock('../src/lib/recording-support',()=>({browserRecordingType:()=> 'video/webm'}));
vi.mock('../src/lib/content-studio', async importOriginal => ({...(await importOriginal<any>()),drawStudioFrame:vi.fn()}));
// This tests export identity/UX with a synthetic encoder, NOT real video playback.
beforeEach(()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>setTimeout(()=>cb(performance.now()),16));
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>clearTimeout(id));
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as any);
 Object.defineProperty(HTMLCanvasElement.prototype,'captureStream',{configurable:true,value:()=>({getTracks:()=>[{stop:vi.fn()}],getVideoTracks:()=>[]})});
 vi.stubGlobal('URL',class extends URL {static createObjectURL=()=> 'blob:synthetic-completed-export';static revokeObjectURL=vi.fn();});
 class FixtureRecorder {
   static isTypeSupported(){return true;}
   state='inactive';mimeType='video/webm';ondataavailable:any;onstop:any;onerror:any;
   constructor(_stream:any,_opts:any){}
   start(){this.state='recording';}
   stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['synthetic-encoded-fixture'])});this.onstop?.();}
 }
 vi.stubGlobal('MediaRecorder',FixtureRecorder);
 vi.stubGlobal('fetch',vi.fn(()=>{throw new Error('Unexpected network request');}));
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();delete (HTMLCanvasElement.prototype as any).captureStream;});

it.each([
 ['Scene title','Corrected title'],['Scene caption','Corrected caption'],['Critical-thinking question','A revised question'],
 ['Video format','portrait'],['Camera angle','50'],['Gravity','1.62'],['Pendulum length','3.2'],
])('labels the previous video after changing %s, without misnaming it as the new output',async(label,value)=>{
 render(<MemoryRouter><ContentStudioPage/></MemoryRouter>);
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Record 90-second animation',exact:true}));});
 await act(async()=>{await vi.advanceTimersByTimeAsync(90001);});
 expect(screen.getByRole('link',{name:'Download 90-second video (.webm)',exact:true}).getAttribute('download')).toBe('luqi-showcase-90s-landscape.webm');
 fireEvent.change(screen.getByLabelText(label,{exact:true}),{target:{value}});
 expect(screen.getByText(/Previous export — record again/)).toBeTruthy();
 expect(screen.queryByRole('link',{name:'Download 90-second video (.webm)',exact:true})).toBeNull();
 const previous=screen.getByRole('link',{name:'Download previous export (90s, landscape, .webm)',exact:true});
 expect(previous.getAttribute('download')).toBe('luqi-showcase-90s-landscape.webm');
 expect(previous.getAttribute('href')).toBe('blob:synthetic-completed-export');
 expect(screen.getByLabelText('Previous export preview')).toBeTruthy();
 expect(fetch).not.toHaveBeenCalled();
});
