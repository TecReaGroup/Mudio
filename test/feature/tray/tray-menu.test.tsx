import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TrayMenuApp } from '../../../src/app/TrayMenuApp';
import { installFakeMudio } from '../../support/fake-mudio';
import { buildSetting } from '../../support/fixture';

async function renderTrayMenu() {
  const user = userEvent.setup();
  render(<TrayMenuApp />);
  await screen.findAllByRole('button', { name: /Mudio/ });
  return user;
}

describe('tray menu', () => {
  it('opens the library', async () => {
    const fake = installFakeMudio();
    const user = await renderTrayMenu();

    await user.click(screen.getByRole('button', { name: 'Open Mudio' }));

    expect(fake.api.trayMenu.openLibrary).toHaveBeenCalledOnce();
    expect(fake.api.trayMenu.quit).not.toHaveBeenCalled();
  });

  it('quits the app', async () => {
    const fake = installFakeMudio();
    const user = await renderTrayMenu();

    await user.click(screen.getByRole('button', { name: 'Quit Mudio' }));

    expect(fake.api.trayMenu.quit).toHaveBeenCalledOnce();
  });

  it('follows the language setting', async () => {
    installFakeMudio({ setting: buildSetting({ language: 'zh-CN' }) });
    await renderTrayMenu();

    expect(screen.getByRole('button', { name: '打开 Mudio' })).toBeDefined();
    expect(screen.getByRole('button', { name: '退出 Mudio' })).toBeDefined();
  });
});
