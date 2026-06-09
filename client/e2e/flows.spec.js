import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Portfolio E2E Flows', () => {
    test('Language switcher changes language', async ({ page }) => {
        await page.goto('/');
        
        // Find language dropdown
        const langDropdown = page.locator('button[aria-label="Language"]').first();
        await expect(langDropdown).toBeVisible();
        await langDropdown.click();

        // Click Korean option (using label 'Korean')
        const targetOption = page.locator('button[role="option"]:has-text("Korean")');
        await targetOption.click();

        // Check language changes
        await expect(langDropdown).toContainText('Korean');
    });

    test('Anonymous message form submission', async ({ page }) => {
        await page.goto('/anonymous-message');

        // Form elements
        const messageTextarea = page.locator('textarea');
        const submitBtn = page.locator('button[type="submit"]');

        await messageTextarea.fill('Hello this is a test anonymous message');
        
        // Ensure honeypot is left empty
        const honeypot = page.locator('input[name="website"]').first();
        if (await honeypot.isVisible()) {
            await expect(honeypot).toBeEmpty();
        }

        await submitBtn.click();

        // Successful submission message or indicator
        await expect(page.locator('text=Message sent successfully')).toBeVisible();
    });

    test('Admin login and dashboard navigation', async ({ page }) => {
        await page.goto('/login');

        const identifierInput = page.locator('input[type="text"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitBtn = page.locator('button[type="submit"]');

        await identifierInput.fill('admin');
        await passwordInput.fill('password123');
        await submitBtn.click();

        // Redirects to dashboard
        await expect(page).toHaveURL(/.*dashboard/);
    });

    test('Homepage accessibility audit', async ({ page }) => {
        await page.goto('/');
        
        // Wait for page load
        await page.waitForLoadState('domcontentloaded');
        
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });
});

