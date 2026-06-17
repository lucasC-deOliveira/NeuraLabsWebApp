"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

const DropdownMenu = Menu.Root
const DropdownMenuTrigger = Menu.Trigger

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <Menu.Portal>{children}</Menu.Portal>
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = "end",
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Popup> &
  Pick<React.ComponentPropsWithoutRef<typeof Menu.Positioner>, "align" | "sideOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          className={cn(
            "z-50 min-w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuItem({
  className,
  inset,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Item> & { inset?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </Menu.Item>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuGroup({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Group>) {
  return <Menu.Group className={cn(className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
}
