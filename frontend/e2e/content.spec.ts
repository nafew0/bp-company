import { test, expect } from '@playwright/test'

test.describe('BP-3 demo site (content-driven home, shell, contact)', () => {
  test('home renders all CMS-driven sections from the demo seed', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('hero-headline')).toBeVisible()

    const cards = page.getByTestId('service-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(3)

    await expect(page.getByTestId('testimonials-section')).toBeVisible()
    await expect(page.getByTestId('testimonial-card').first()).toBeVisible()

    await expect(page.getByTestId('faq-section')).toBeVisible()
    await expect(page.getByTestId('contact-section')).toBeVisible()
    // NAP from SiteConfig (single source of truth)
    await expect(page.getByTestId('contact-info')).toContainText('01700-000000')
    await expect(page.getByTestId('whatsapp-link')).toHaveAttribute('href', /wa\.me\/8801700000000/)
  })

  test('bengali home shows localized CMS content', async ({ page }) => {
    await page.goto('/bn')
    await expect(page.getByTestId('services-section')).toContainText('আমাদের সেবাসমূহ')
    await expect(page.getByTestId('service-card').first()).toBeVisible()
  })

  test('faq accordion expands on click', async ({ page }) => {
    await page.goto('/en')
    const firstItem = page.getByTestId('faq-accordion').locator('details').first()
    const answer = firstItem.locator('p')
    await expect(answer).not.toBeVisible()
    await firstItem.locator('summary').click()
    await expect(answer).toBeVisible()
  })

  test('map is click-to-load (no iframe before interaction)', async ({ page }) => {
    await page.goto('/en')
    await expect(page.getByTestId('map-iframe')).toHaveCount(0)
    await page.getByTestId('map-load-button').scrollIntoViewIfNeeded()
    await page.getByTestId('map-load-button').click()
    await expect(page.getByTestId('map-iframe')).toHaveCount(1)
  })

  test('contact form validates, submits, and locks after success', async ({ page }) => {
    await page.goto('/en')
    const form = page.getByTestId('contact-form')
    await form.scrollIntoViewIfNeeded()

    // client-side validation
    await page.getByTestId('contact-submit').click()
    await expect(form.getByRole('alert').first()).toBeVisible()

    await page.locator('#contact-name').fill('E2E Tester')
    await page.locator('#contact-phone').fill('01712345678')
    await page.locator('#contact-message').fill('Hello from the Playwright suite.')
    await page.getByTestId('contact-submit').click()

    await expect(page.getByTestId('contact-success')).toBeVisible()
    await expect(page.getByTestId('contact-form')).toHaveCount(0)
  })

  test('navbar anchors navigate; mobile drawer opens and closes', async ({ page }) => {
    await page.goto('/en')
    await page.getByTestId('site-navbar').getByRole('link', { name: 'FAQ' }).click()
    await expect(page).toHaveURL(/#faq$/)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId('navbar-menu-button').click()
    const drawer = page.getByTestId('navbar-drawer')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('link', { name: 'Contact', exact: true }).click()
    await expect(drawer).not.toBeVisible()
    await expect(page).toHaveURL(/#contact$/)
  })

  test('footer shows NAP and dynamic year', async ({ page }) => {
    await page.goto('/en')
    const footer = page.getByTestId('site-footer')
    await expect(footer).toContainText('Acme Services')
    await expect(footer).toContainText(String(new Date().getFullYear()))
  })

  test('sitemap and robots respond', async ({ page }) => {
    const sitemap = await page.goto('/sitemap.xml')
    expect(sitemap?.status()).toBe(200)
    expect(await sitemap?.text()).toContain('/en')
    const robots = await page.goto('/robots.txt')
    expect(robots?.status()).toBe(200)
    expect(await robots?.text()).toContain('Disallow: /admin')
  })
})
