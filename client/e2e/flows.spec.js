import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Portfolio E2E Flows', () => {
    test('Language switcher changes language', async ({ page }) => {
        await page.goto('/');
        
        // Find language dropdown
        const langDropdown = page.locator('button[aria-haspopup="listbox"]').first();
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
        await expect(page.locator('text=Message Sent')).toBeVisible();
    });

    test('Admin login and dashboard navigation', async ({ page }) => {
        await page.goto('/login');

        const identifierInput = page.locator('input[type="text"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitBtn = page.locator('button[type="submit"]');

        await identifierInput.fill('admin');
        await passwordInput.fill('admin');
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

    test('E2E Flow: login -> create a page -> verify it appears on public site', async ({ page }) => {
        // 1. Go to login
        await page.goto('/login');
        
        // 2. Fill credentials and submit
        await page.locator('input[type="text"]').fill('admin');
        await page.locator('input[type="password"]').fill('admin');
        await page.locator('button[type="submit"]').click();
        
        // 3. Confirm redirected to dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // 4. Navigate directly to blog tab
        await page.goto('/admin/dashboard?tab=blog');
        await page.waitForLoadState('networkidle');

        const suffix = Date.now();
        const pageTitle = `My Custom E2E Page ${suffix}`;
        const pageSlug = `custom-e2e-page-${suffix}`;

        // 5. Click Add New Blog Page
        await page.locator('button:has-text("Add New Blog Page")').click();

        // 6. Enter Title
        await page.locator('.ProseMirror').first().fill(pageTitle);

        // 7. Enter Slug
        await page.locator('input[placeholder="study"]').fill(pageSlug);

        // 8. Click Save Record
        await page.locator('button:has-text("Save Record")').first().click();

        // 9. Confirm save success notice
        await expect(page.locator('text=Saved successfully')).toBeVisible();

        // 10. Visit public page and assert
        await page.goto(`/blog/${pageSlug}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1')).toContainText(pageTitle);
    });
});

