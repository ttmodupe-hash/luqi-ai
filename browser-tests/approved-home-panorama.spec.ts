import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  await page.addInitScript(() => localStorage.setItem('luqi_welcome_seen','true'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.abort();
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/')) {
      return route.fulfill({ status:503, json:{code:'ISOLATED_SCREENSHOT_TEST'} });
    }
    return route.continue();
  });
});

test('approved panoramic home is real, readable and has a functioning Moon without invented people',async({page},testInfo)=>{
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#/');
  await expect(page.getByRole('heading',{level:1,name:/Knowledge\. People\.\s*A Stronger Africa\./})).toBeVisible();
  const hero=page.locator('.luqi-panorama-top .luqi-hero');
  await expect(hero).toBeVisible();
  expect(await hero.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('luqi-panorama.svg');
  await expect(page.locator('.luqi-panorama-top .luqi-moon')).toBeVisible();
  await expect(page.locator('.luqi-moon').getByRole('img')).toHaveAttribute('aria-label',/illuminated/);
  await expect(page.getByRole('heading',{name:/African Peoples and Historical Evidence in Biblical Narratives/})).toBeVisible();
  await expect(page.locator('.luqi-history-cards .luqi-history-card')).toHaveCount(3);
  const strip=page.locator('.luqi-pano-tools a');
  expect(await strip.count()).toBeGreaterThanOrEqual(10);
  await expect(page.getByRole('complementary',{name:'Luqi contacts'})).toBeVisible();
  await expect(page.getByRole('dialog',{name:'Your contacts'})).toHaveCount(0);
  await expect(page.getByText('3 online',{exact:false})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('approved-home.png'),fullPage:true,scale:'css'});
});

test('real ask bar carries a private goal to the local Luqi guide without submitting paid AI',async({page})=>{
  let paid=0;
  page.on('request',req=>{if(req.method()==='POST'&&(req.url().includes('guest-chat')||req.url().includes('luqi-core')))paid++;});
  await page.goto('/#/');
  await page.getByRole('textbox',{name:'Ask Luqi anything'}).fill('How can I prepare to start a small shop?');
  await page.getByRole('button',{name:'Explore my question with Luqi'}).click();
  await expect(page).toHaveURL(/#\/ask$/);
  await expect(page.getByLabel('What would you like help with?')).toHaveValue('How can I prepare to start a small shop?');
  expect(paid).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('home history buttons open the sourced lesson and practice; tool strip opens actual tools',async({page})=>{
  await page.goto('/#/');
  await page.getByRole('link',{name:/Explore the topics/}).click();
  await expect(page).toHaveURL(/#\/comparative-evidence$/);
  await expect(page.getByRole('button',{name:'Close African history study'})).toBeVisible();
  await expect(page.getByRole('group',{name:'African biblical study topics'}).getByRole('button')).toHaveCount(7);
  await page.goto('/#/');
  await page.getByRole('link',{name:/Study questions/}).click();
  await expect(page.getByText('Try four evidence-reading questions')).toBeVisible();
  await expect(page.getByRole('radio',{name:'Cush',exact:true})).toBeVisible();
  await page.goto('/#/');
  await page.locator('.luqi-pano-tools').getByRole('link',{name:/Driver rights/}).click();
  await expect(page).toHaveURL(/#\/driver-rights$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('narrow 320px phone remains usable without hidden links or horizontal scroll',async({page},testInfo)=>{
  await page.setViewportSize({width:320,height:740});
  await page.goto('/#/');
  await expect(page.getByRole('textbox',{name:'Ask Luqi anything'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Try Luqi free',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:/African Peoples and Historical Evidence/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('approved-home-320.png'),fullPage:true,scale:'css'});
});


test('desktop panorama aligns useful content without blank grid cells and keeps actual CTAs readable',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/#/');
  // The panorama is an intentionally lazy route. Wait for real page content
  // before measuring layout; do not assert against the temporary loading shell.
  await expect(page.locator('.luqi-panorama-top .luqi-hero')).toBeVisible();
  await expect(page.locator('.luqi-panorama-top .luqi-hero-copy')).toBeVisible();
  await expect(page.locator('.luqi-panorama-top .luqi-chat-card')).toBeVisible();
  const alignment=await page.evaluate(()=>{
    const area=document.querySelector('.luqi-panorama-top .luqi-hero')!.getBoundingClientRect();
    const copy=document.querySelector('.luqi-panorama-top .luqi-hero-copy')!.getBoundingClientRect();
    const card=document.querySelector('.luqi-panorama-top .luqi-chat-card')!.getBoundingClientRect();
    return {left:copy.left-area.left,topDifference:Math.abs(copy.top-card.top),cardWidth:card.width};
  });
  expect(alignment.left).toBeLessThan(80);
  expect(alignment.topDifference).toBeLessThanOrEqual(2);
  expect(alignment.cardWidth).toBeGreaterThan(200);
  const contrast=await page.locator('.luqi-pano-entry-actions .luqi-secondary').evaluateAll(nodes=>{
    const brightness=(value:string)=>{
      const numbers=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{
        const c=v/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
      });
      return .2126*numbers[0]+.7152*numbers[1]+.0722*numbers[2];
    };
    return nodes.map(node=>{
      const style=getComputedStyle(node),fg=brightness(style.color),bg=brightness(style.backgroundColor);
      return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
    });
  });
  expect(contrast.length).toBeGreaterThanOrEqual(2);
  for(const ratio of contrast)expect(ratio).toBeGreaterThanOrEqual(4.5);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
