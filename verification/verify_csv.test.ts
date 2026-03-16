import { test, expect } from '@playwright/test';

test('take debug screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/home/jules/verification/debug_home.png' });
});
