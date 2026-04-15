import { cn } from "@/lib/utils"
import { useState, createContext, useContext } from "react"
const TabsCtx = createContext({})
export function Tabs({ defaultValue, children, className }) {
  const [active, setActive] = useState(defaultValue)
  return <TabsCtx.Provider value={{ active, setActive }}><div className={className}>{children}</div></TabsCtx.Provider>
}
export function TabsList({ className, children }) {
  return <div className={cn("inline-flex items-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>{children}</div>
}
export function TabsTrigger({ value, children, className }) {
  const { active, setActive } = useContext(TabsCtx)
  return (
    <button
      onClick={() => setActive(value)}
      className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        active === value ? "bg-background text-foreground shadow-sm" : "hover:text-foreground", className)}
    >
      {children}
    </button>
  )
}
export function TabsContent({ value, children, className }) {
  const { active } = useContext(TabsCtx)
  if (active !== value) return null
  return <div className={cn("mt-4", className)}>{children}</div>
}
