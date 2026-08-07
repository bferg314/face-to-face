import { test, expect } from '@playwright/test';

const GAMES = [
  { name: 'Checkers', sections: ['Moving', 'Capturing', 'Kings', 'Winning'] },
  { name: 'Reversi', sections: ['Placing discs', 'Flipping', 'Passing', 'Winning'] },
  { name: 'Mancala', sections: ['Sowing', 'Extra turns', 'Capturing', 'Winning'] },
  {
    name: 'Ultimate Tic-Tac-Toe',
    sections: ['Placing marks', 'Where you must play', 'Free moves', 'Winning'],
  },
  {
    name: 'Dots & Boxes',
    sections: ['Drawing lines', 'Claiming boxes', 'Extra turns', 'Winning'],
  },
  {
    name: 'Chess',
    sections: ['Moving', 'Special moves', 'Check & checkmate', 'Winning'],
  },
  {
    name: 'Quoridor',
    sections: ['Your turn', 'Walls', 'Winning'],
  },
  {
    name: 'Nine Men’s Morris',
    sections: ['Placing', 'Moving', 'Mills', 'Winning'],
  },
];

for (const { name, sections } of GAMES) {
  test(`${name}: help opens from the rail, lists the rules, and closes`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(name, 'i') }).click();

    await page.getByRole('button', { name: 'How to play' }).click();
    const modal = page.locator('.help-modal');
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole('heading', { name: `How to play ${name}` }),
    ).toBeVisible();
    for (const heading of sections) {
      await expect(modal.getByText(heading, { exact: true })).toBeVisible();
    }

    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(modal).not.toBeVisible();

    expect(errors).toEqual([]);
  });
}
