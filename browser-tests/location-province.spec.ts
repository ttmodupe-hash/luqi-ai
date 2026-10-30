import {test,expect} from '@playwright/test';
test('device location suggests a province only after a click and explicit confirmation',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:-25.75,longitude:28.19,accuracy:50});
 await page.setViewportSize({width:320,height:740});
 const posts:string[]=[];page.on('request',req=>{if(req.method()==='POST'||/latitude|longitude|28\.19|25\.75/.test(req.url()))posts.push(req.url());});
 await page.goto('/#/opportunities');
 const location=page.getByRole('region',{name:'Optional device location'});
 await expect(location.getByRole('button',{name:'Use my location',exact:true})).toBeVisible();
 await expect(location.getByRole('button',{name:'Use Gauteng',exact:true})).toHaveCount(0);
 await location.getByRole('button',{name:'Use my location',exact:true}).click();
 await expect(location.getByRole('button',{name:'Use Gauteng',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Select Gauteng',exact:true})).toHaveAttribute('aria-pressed','false');
 await location.getByRole('button',{name:'Use Gauteng',exact:true}).click();
 await expect(page.getByRole('button',{name:'Select Gauteng',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(posts).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await page.reload();await expect(page.getByRole('button',{name:'Select Gauteng',exact:true})).toHaveAttribute('aria-pressed','false');
});
test('an outside-coverage fix retains manual province choice',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:0,longitude:0,accuracy:10});
 await page.goto('/#/opportunities');await page.getByRole('button',{name:'Use my location',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Could not confidently identify'})).toBeVisible();
 await page.getByRole('button',{name:'Select Gauteng',exact:true}).click();
 await expect(page.getByRole('button',{name:'Select Gauteng',exact:true})).toHaveAttribute('aria-pressed','true');
});
