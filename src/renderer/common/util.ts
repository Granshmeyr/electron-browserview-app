import * as ch from "../../common/channels";

export let editMode: boolean = false;
export const editMargin: number = -20;
export const editShrinkMs: number = 250;

export function setEditMode(value: boolean) {
  editMode = value;
}
// https://decipher.dev/30-seconds-of-typescript/docs/throttle/
export function throttle(fn: (...args: unknown[]) => unknown, wait: number = 300) {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;
  return function (this: unknown, ...args: unknown[]) {
    if (!inThrottle) {
      fn.apply(this, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(function (this: unknown) {
        if (Date.now() - lastTime >= wait) {
          fn.apply(this, args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
}
// https://stackoverflow.com/questions/1484506/random-color-generator#comment18632055_5365036
export function randomColor() {
  return "#" + ("00000"+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
}
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}
export function interpRectangleAsync(
  id: string,
  initialRect: Electron.Rectangle,
  targetRect: Electron.Rectangle,
  ms: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    const startTime = Date.now();
    function update() {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const t = Math.min(1, elapsedTime / ms);
      const newBounds: Electron.Rectangle = {
        x: Math.round(lerp(initialRect.x, targetRect.x, t)),
        y: Math.round(lerp(initialRect.y, targetRect.y, t)),
        width: Math.round(lerp(initialRect.width, targetRect.width, t)),
        height: Math.round(lerp(initialRect.height, targetRect.height, t))
      };
      window.electronAPI.send(ch.setViewRectangle, id, newBounds);
      if (t < 1) {
        requestAnimationFrame(update);
      }
      else {
        window.electronAPI.send(ch.setViewRectangle, id, targetRect);
        resolve();
      }
    }
    update();
  });
}
export function marginizeRectangle(
  rectangle: Electron.Rectangle,
  margin: number
): Electron.Rectangle {
  if (!isRectangleValid(rectangle)) {
    return { height: 100, width: 100, x: 10, y: 10 };
  }
  const newRect =  {
    height: rectangle.height + (margin * 2),
    width: rectangle.width + (margin * 2),
    x: rectangle.x - margin,
    y: rectangle.y - margin
  };
  return newRect;
}
export function isRectangleValid(rectangle: Electron.Rectangle): boolean {
  const numbers: number[] = [rectangle.height, rectangle.width, rectangle.x, rectangle.y];
  for (let i = 1; i < numbers.length; i++) {
    if (!(Number.isInteger(numbers[i]))) {
      console.error("Rectangle contains non-integer.");
      return false;
    }
  }
  return true;
}
export function fpsToMs(fps: number): number {
  return 1000 / fps;
}
export function rectToString(rectangle: Electron.Rectangle): string {
  return `{ height: ${rectangle.height}, width: ${rectangle.width}, ` +
  `x: ${rectangle.x}, y: ${rectangle.y} }`;
}
export function compareRects(
  first: Electron.Rectangle,
  second: Electron.Rectangle
): boolean {
  function rectToArray(rect: Electron.Rectangle): number[] {
    return [rect.height, rect.width, rect.x, rect.y];
  }
  const firstValues: number[] = rectToArray(first);
  const secondValues: number[] = rectToArray(second);
  return firstValues.every((value, i) => value === secondValues[i]);

}