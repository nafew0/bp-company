import { test, expect } from '@playwright/test'
import { E2E_ADMIN, login } from './helpers'

test.describe('BP-0 smoke', () => {
  test('home renders (locale-redirected)', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/en$/)
    await expect(page.getByTestId('hero-headline')).toBeVisible()
    await expect(page.getByTestId('site-navbar')).toBeVisible()
  })

  test('login page renders, no register link', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible()
    await expect(page.locator('a[href="/register"]')).toHaveCount(0)
  })

  test('unauthenticated /admin redirects to login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('SaaS routes are gone', async ({ page }) => {
    for (const path of ['/pricing', '/register']) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should 404`).toBe(404)
    }
  })

  test('staff can log in, reach dashboard and admin stats', async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password)
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)
    // New BP-0 dashboard contract: user-stat cards, no revenue/payments
    await expect(page.getByText(/total users/i)).toBeVisible()
    await expect(page.getByText(/revenue/i)).toHaveCount(0)
    await expect(page.getByText(/payment/i)).toHaveCount(0)
  })
})
