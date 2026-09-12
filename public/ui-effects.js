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
        opacity: { from: 0, to: 1 },
        translateY: { from: options.translateY ?? 10, to: 0 },
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
    taskSummary(dialog, metrics) {
      const shell = canRun([dialog], 'task-summary');
      const cards = canRun(metrics, 'task-summary-cards');
      if (!shell) return false;
      requestFrame(() => {
        runAnimation(shell, {
          opacity: { from: 0 },
          scale: { from: 0.96 },
          translateY: { from: 14 },
          duration: 420,
          ease: 'out(4)',
        });
        if (cards) runAnimation(cards, {
          opacity: { from: 0 },
          translateY: { from: 12 },
          delay: stagger(90),
          duration: 480,
          ease: 'out(4)',
        });
      });
      return true;
    },
    vacationPanel(panel, sections, signature) {
      // Workspace owns the panel entrance. Animating the same shell twice can
      // capture the other animation's zero opacity as the final value.
      const items = canRun(sections, 'vacation-panel-sections', signature);
      if (!items) return false;
      requestFrame(() => {
        runAnimation(items, {
          opacity: { from: 0, to: 1 },
          translateY: { from: 12, to: 0 },
          delay: stagger(65),
          duration: 500,
          ease: 'out(4)',
        });
      });
      return true;
    },
    vacationBriefing(dialog, items) {
      const shell = canRun([dialog], 'vacation-briefing-shell');
      const rows = canRun(items, 'vacation-briefing-items');
      if (!shell) return false;
      requestFrame(() => {
        runAnimation(shell, {
          opacity: { from: 0, to: 1 },
          scale: { from: 0.965, to: 1 },
          translateY: { from: 18, to: 0 },
          duration: 480,
          ease: 'out(4)',
        });
        if (rows) runAnimation(rows, {
          opacity: { from: 0, to: 1 },
          translateX: { from: 16, to: 0 },
          delay: stagger(75),
          duration: 520,
          ease: 'out(4)',
        });
      });
      return true;
    },
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
