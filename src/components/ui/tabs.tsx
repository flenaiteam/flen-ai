"use client"

import * as React from "react"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

type TabsOrientation = "horizontal" | "vertical"

type TabsContextValue = {
  orientation: TabsOrientation
  activeValue: string | undefined
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  return React.useContext(TabsContext)
}

function Tabs({
  className,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  ...props
}: TabsPrimitive.Root.Props) {
  const isControlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(() => {
    return defaultValue !== undefined ? String(defaultValue) : undefined
  })

  const activeValue = isControlled ? (value !== undefined ? String(value) : undefined) : uncontrolledValue

  const handleValueChange = (v: any, event: any) => {
    if (!isControlled) setUncontrolledValue(v !== undefined ? String(v) : undefined)
    onValueChange?.(v, event)
  }

  return (
    <TabsContext.Provider value={{ orientation, activeValue }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
        value={value as any}
        defaultValue={isControlled ? undefined : (defaultValue as any)}
        onValueChange={handleValueChange as any}
        {...props}
      />
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative isolate inline-flex w-fit items-center justify-center rounded-md p-1 text-muted-foreground overflow-hidden group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none bg-[var(--bg-subtle)]",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const ctx = useTabsContext()
  const listRef = React.useRef<React.ElementRef<typeof TabsPrimitive.List> | null>(null)
  const [indicator, setIndicator] = React.useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  const measure = React.useCallback(() => {
    const listEl = listRef.current
    if (!listEl) return

    const listRect = listEl.getBoundingClientRect()

    const activeValue = ctx?.activeValue
    if (activeValue) {
      const byValue =
        listEl.querySelector<HTMLElement>(`[data-slot="tabs-trigger"][value="${activeValue}"]`) ??
        listEl.querySelector<HTMLElement>(`[role="tab"][value="${activeValue}"]`) ??
        listEl.querySelector<HTMLElement>(`[data-value="${activeValue}"]`)

      if (byValue) {
        const byValueRect = byValue.getBoundingClientRect()
        setIndicator({
          left: byValueRect.left - listRect.left,
          top: byValueRect.top - listRect.top,
          width: byValueRect.width,
          height: byValueRect.height,
        })
        return
      }
    }

    const activeEl =
      listEl.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-active]') ??
      listEl.querySelector<HTMLElement>("[data-active]") ??
      listEl.querySelector<HTMLElement>('[aria-selected="true"]') ??
      listEl.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')

    const targetEl =
      activeEl ??
      listEl.querySelector<HTMLElement>('[data-slot="tabs-trigger"]') ??
      listEl.querySelector<HTMLElement>('[role="tab"]')

    if (!targetEl) return

    const targetRect = targetEl.getBoundingClientRect()
    setIndicator({
      left: targetRect.left - listRect.left,
      top: targetRect.top - listRect.top,
      width: targetRect.width,
      height: targetRect.height,
    })
  }, [ctx?.activeValue])

  React.useLayoutEffect(() => {
    measure()

    const listEl = listRef.current
    if (!listEl) return

    const ro = new ResizeObserver(() => measure())
    ro.observe(listEl)
    window.addEventListener("resize", measure)

    return () => {
      window.removeEventListener("resize", measure)
      ro.disconnect()
    }
  }, [measure, ctx?.activeValue, ctx?.orientation])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "default" && indicator && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-0 rounded-md bg-soft-brand-bg/70 border border-soft-brand-border/60 shadow-sm transition-[left,top,width,height] duration-200 ease-out"
          style={{
            left: indicator.left,
            top: indicator.top,
            width: indicator.width,
            height: indicator.height,
          }}
        />
      )}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "rounded-md text-sm relative z-10 inline-flex items-center justify-start text-left",
        "gap-2 px-2 py-1.5 whitespace-nowrap transition-colors",
        "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]",
        "data-active:bg-soft-brand-bg data-active:text-soft-brand-text data-active:font-medium",
        "data-active:hover:bg-soft-brand-bg data-active:active:bg-soft-brand-bg",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
