import { test, expect } from '@playwright/test';

test('guest opens the regional drive demo, pauses it and changes landmarks', async ({page}) => {
  await page.goto('/#/drive');
  await expect(page.getByRole('heading',{name:'Luqi-Drive',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Start drive demo'}).click();
  await expect(page.getByText('DEMO IN MOTION',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause demo'}).click();
  await page.getByRole('button',{name:'Skip to next demo stop'}).click();
  await expect(page.getByRole('heading',{name:'Magaliesberg'}).first()).toBeVisible();
  await page.getByRole('button',{name:'Recenter map'}).click();
  await expect(page.getByRole('button',{name:'Resume demo'})).toBeVisible();
});
