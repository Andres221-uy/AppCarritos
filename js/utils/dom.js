export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return document.querySelectorAll(selector);
}

export function createElement(tag, className = "") {

  const el = document.createElement(tag);

  el.className = className;

  return el;
}