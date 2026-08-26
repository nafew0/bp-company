import { test, expect } from '@playwright/test'

test.describe('BP-2 i18n (locale routing, toggle, cookie, exclusions)', () => {
  test('root redirects to default locale with lang frame', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/en$/)
    await expect(page.getByTestId('locale-frame')).toHaveAttribute('lang', 'en')
  })

  test('bengali deep link renders translated copy with bn lang', async ({ page }) => {
    await page.goto('/bn')
    await expect(page.getByTestId('locale-frame')).toHaveAttribute('lang', 'bn')
    await expect(page.getByText('সার্ভিস প্রোভাইডার ওয়েবসাইট টেমপ্লেট', { exact: false })).toBeVisible()
    await expect(page.getByRole('link', { name: 'লগইন' })).toBeVisible()
  })

  test('toggle switches locale, persists via cookie across visits', async ({ page }) => {
    await page.goto('/en')
    await page.getByTestId('language-option-bn').click()
    await expect(page).toHaveURL(/\/bn$/)
    await expect(page.getByTestId('locale-frame')).toHaveAttribute('lang', 'bn')

    // reload keeps the locale
    await page.reload()
    await expect(page).toHaveURL(/\/bn$/)

    // cookie now steers the root redirect
    await page.goto('/')
    await expect(page).toHaveURL(/\/bn$/)

    // and back to English
    await page.getByTestId('language-option-en').click()
    await expect(page).toHaveURL(/\/en$/)
  })

  test('toggle preserves the current path', async ({ page }) => {
    await page.goto('/en/styleguide')
    await page.getByTestId('language-option-bn').click()
    await expect(page).toHaveURL(/\/bn\/styleguide$/)
    await expect(page.getByRole('heading', { name: 'BP-Company Styleguide' })).toBeVisible()
    // Bengali sample in the styleguide renders under the bn frame
    await expect(page.getByTestId('alt-script-sample')).toBeVisible()
  })

  test('unknown locale prefix 404s', async ({ page }) => {
    const response = await page.goto('/fr')
    expect(response?.status()).toBe(404)
  })

  test('staff/auth routes stay non-localized', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login$/) // no /en prefix added
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible()

    const localizedLogin = await page.goto('/en/login')
    expect(localizedLogin?.status()).toBe(404)

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })
})
