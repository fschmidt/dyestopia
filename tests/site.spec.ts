import { expect, test } from '@playwright/test'

import { open } from './helpers'

test('publishes the website thumbnail for social previews', async ({ page }) => {
  await open(page)

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://dyestopia.fschmidts.net/thumbnail.png',
  )
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    'https://dyestopia.fschmidts.net/thumbnail.png',
  )

  const response = await page.request.get('/thumbnail.png')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/png')
})
