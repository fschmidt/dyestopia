/**
 * Reports every test that only passed because it was retried.
 *
 * Playwright retries twice under CI, which turns intermittency into a green
 * tick. A required check you have learned to re-run is worth nothing, so a pass
 * that needed a retry is written to the job summary and annotated as a warning
 * — visible without opening the log. That is what makes watching the suite
 * settle down something you can actually do, rather than something you assert.
 */
import { appendFileSync } from 'node:fs'

import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'

class FlakyReporter implements Reporter {
  private readonly flaky: { title: string; retry: number }[] = []

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed' && result.retry > 0) {
      this.flaky.push({ title: test.titlePath().filter(Boolean).join(' › '), retry: result.retry })
    }
  }

  onEnd() {
    const summary = process.env.GITHUB_STEP_SUMMARY

    if (this.flaky.length === 0) {
      if (summary) appendFileSync(summary, '\n### No retries — every test passed first time.\n')
      return
    }

    for (const { title, retry } of this.flaky) {
      process.stdout.write(`::warning title=Flaky::${title} (passed on retry ${retry})\n`)
    }

    if (summary) {
      const rows = this.flaky.map(({ title, retry }) => `| ${title} | ${retry} |`).join('\n')
      appendFileSync(
        summary,
        `\n### ${this.flaky.length} test(s) passed only on a retry\n\n` +
          '| Test | Passed on retry |\n| --- | --- |\n' +
          `${rows}\n`,
      )
    }
  }
}

export default FlakyReporter
