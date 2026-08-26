import { Page, expect } from '@playwright/test'

/** Mirrors backend/accounts/management/commands/seed_e2e.py — test-only credentials. */
export const E2E_ADMIN = {
  email: 'e2e-admin@example.com',
  username: 'e2e-admin',
  password: 'e2e-Admin-Pass-1234',
}

export async function login(page: Page, identifier: string, password: string) {
  await page.goto('/login')
  await page.locator('input[autocomplete="username"]').fill(identifier)
  await page.locator('input[autocomplete="current-password"]').fill(password)
  await page.locator('button[type="submit"]').click()
}

export async function loginAsAdmin(page: Page) {
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await expect(page).toHaveURL(/\/dashboard/)
}
