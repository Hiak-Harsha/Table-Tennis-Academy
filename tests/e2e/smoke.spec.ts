import { test, expect } from '@playwright/test'

test.describe('TTA Portal Production Smoke & Navigation Suite', () => {
  test('Home page loads with branding, navigation, and legal links', async ({ page }) => {
    await page.goto('/home')

    // Verify main page elements
    await expect(page).toHaveTitle(/Table Tennis Academy|TTA/i)
    await expect(page.locator('main')).toBeVisible()

    // Verify legal and compliance footer links
    const privacyLink = page.locator('footer a[href="/privacy"]')
    const termsLink = page.locator('footer a[href="/terms"]')
    const refundsLink = page.locator('footer a[href="/refunds"]')

    await expect(privacyLink).toBeVisible()
    await expect(termsLink).toBeVisible()
    await expect(refundsLink).toBeVisible()
  })

  test('Authentication login page renders accessible form elements', async ({ page }) => {
    await page.goto('/login')

    // Phone input
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="Phone"], input[placeholder*="mobile"]')
    await expect(phoneInput.first()).toBeVisible()

    // Password input
    const passwordInput = page.locator('input[type="password"], input[type="text"]')
    await expect(passwordInput.first()).toBeVisible()

    // Submit button
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
  })

  test('Registration page renders athlete enrollment and minor consent notice', async ({ page }) => {
    await page.goto('/register')

    // Heading
    await expect(page.locator('text=Join the Academy').first()).toBeVisible()

    // Inputs
    await expect(page.locator('input[placeholder*="Sharath Kamal"]')).toBeVisible()
    await expect(page.locator('input[type="number"]')).toBeVisible()

    // Consent notice
    await expect(page.locator('text=Terms & Rules').first()).toBeVisible()
    await expect(page.locator('text=Privacy Policy').first()).toBeVisible()
  })

  test('Compliance pages render successfully', async ({ page }) => {
    // Privacy Policy
    await page.goto('/privacy')
    await expect(page.locator('h1')).toContainText('Privacy Policy')
    await expect(page.locator('text=Minor Student Data Protection')).toBeVisible()

    // Terms of Service
    await page.goto('/terms')
    await expect(page.locator('h1')).toContainText('Terms of Service')
    await expect(page.locator('text=Code of Conduct')).toBeVisible()

    // Refund Policy
    await page.goto('/refunds')
    await expect(page.locator('h1')).toContainText('Refund & Cancellation Policy')
    await expect(page.locator('text=Monthly Academy Training Fees')).toBeVisible()
  })
})
