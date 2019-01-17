const defineProperty = Object.defineProperty;

export function defineFinal<T, K extends string | symbol, U>(
  object: T,
  name: K,
  value: U
) {
  defineProperty(object, name, { value });
}
