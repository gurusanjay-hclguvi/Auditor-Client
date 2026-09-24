import { useState } from 'react'

// Which table columns (by label) the viewer has hidden. Remembered in this browser only; if
// storage is blocked the choice just lasts until reload.
function load(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function save(storageKey, hidden) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(hidden))
  } catch {
    // Storage blocked: keep the choice in memory only.
  }
}

export function useColumnVisibility(storageKey) {
  const [hidden, setHidden] = useState(() => load(storageKey))

  const update = (next) => {
    setHidden(next)
    save(storageKey, next)
  }

  return {
    isVisible: (label) => !hidden.includes(label),
    toggle: (label) =>
      update(hidden.includes(label) ? hidden.filter((item) => item !== label) : [...hidden, label]),
    showAll: () => update([]),
  }
}
