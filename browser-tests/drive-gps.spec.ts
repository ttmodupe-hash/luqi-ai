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

test('opens the N3 at its shareable address and explores the Howick stop without location permission',async({page})=>{
  await page.goto('/#/drive?trail=n3');
  await page.getByRole('button',{name:/02 Howick/}).click();
  await expect(page.getByText('STORY PREVIEW · Howick')).toBeVisible();
  await page.getByText('Explore six roadside stories in English').click();
  await expect(page.getByText('Fauna & flora',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/uMngeni Local Municipality/})).toHaveAttribute('href','https://umngeni.gov.za/about-umngeni/');
  await page.getByRole('button',{name:'N1 · Pretoria to Polokwane'}).click();
  await expect(page).toHaveURL(/trail=n1/);
  await expect(page.getByRole('button',{name:/01 Modimolle/})).toBeVisible();
});
