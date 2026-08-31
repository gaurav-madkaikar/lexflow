export const THEME_STORAGE_KEY = 'lexflow-theme';

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Keep the choice in memory when browser storage is unavailable.
  }
}

export function resolveTheme({ storedTheme, prefersDark }) {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  return prefersDark ? 'dark' : 'light';
}

export function createThemeController({
  root,
  storage,
  mediaQuery,
  themeColor,
  controls = [],
  isLoginVisible = () => false,
}) {
  let explicitChoice = safeGet(storage, THEME_STORAGE_KEY);
  let selected = resolveTheme({ storedTheme: explicitChoice, prefersDark: mediaQuery.matches });

  function syncControls() {
    const dark = selected === 'dark';
    for (const control of controls) {
      control.setPressed(String(dark));
      control.setLabel(dark ? 'Light mode' : 'Dark mode');
      control.setAriaLabel(dark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    themeColor?.setContent(isLoginVisible() || dark ? '#05070b' : '#fbfbfa');
  }

  function apply(theme, { persist = true } = {}) {
    selected = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = selected;
    root.classList.toggle('dark', selected === 'dark');
    if (persist) {
      explicitChoice = selected;
      safeSet(storage, THEME_STORAGE_KEY, selected);
    }
    syncControls();
    return selected;
  }

  function onOsChange(event) {
    if (explicitChoice === 'light' || explicitChoice === 'dark') return;
    apply(event.matches ? 'dark' : 'light', { persist: false });
  }

  mediaQuery.addEventListener?.('change', onOsChange);
  apply(selected, { persist: false });

  return {
    current: () => selected,
    apply,
    toggle: () => apply(selected === 'dark' ? 'light' : 'dark'),
    syncControls,
    destroy: () => mediaQuery.removeEventListener?.('change', onOsChange),
  };
}
