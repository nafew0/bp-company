import { test, expect } from '@playwright/test'

test.describe('BP-1 styleguide (site kit under theme tokens)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/styleguide')
  })

  test('renders heading, sections, and alt-script sample', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'BP-Company Styleguide' })).toBeVisible()
    for (const section of [
      'section-colors',
      'section-type',
      'section-buttons',
      'section-dark',
      'section-cards',
      'section-forms',
      'section-stepper',
    ]) {
      await expect(page.getByTestId(section)).toBeVisible()
    }
    await expect(page.getByTestId('alt-script-sample')).toBeVisible()
  })

  test('button variants render; disabled is disabled; link button navigates', async ({ page }) => {
    for (const id of ['btn-primary', 'btn-gradient', 'btn-secondary', 'btn-ghost-dark']) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    await expect(page.getByTestId('btn-disabled')).toBeDisabled()
    await expect(page.getByTestId('btn-link')).toHaveAttribute('href', '/styleguide#buttons')
  })

  test('dark section uses dark surface with inverse ink', async ({ page }) => {
    const dark = page.getByTestId('section-dark')
    await expect(dark).toHaveAttribute('data-tone', 'dark')
    const bg = await dark.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).toBe('rgb(0, 0, 0)')
  })

  test('form controls show error state', async ({ page }) => {
    const errorInput = page.getByTestId('input-error')
    await expect(errorInput).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('alert').filter({ hasText: 'valid phone' })).toBeVisible()
  })

  test('stepper navigates forward, back, and via completed-step click', async ({ page }) => {
    const label = page.getByTestId('stepper-active-label')
    await expect(label).toHaveText('Step 1: Details')

    await page.getByTestId('stepper-back').isDisabled()
    await page.getByTestId('stepper-next').click()
    await expect(label).toHaveText('Step 2: Options')
    await page.getByTestId('stepper-next').click()
    await expect(label).toHaveText('Step 3: Review')
    await expect(page.getByTestId('stepper-next')).toBeDisabled()

    await page.getByTestId('stepper-back').click()
    await expect(label).toHaveText('Step 2: Options')

    // completed step 1 is clickable via the indicator
    await page.getByTestId('stepper').getByRole('button').first().click()
    await expect(label).toHaveText('Step 1: Details')
  })

  test('reveal grid becomes visible on scroll', async ({ page }) => {
    const grid = page.getByTestId('reveal-grid')
    await grid.scrollIntoViewIfNeeded()
    await expect(grid).toHaveClass(/is-visible/)
  })
})
