import {test,expect} from '@playwright/test';
test('Near me carries a province into existing guidance and prepares external search without sending location',async({page})=>{
 await page.setViewportSize({width:320,height:840});
 const outgoing:string[]=[];page.on('request',req=>{if(req.method()==='POST'||/google\.com\/maps|maps\.apple|openstreetmap/.test(req.url()))outgoing.push(req.url());});
 await page.goto('/#/near-me');await expect(page.getByRole('heading',{name:'Near me — find your next stop'})).toBeVisible();
 await page.getByLabel('Discovery province').selectOption('GP');
 await page.getByLabel('Find a council').fill('Tshwane');
 await expect(page.getByRole('heading',{name:'City of Tshwane Metropolitan Municipality'})).toBeVisible();
 await page.getByLabel('Map search locality').fill('Mabopane');
 await page.getByLabel('Map provider').selectOption('osm');
 await expect(page.getByRole('link',{name:'Open search in OpenStreetMap'})).toHaveAttribute('href','https://www.openstreetmap.org/search?query=businesses%2C%20Mabopane%2C%20Gauteng%2C%20South%20Africa');
 expect(outgoing).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 const guides=page.getByRole('region',{name:'Local Luqi guides'});
 await guides.getByRole('link',{name:/Municipal services/}).click();await expect(page.getByLabel('Municipality province')).toHaveValue('GP');
 await page.goto('/#/near-me?province=MP');
 await page.getByRole('region',{name:'Local Luqi guides'}).getByRole('link',{name:/Jobs & opportunities/}).click();await expect(page.getByRole('button',{name:'Select Mpumalanga'})).toHaveAttribute('aria-pressed','true');
});
