import {test,expect} from "@playwright/test";
test("Local Pulse: 320px radio/news discovery stays read-only and offers original sources",async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const posts:string[]=[];page.on("request",request=>{if(request.method()==="POST")posts.push(request.url());});
  await page.goto("/#/local-pulse");
  await expect(page.getByRole("heading",{name:/Hear the news/})).toBeVisible();
  await expect(page.getByRole("link",{name:/Open 702 on Primedia/})).toHaveAttribute("href","https://www.primediaplus.com/station/702/");
  await page.getByLabel("Local Pulse region").selectOption("WC");
  await expect(page.getByRole("link",{name:/Open CapeTalk on Primedia/})).toBeVisible();
  await expect(page.getByRole("link",{name:/Open 702 on Primedia/})).toHaveCount(0);
  await page.getByLabel("Local Pulse preferred language").selectOption("isiZulu");
  await expect(page.getByLabel("Prepared Local Pulse question")).toHaveValue(/isiZulu/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(posts).toEqual([]);
});
