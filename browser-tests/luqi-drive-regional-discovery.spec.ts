import {test,expect} from '@playwright/test';

/** Synthetic geolocation only. Do not infer physical phone or car-hardware acceptance. */
test('Luqi-Drive regional knowledge is optional, mobile-safe and source linked', async ({page,context,baseURL})=>{
  await page.setViewportSize({width:320,height:740});
  const origin=new URL(baseURL!).origin;
  await context.grantPermissions(['geolocation'],{origin});
  await context.setGeolocation({latitude:-24.70,longitude:28.41,accuracy:18});
  const writes:string[]=[];
  await page.route('**/*',route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(url.origin!==origin)return route.abort();
    if(!['GET','HEAD'].includes(request.method())){
      writes.push(request.method()+' '+url.pathname);
      return route.abort();
    }
    return route.continue();
  });

  await page.goto('/#/drive');
  await expect(page.getByRole('heading',{name:/Source-linked road stories/i})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Did you know what is around you/i})).toBeVisible();
  const preview=page.getByRole('combobox',{name:'Luqi-Drive area preview'});
  await expect(preview).toBeDisabled();
  await expect(page.getByText('Fauna & flora',{exact:true})).toHaveCount(0);

  // Purely reading the page never starts location or inference.
  await expect(page.getByText(/Location is off/)).toBeVisible();
  expect(writes).toEqual([]);
  await page.getByRole('checkbox',{name:/I am safely parked/i}).check();
  await expect(preview).toBeEnabled();
  await expect(page.getByText('Fauna & flora',{exact:true})).toBeVisible();
  await preview.selectOption('n1-mokopane');
  await expect(page.getByRole('heading',{name:'Mokopane and Makapan Valley'})).toBeVisible();
  await expect(page.getByRole('link',{name:/Original source: UNESCO Fossil Hominid Sites/}).first())
    .toHaveAttribute('href','https://whc.unesco.org/en/list/915');

  await page.getByRole('button',{name:/Start location assist/i}).click();
  await expect(page.getByText(/Near a reviewed area: Modimolle/i)).toBeVisible();
  await page.getByRole('button',{name:/Stop location assist/i}).click();
  await expect(page.getByText(/Location assist stopped/)).toBeVisible();

  const dimensions=await page.evaluate(()=>({
    outer:document.documentElement.scrollWidth,
    inner:window.innerWidth,
  }));
  expect(dimensions.outer).toBeLessThanOrEqual(dimensions.inner+1);
  expect(writes).toEqual([]);
});
