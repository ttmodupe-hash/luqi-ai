import { expect,test } from '@playwright/test';
for(const viewport of [{width:320,height:420},{width:390,height:740}]){
 test(`mobile navigation keeps lower destinations reachable at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/#/');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  const menu=page.getByRole('navigation',{name:'Mobile navigation',exact:true});
  await expect(menu).toBeVisible();
  const bounds=await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
  await expect(page.getByRole('button',{name:'Close navigation',exact:true})).toBeVisible();
  // A lower destination must be clickable using ordinary scrolling, not a forced click.
  await menu.getByRole('link',{name:'Private notes',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Companion conversations',exact:true})).toBeVisible();
  await expect(menu).toHaveCount(0);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'Install',exact:true}).click();
  await expect(page).toHaveURL(/#\/install$/);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
 });
}
