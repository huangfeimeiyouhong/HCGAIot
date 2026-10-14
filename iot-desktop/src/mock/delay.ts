/**
 * 延迟工具 —— 模拟网络往返（沿用 iot-cockpit api/iot.ts 写法）
 */

/**
 * 返回延迟 Promise
 * @param data 要返回的数据
 * @param ms 延迟毫秒，默认 200
 * @returns 延迟后 resolve 的 Promise
 */
export function delay<T>(data: T, ms = 200): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), ms);
  });
}

/**
 * 延迟执行无返回值任务
 * @param ms 延迟毫秒，默认 200
 */
export function wait(ms = 200): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}