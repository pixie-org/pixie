import '@testing-library/jest-dom';

// Polyfill for requestAnimationFrame
if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'undefined') {
  window.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
  };
}

if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'undefined') {
  window.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}
