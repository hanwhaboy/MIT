(function () {
  "use strict";

  const displayEl = document.getElementById("display");
  const expressionEl = document.getElementById("expression");
  const keysEl = document.getElementById("keys");
  const themeToggle = document.getElementById("themeToggle");

  const THEME_KEY = "calculator-theme";

  /** Current operand being edited (no thousands separators). */
  let buffer = "0";
  let stored = null;
  let pendingOp = null;
  let freshInput = true;

  function formatNumber(n) {
    if (!Number.isFinite(n)) return "오류";
    const s = String(n);
    if (s.includes("e")) return s;
    const [intPart, frac = ""] = s.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return frac ? `${withCommas}.${frac}` : withCommas;
  }

  function parseBuffer() {
    return parseFloat(buffer, 10);
  }

  function maxDigitsReached(nextRaw) {
    const withoutDot = nextRaw.replace(".", "");
    return withoutDot.length > 12;
  }

  function bufferToDisplay() {
    if (buffer === "" || buffer === "-" || buffer === "-0") return buffer || "0";
    if (buffer.endsWith(".")) {
      const base = buffer.slice(0, -1);
      if (base === "" || base === "-") return buffer;
      const n = parseFloat(base, 10);
      return Number.isFinite(n) ? `${formatNumber(n)}.` : buffer;
    }
    const n = parseFloat(buffer, 10);
    return Number.isFinite(n) ? formatNumber(n) : buffer;
  }

  function updateExpression() {
    if (stored !== null && pendingOp) {
      const sym = { "+": "+", "-": "−", "*": "×", "/": "÷" }[pendingOp] || pendingOp;
      expressionEl.textContent = `${formatNumber(stored)} ${sym}`;
    } else {
      expressionEl.textContent = "";
    }
  }

  function render() {
    displayEl.textContent = bufferToDisplay();
    updateExpression();
  }

  function applyOp(a, b, op) {
    switch (op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  }

  function commitPending(withValue) {
    if (stored === null || !pendingOp) {
      stored = withValue;
      return;
    }
    stored = applyOp(stored, withValue, pendingOp);
  }

  function numberToBuffer(n) {
    if (!Number.isFinite(n)) return "0";
    const s = String(n);
    if (s.includes("e")) return s;
    return formatNumber(n).replace(/,/g, "");
  }

  function inputDigit(d) {
    if (freshInput) {
      buffer = d;
      freshInput = false;
    } else {
      let next;
      if (buffer === "0" && d !== "0") next = d;
      else if (buffer === "0" && d === "0") return;
      else if (buffer === "-0") next = "-".concat(d === "0" ? "0" : d);
      else next = buffer + d;
      if (maxDigitsReached(next)) return;
      buffer = next;
    }
    if (maxDigitsReached(buffer)) return;
    render();
  }

  function inputDecimal() {
    if (freshInput) {
      buffer = "0.";
      freshInput = false;
      render();
      return;
    }
    if (buffer.includes(".")) return;
    buffer += ".";
    render();
  }

  function clearAll() {
    buffer = "0";
    stored = null;
    pendingOp = null;
    freshInput = true;
    render();
  }

  function backspace() {
    if (freshInput) return;
    if (buffer.length <= 1) {
      buffer = "0";
      freshInput = true;
    } else {
      buffer = buffer.slice(0, -1);
    }
    render();
  }

  function setOperator(op) {
    const value = parseBuffer();
    if (stored !== null && pendingOp && !freshInput) {
      commitPending(value);
    } else {
      stored = value;
    }
    pendingOp = op;
    freshInput = true;
    buffer = numberToBuffer(stored);
    render();
  }

  function equals() {
    if (pendingOp === null || stored === null) return;
    const value = parseBuffer();
    const result = applyOp(stored, value, pendingOp);
    if (!Number.isFinite(result)) {
      buffer = "0";
      stored = null;
      pendingOp = null;
      freshInput = true;
      displayEl.textContent = "0으로 나눌 수 없음";
      expressionEl.textContent = "";
      return;
    }
    buffer = numberToBuffer(result);
    stored = null;
    pendingOp = null;
    freshInput = true;
    render();
  }

  keysEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const digit = btn.dataset.digit;
    if (digit !== undefined) {
      inputDigit(digit);
      return;
    }

    const op = btn.dataset.op;
    if (op) {
      setOperator(op);
      return;
    }

    const action = btn.dataset.action;
    if (action === "clear") clearAll();
    else if (action === "backspace") backspace();
    else if (action === "decimal") inputDecimal();
    else if (action === "equals") equals();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      inputDigit(e.key);
      return;
    }
    if (e.key === ".") {
      e.preventDefault();
      inputDecimal();
      return;
    }
    if (e.key === "+" || e.key === "-") {
      e.preventDefault();
      setOperator(e.key);
      return;
    }
    if (e.key === "*") {
      e.preventDefault();
      setOperator("*");
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      setOperator("/");
      return;
    }
    if (e.key === "Enter" || e.key === "=") {
      e.preventDefault();
      equals();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      clearAll();
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
    }
  });

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      document.documentElement.dataset.theme = saved;
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      document.documentElement.dataset.theme = "light";
    }
    syncThemeToggle();
  }

  function syncThemeToggle() {
    const isLight = document.documentElement.dataset.theme === "light";
    themeToggle.setAttribute("aria-pressed", String(isLight));
  }

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    syncThemeToggle();
  });

  initTheme();
  render();
})();
