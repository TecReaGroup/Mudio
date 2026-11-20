import type { Point, Rectangle } from 'electron';

// Must fit src/feature/tray/tray-menu.tsx: two h-8 items, a separator, padding, border and the p-3 shadow gutter.
// The gutter also keeps the visible card clear of the taskbar the window is placed against.
export const TRAY_MENU_SIZE = { width: 188, height: 107 } as const;

type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The taskbar holding the tray icon lies along the display edge nearest to it. */
function nearestEdge(display: Rectangle, point: Point): ScreenEdge {
  const distances: [ScreenEdge, number][] = [
    ['top', point.y - display.y],
    ['bottom', display.y + display.height - point.y],
    ['left', point.x - display.x],
    ['right', display.x + display.width - point.x],
  ];
  return distances.reduce((nearest, candidate) => (candidate[1] < nearest[1] ? candidate : nearest))[0];
}

/** Bounds right next to the tray icon on the side facing away from the taskbar, so the menu never overlaps it. */
export function placeTrayMenu(trayBounds: Rectangle, display: Rectangle): Rectangle {
  const { width, height } = TRAY_MENU_SIZE;
  const center = { x: trayBounds.x + trayBounds.width / 2, y: trayBounds.y + trayBounds.height / 2 };
  const centeredX = clamp(center.x - width / 2, display.x, display.x + display.width - width);
  const centeredY = clamp(center.y - height / 2, display.y, display.y + display.height - height);
  const origin: Record<ScreenEdge, Point> = {
    bottom: { x: centeredX, y: trayBounds.y - height },
    top: { x: centeredX, y: trayBounds.y + trayBounds.height },
    left: { x: trayBounds.x + trayBounds.width, y: centeredY },
    right: { x: trayBounds.x - width, y: centeredY },
  };
  const { x, y } = origin[nearestEdge(display, center)];
  return { x: Math.round(x), y: Math.round(y), width, height };
}
