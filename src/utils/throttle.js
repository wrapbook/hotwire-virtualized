export function throttle(func, wait, context = null) {
  context = context || this;
  let timer = null;

  return function (...args) {
    if (timer === null) {
      timer = setTimeout(() => {
        func.apply(context, args);
        timer = null;
      }, wait);
    }
  };
}
