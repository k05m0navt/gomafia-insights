import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const fixturesDir = path.resolve(__dirname, './fixtures')
const stats = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'stats.json'), 'utf8'))
const charts = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'charts.json'), 'utf8'))
const activity = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'activity.json'), 'utf8'))

test('dashboard preview smoke - OverviewCards and RecentActivity present', async ({ page }) => {
  // Intercept API routes and return deterministic fixtures
  await page.route('**/api/dashboard/stats', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stats),
    })
  })

  await page.route('**/api/dashboard/charts**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(charts),
    })
  })

  await page.route('**/api/dashboard/activity**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activity),
    })
  })

  // Navigate to base URL provided by Playwright/CI (PREVIEW_URL), Playwright uses baseURL
  await page.goto('/')

  // Wait for the Overview heading or known text
  await expect(page.locator('text=Overview')).toBeVisible()

  // Verify Quick Stats 'Total players' derived from stats fixture
  const formattedTotalPlayers = new Intl.NumberFormat('en-US').format(stats.totalPlayers)
  await expect(page.locator(`text=${formattedTotalPlayers}`)).toBeVisible()

  // Verify Recent Activity header is visible
  await expect(page.locator('text=Recent Activity')).toBeVisible()

  // Verify at least one default activity title from fixture is visible
  await expect(page.locator(`text=${activity.activities[0].title}`)).toBeVisible()
})
