import {test,expect} from '@playwright/test';
test('grades, generation, skip, transport, options and privacy',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?grade=1&seed=12345');await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();
 await page.screenshot({path:'test-results/grade-1.png',fullPage:true});
 await page.getByRole('switch',{name:'Count-in'}).uncheck();await page.getByRole('button',{name:'Play',exact:true}).click();await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('button',{name:'Stop',exact:true}).click();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();
 await page.getByRole('radio',{name:'Grade 4',exact:false}).check();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();await expect(page.locator('.grade-badge')).toHaveText('GRADE 4');await page.screenshot({path:'test-results/grade-4.png',fullPage:true});
 await page.locator('.exercise-details>summary').click();await page.getByText('Composition metadata',{exact:true}).click();const before=await page.locator('pre').textContent();await page.getByRole('button',{name:'Skip',exact:true}).click();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();await expect(page.locator('pre')).not.toHaveText(before!);
 for(const name of ['Metronome','Loop']){await page.getByRole('switch',{name}).check();await expect(page.getByRole('switch',{name})).toBeChecked();}
 await page.getByRole('slider').press('Home');await page.getByRole('slider').press('ArrowRight');await expect(page.locator('.tempo-value')).toContainText('41');
 await page.getByRole('radio',{name:'Grade 8',exact:false}).check();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();await page.screenshot({path:'test-results/grade-8.png',fullPage:true});
 await expect(page.getByTestId('engraving')).toHaveAttribute('data-page-validation','true');
 expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);expect(await page.evaluate(()=>Object.keys(sessionStorage))).toEqual([]);expect(errors).toEqual([]);
});
test('small viewport preserves readable grand staff and working controls',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/?grade=4&seed=721');await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'test-results/mobile.png',fullPage:true});});
test('repeated grade changes never leave a stale score or playing reference',async({page})=>{await page.goto('/?grade=1&seed=41');await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();for(const g of [2,7,3,8,1])await page.getByRole('radio',{name:`Grade ${g}`,exact:false}).check();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeEnabled();await expect(page.locator('.grade-badge')).toHaveText('GRADE 1');await expect(page.locator('.score-meta')).toContainText('6 bars');});
