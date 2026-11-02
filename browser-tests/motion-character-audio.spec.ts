import { test, expect } from '@playwright/test';

function ownSignal(): Buffer {
  const sampleRate = 8000, frames = sampleRate * 5;
  const bytes = Buffer.alloc(44 + frames * 2);
  bytes.write('RIFF',0); bytes.writeUInt32LE(bytes.length - 8,4);
  bytes.write('WAVEfmt ',8); bytes.writeUInt32LE(16,16);
  bytes.writeUInt16LE(1,20); bytes.writeUInt16LE(1,22);
  bytes.writeUInt32LE(sampleRate,24); bytes.writeUInt32LE(sampleRate*2,28);
  bytes.writeUInt16LE(2,32); bytes.writeUInt16LE(16,34);
  bytes.write('data',36); bytes.writeUInt32LE(frames*2,40);
  for(let i=0;i<frames;i++) bytes.writeInt16LE(Math.round(1200*Math.sin(2*Math.PI*220*i/sampleRate)),44+2*i);
  return bytes;
}

test('Luqi rig video combines licensed on-device audio with real animation or reports unsupported codec', async ({page})=>{
  const writes:string[]=[];page.on('request',r=>{if(r.method()!=='GET')writes.push(r.url());});
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#/content-studio');
  await page.getByRole('checkbox',{name:/I own this music or have permission/}).check();
  await page.getByLabel('Choose licensed music').setInputFiles({
    name:'original-luqi-audio-test.wav',mimeType:'audio/wav',buffer:ownSignal(),
  });
  await expect(page.getByText('Selected music: original-luqi-audio-test.wav')).toBeVisible();
  await page.getByRole('button',{name:'Open Luqi Motion Studio'}).click();
  const editor=page.getByRole('region',{name:'Luqi Motion Studio'});
  const panel=editor.getByRole('region',{name:'Luqi character video export'});
  const record=panel.getByRole('button',{name:'Record 4-second character video with sound'});
  if (await record.isDisabled()) {
    await expect(panel.getByText(/cannot combine character video and selected audio/)).toBeVisible();
    expect(writes).toEqual([]);
    return;
  }
  await record.click();
  await expect(panel.getByRole('status',{name:'Character video status'}))
    .toContainText('character video with the selected soundtrack is ready',{timeout:16000});
  const pending=page.waitForEvent('download');
  await panel.getByRole('link',{name:/Download 4-second character video/}).click();
  const result=await pending;
  const chunks:Buffer[]=[];
  const stream=await result.createReadStream();
  for await(const chunk of stream)chunks.push(Buffer.from(chunk));
  const data=Buffer.concat(chunks);
  expect(data.byteLength).toBeGreaterThan(5000);
  const name=result.suggestedFilename();
  if(name.endsWith('.webm')) expect(data.includes(Buffer.from('A_OPUS'))).toBe(true);
  else {
    expect(name).toMatch(/\.mp4$/);
    expect(data.includes(Buffer.from('soun')) || data.includes(Buffer.from('mp4a'))).toBe(true);
  }
  expect(writes).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
