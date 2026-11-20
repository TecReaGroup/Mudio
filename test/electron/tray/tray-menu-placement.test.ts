import { describe, expect, it } from 'vitest';
import { placeTrayMenu, TRAY_MENU_SIZE } from '../../../electron/tray/tray-menu-placement';

const DISPLAY = { x: 0, y: 0, width: 1920, height: 1080 };
const ICON_SIZE = 40;
const { width: MENU_WIDTH, height: MENU_HEIGHT } = TRAY_MENU_SIZE;

function trayIconAt(x: number, y: number) {
  return { x, y, width: ICON_SIZE, height: ICON_SIZE };
}

describe('tray menu placement', () => {
  it('opens above an icon on a bottom taskbar, centered on it', () => {
    const icon = trayIconAt(1500, 1040);

    expect(placeTrayMenu(icon, DISPLAY)).toEqual({
      x: Math.round(1520 - MENU_WIDTH / 2),
      y: 1040 - MENU_HEIGHT,
      width: MENU_WIDTH,
      height: MENU_HEIGHT,
    });
  });

  it('opens below an icon on a top taskbar', () => {
    const placed = placeTrayMenu(trayIconAt(1500, 0), DISPLAY);

    expect(placed.y).toBe(ICON_SIZE);
  });

  it('opens beside an icon on a left or right taskbar', () => {
    expect(placeTrayMenu(trayIconAt(0, 900), DISPLAY).x).toBe(ICON_SIZE);
    expect(placeTrayMenu(trayIconAt(1880, 900), DISPLAY).x).toBe(1880 - MENU_WIDTH);
  });

  it('stays on the display when the icon sits in its corner', () => {
    const placed = placeTrayMenu(trayIconAt(1880, 1040), DISPLAY);

    expect(placed.x).toBe(DISPLAY.width - MENU_WIDTH);
  });

  it('places relative to a secondary display left of the primary one', () => {
    const secondary = { x: -2560, y: 0, width: 2560, height: 1440 };

    const placed = placeTrayMenu(trayIconAt(-100, 1400), secondary);

    expect(placed).toEqual({ x: -MENU_WIDTH, y: 1400 - MENU_HEIGHT, width: MENU_WIDTH, height: MENU_HEIGHT });
  });
});
