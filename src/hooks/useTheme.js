import { useState, useEffect } from "react"

// theme: "light" | "system" | "dark"
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    root.classList.toggle("dark", prefersDark)
  } else {
    root.classList.toggle("dark", theme === "dark")
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("paceboard_theme") || "system")

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem("paceboard_theme", theme)
  }, [theme])

  // Re-apply when system preference changes (only relevant in "system" mode)
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  // Cycle: light → system → dark → light
  const cycle = () => setTheme(t => t === "light" ? "system" : t === "system" ? "dark" : "light")

  return { theme, setTheme, cycle }
}
