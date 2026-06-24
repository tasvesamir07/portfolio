import '@testing-library/jest-dom';

globalThis.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(element) {
    if (this.callback) {
      this.callback([{ isIntersecting: true, target: element }]);
    }
  }
  unobserve() {}
  disconnect() {}
};
