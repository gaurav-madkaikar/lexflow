export function createUiEffects({ animate, stagger, reducedMotion, requestFrame }) {
  const signatures = new Map();
  let loginPlayed = false;

  function canRun(targets, key, signature) {
    const items = Array.from(targets ?? []).filter(Boolean);
    for (const item of items) {
      if (item.style) {
        item.style.opacity = '';
        item.style.transform = '';
      }
    }
    if (!items.length || reducedMotion.matches) return null;
    if (signature !== undefined && signatures.get(key) === signature) return null;
    if (signature !== undefined) signatures.set(key, signature);
    return items;
  }

  function runAnimation(targets, options) {
    try {
      animate(targets, options);
      return true;
    } catch {
      return false;
    }
  }

  function reveal(targets, key, signature, options = {}) {
    const items = canRun(targets, key, signature);
    if (!items) return false;
    try {
      requestFrame(() => runAnimation(items, {
        opacity: { from: 0 },
        translateY: { from: options.translateY ?? 10 },
        delay: stagger(options.stagger ?? 45),
        duration: options.duration ?? 420,
        ease: 'out(4)',
      }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    login(targets) {
      if (loginPlayed) return false;
      loginPlayed = true;
      return reveal(targets, 'login', 'visible', { stagger: 75, duration: 620, translateY: 18 });
    },
    workspace: (targets, view) => reveal(targets, 'workspace', view),
    emailList: (targets, signature) => reveal(targets, 'email-list', signature, { stagger: 35 }),
    emailDetail: targets => reveal(targets, 'email-detail', undefined, { stagger: 45 }),
    metrics: (targets, signature) => reveal(targets, 'metrics', signature, { stagger: 50 }),
    accountMenu(target) {
      const items = canRun([target], 'account-menu');
      if (!items) return false;
      return runAnimation(items, {
        opacity: { from: 0 },
        scale: { from: 0.97 },
        duration: 220,
        ease: 'out(4)',
      });
    },
    themeToggle(target) {
      const items = canRun([target], 'theme-toggle');
      if (!items) return false;
      return runAnimation(items, {
        scale: [{ to: 1.08 }, { to: 1 }],
        duration: 360,
        ease: 'out(4)',
      });
    },
    pointerSpotlight(card, event) {
      if (reducedMotion.matches || event.pointerType === 'touch') return false;
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
      return true;
    },
    reset() {
      signatures.clear();
      loginPlayed = false;
    },
  };
}
