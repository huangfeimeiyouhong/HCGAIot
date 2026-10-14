/**
 * @param {string} path
 * @returns {Boolean}
 */
export function isExternal(path: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(path);
}

/**
 * @param {string} url
 * @returns {Boolean}
 */
export function validURL(url: string): boolean {
  // eslint-disable-next-line
  const reg = /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/
  return reg.test(url);
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validLowerCase(str: string): boolean {
  const reg = /^[a-z]+$/;
  return reg.test(str);
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validUpperCase(str: string): boolean {
  const reg = /^[A-Z]+$/;
  return reg.test(str);
}

/**
 * @param {string} str
 * @returns {Boolean}
 */
export function validAlphabets(str: string): boolean {
  const reg = /^[A-Za-z]+$/;
  return reg.test(str);
}

/**
 * @param {string} email
 * @returns {Boolean}
 */
export function validEmail(email: string): boolean {
  // eslint-disable-next-line
  const reg = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return reg.test(email);
}

/**
 * @description: 检验是否有换行标识的正则
 */
export const wrapReg = /(\n)+|(\r\n)+/g;

/**
 * @description: 基础判断
 * @param {any} v
 * @return {*}
 */
export function isUndef(v: unknown): unknown {
  return v === undefined || v === null;
}

/**
 * @description: 检查是否是原始值
 * @param {*} value
 * @return {*}
 */
export function isPrimitive(value: unknown): boolean {
  return (
    typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'symbol'
    || typeof value === 'boolean'
  );
}

/**
 * @description: 快速检查对象
 * @return {*}
 */
export function isObject(obj: unknown): boolean {
  return obj !== null && typeof obj === 'object';
}

/**
 * @description: 获取值的原始类型字符串
 * @param {any} value
 * @return {*}
 */
const _toString = Object.prototype.toString;
export function toRawType(value: unknown): string {
  return _toString.call(value).slice(8, -1);
}

/**
 * @description: 严格的对象类型检查
 * @param {*} obj
 * @return {*}
 */
export function isPlainObject(obj: unknown): boolean {
  return _toString.call(obj) === '[object Object]';
}

/**
 * @description: 严格的数组类型检查
 * @param {any} obj
 * @return {*}
 */
export function isPlainArray(obj: unknown): boolean {
  return _toString.call(obj) === '[object Array]';
}

/**
 * @description: 严格的正则类型检查
 * @param {any} v
 * @return {*}
 */
export function isRegExp(v: unknown): boolean {
  return _toString.call(v) === '[object RegExp]';
}

/**
 * @description: 值转换为数字以进行持久化
 * @param {any} val
 * @return {*}
 */
export function toNumber(val: string): any {
  const n = parseFloat(val);
  return isNaN(n) ? val : n;
}
