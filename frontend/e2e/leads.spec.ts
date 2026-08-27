import { test, expect, type Page } from '@playwright/test'
import { loginAsAdmin } from './helpers'

/**
 * BP-4: funnel → capture (attribution) → admin queue/kanban → respond loop.
 * Serial: later tests use the lead created by the first one.
 */
test.describe.serial('BP-4 leads (funnel → pipeline → respond)', () => {
  let reference = ''
  // Unique per run: defeats the capture idempotency window so every run
  // creates a fresh lead sitting in the "New" stage.
  const runTag = `e2e-${Date.now()}`

  async function openLeadDetail(page: Page) {
    await loginAsAdmin(page)
    await page.goto('/admin/leads')
    await page.getByPlaceholder(/search/i).fill(reference)
    await page.getByText(reference).first().click()
    await expect(page.getByTestId('whatsapp-button')).toBeVisible()
  }

  test('demo funnel captures a lead with attribution', async ({ page }) => {
    await page.goto('/en/f/demo?utm_source=meta&utm_campaign=bp4-e2e&fbclid=E2ECLICK123')
    await expect(page.getByTestId('funnel-headline')).toBeVisible()

    await page.locator('#lead-name').fill('Funnel Tester')
    await page.locator('#lead-phone').fill('01712-345678')
    await page.locator('#lead-email').fill('funnel-tester@example.com')
    await page.locator('#lead-message').fill(`E2E funnel submission ${runTag}.`)
    await page.getByTestId('leadform-submit').click()

    await expect(page).toHaveURL(/\/f\/demo\/thanks\?ref=/)
    await expect(page.getByTestId('funnel-thanks')).toBeVisible()
    const refText = await page.getByTestId('funnel-reference').textContent()
    reference = (refText ?? '').trim()
    expect(reference).toMatch(/^[A-Z]+-\d{6}-\d{5}$/)
    await expect(page.getByTestId('funnel-whatsapp')).toBeVisible()
  })

  test('admin: lead shows attribution, normalized WhatsApp link', async ({ page }) => {
    await openLeadDetail(page)

    const attribution = page.getByTestId('attribution-panel')
    await expect(attribution).toContainText('meta')
    await expect(attribution).toContainText('bp4-e2e')
    await expect(attribution).toContainText('E2ECLICK123')

    await expect(page.getByTestId('whatsapp-button')).toHaveAttribute(
      'href',
      /wa\.me\/8801712345678/
    )
  })

  test('kanban: lead sits in New and moves to Contacted', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/leads')
    await page.getByTestId('leads-view-board').click()
    await expect(page.getByTestId('leads-board')).toBeVisible()

    const card = page.getByTestId(`lead-card-${reference}`)
    await expect(page.getByTestId('board-column-new').getByTestId(`lead-card-${reference}`)).toBeVisible()
    await card.getByTestId('lead-move-select').selectOption('contacted')
    await expect(
      page.getByTestId('board-column-contacted').getByTestId(`lead-card-${reference}`)
    ).toBeVisible()
  })

  test('detail: terminal stage requires a reason; note composer works', async ({ page }) => {
    await openLeadDetail(page)

    await page.getByTestId('detail-stage-select').selectOption('lost')
    const dialog = page.getByTestId('stage-reason-dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('textarea').fill('Chose a competitor (e2e).')
    await dialog.getByRole('button', { name: /confirm|save|move/i }).click()
    await expect(page.getByTestId('detail-stage-chip')).toHaveText(/Lost/)
    await expect(page.locator('ol').getByText('Chose a competitor (e2e).')).toBeVisible()

    const composer = page.getByTestId('note-composer')
    await composer.locator('textarea').fill('Follow-up note from e2e.')
    await composer.getByRole('button', { name: /add/i }).click()
    await expect(page.locator('ol').getByText('Follow-up note from e2e.')).toBeVisible()
  })

  test('pipeline settings and dashboard widgets render', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/pipeline')
    // Stage names render as editable inputs; wait for them, then check values.
    await expect(page.locator('input').first()).toBeVisible()
    await expect
      .poll(async () =>
        page.locator('input').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))
      )
      .toEqual(
        expect.arrayContaining(['New', 'Contacted', 'Qualified', 'Booked', 'Won', 'Lost'])
      )

    await page.goto('/admin')
    const widget = page.getByTestId('dashboard-leads')
    await expect(widget).toBeVisible()
    await expect(widget).toContainText(/total/i)
  })
})
