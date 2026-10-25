"use client";

/**
 * Accessible building blocks on Radix primitives (shadcn/ui style), themed with
 * Manara tokens. Radix handles focus, keyboard, screen readers and RTL; these
 * wrappers only add styling. Prefer these over hand-rolled menus and dialogs.
 */
import type { ComponentProps, ReactNode } from "react";
import {
  Accordion as AccordionPrimitive,
  Checkbox as CheckboxPrimitive,
  Dialog as DialogPrimitive,
  DropdownMenu as MenuPrimitive,
  Popover as PopoverPrimitive,
  RadioGroup as RadioGroupPrimitive,
  ScrollArea as ScrollAreaPrimitive,
  Select as SelectPrimitive,
  Separator as SeparatorPrimitive,
  Switch as SwitchPrimitive,
  Tabs as TabsPrimitive,
  ToggleGroup as ToggleGroupPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
import { Check, ChevronDown, Circle, X } from "lucide-react";
import { Toaster as SonnerToaster } from "sonner";
import { buttonClass, cn } from "./components";
import { useLocale, useT } from "./i18n-provider";
import { localeDir } from "./i18n";
import { BackToTop, SmoothScroll } from "./scroll";

const panel = "z-50 rounded-xl border border-line bg-surface text-ink shadow-[var(--shadow-lift)] outline-none";

/* ---------- Dialog & sheet ---------- */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in", className)} {...props} />;
}

/** A centred dialog (a bottom sheet on phones). */
export function DialogContent({ className, children, hideClose = false, ...props }: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-[var(--shadow-lift)] outline-none data-[state=open]:animate-slide-up",
          "sm:inset-x-auto sm:bottom-auto sm:start-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 sm:data-[state=open]:animate-pop-in sm:ltr:-translate-x-1/2 sm:rtl:translate-x-1/2",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && <CloseButton />}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** A panel sliding in from the side (menus, filters) — from the end side in RTL too. */
export function SheetContent({ className, children, side = "end", ...props }: ComponentProps<typeof DialogPrimitive.Content> & { side?: "start" | "end" }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(20rem,88vw)] flex-col gap-4 overflow-y-auto border-line bg-surface p-5 shadow-[var(--shadow-lift)] outline-none",
          side === "end" ? "end-0 border-s data-[state=open]:animate-slide-from-end" : "start-0 border-e data-[state=open]:animate-slide-from-start",
          className,
        )}
        {...props}
      >
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function CloseButton() {
  const t = useT();
  return (
    <DialogPrimitive.Close className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-3 hover:text-ink">
      <X className="h-4 w-4" />
      <span className="sr-only">{t("Close")}</span>
    </DialogPrimitive.Close>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-4 space-y-1 pe-8 text-start", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("font-display text-lg font-semibold text-heading", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-ink-muted", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

/* ---------- Dropdown menu ---------- */

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;
export const DropdownMenuSub = MenuPrimitive.Sub;

export function DropdownMenuContent({ className, sideOffset = 6, align = "end", ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content sideOffset={sideOffset} align={align} className={cn(panel, "min-w-48 p-1 data-[state=open]:animate-pop-in", className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

const itemClass = "relative flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0";

export function DropdownMenuItem({ className, inset, tone, ...props }: ComponentProps<typeof MenuPrimitive.Item> & { inset?: boolean; tone?: "danger" }) {
  return <MenuPrimitive.Item className={cn(itemClass, inset && "ps-8", tone === "danger" && "text-danger data-[highlighted]:bg-danger/10", className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemClass, "pe-8", className)} {...props}>
      {children}
      <MenuPrimitive.ItemIndicator className="absolute end-2.5">
        <Check className="text-brand-600 dark:text-brand-300" />
      </MenuPrimitive.ItemIndicator>
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn("px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger className={cn(itemClass, "data-[state=open]:bg-surface-2", className)} {...props}>
      {children}
      <ChevronDown className="ms-auto -rotate-90 rtl:rotate-90" />
    </MenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent className={cn(panel, "min-w-44 p-1", className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

/* ---------- Popover ---------- */

export const PopoverRoot = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({ className, sideOffset = 6, align = "end", ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content sideOffset={sideOffset} align={align} collisionPadding={12} className={cn(panel, "w-[min(22rem,calc(100vw-1.5rem))] p-2 data-[state=open]:animate-pop-in", className)} {...props} />
    </PopoverPrimitive.Portal>
  );
}

/* ---------- Tooltip ---------- */

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}>{children}</TooltipPrimitive.Provider>;
}

/** Wraps a single focusable element; shows `label` on hover and keyboard focus. */
export function Tooltip({ label, children, side = "top" }: { label: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-md bg-heading px-2 py-1 text-xs font-medium text-surface shadow-[var(--shadow-soft)] data-[state=delayed-open]:animate-fade-in">
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ---------- Form controls ---------- */

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-surface-3 transition-colors data-[state=checked]:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5 rtl:data-[state=checked]:-translate-x-4 rtl:data-[state=unchecked]:-translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border border-line bg-surface transition data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const RadioGroup = RadioGroupPrimitive.Root;
export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item className={cn("grid h-[18px] w-[18px] place-items-center rounded-full border border-line bg-surface data-[state=checked]:border-brand-600", className)} {...props}>
      <RadioGroupPrimitive.Indicator>
        <Circle className="h-2 w-2 fill-brand-600 text-brand-600" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

/**
 * Styled select that still posts with forms (`name`). Use `options` for the
 * common case; it renders a native-feeling list with keyboard search.
 */
export function SelectMenu({ options, placeholder, className, id, ...props }: ComponentProps<typeof SelectPrimitive.Root> & { options: { value: string; label: ReactNode }[]; placeholder?: string; className?: string; id?: string }) {
  const dir = localeDir(useLocale());
  return (
    <SelectPrimitive.Root dir={dir} {...props}>
      <SelectPrimitive.Trigger id={id} className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition hover:border-brand-300 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 data-[placeholder]:text-ink-muted", className)}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-ink-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} className={cn(panel, "max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden p-1 data-[state=open]:animate-pop-in")}>
          <SelectPrimitive.Viewport>
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={o.value} className={cn(itemClass, "pe-8")}>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute end-2.5">
                  <Check className="text-brand-600 dark:text-brand-300" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ---------- Layout ---------- */

export function Separator({ className, orientation = "horizontal", ...props }: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root orientation={orientation} className={cn("shrink-0 bg-line", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} {...props} />;
}

export function ScrollArea({ className, children, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex w-2 touch-none select-none p-0.5">
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-ink-muted/30" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}

/** In-page tabs (switch panels without navigating). For URL tabs use `Tabs`. */
export const TabsRoot = TabsPrimitive.Root;
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex h-10 items-center gap-1 rounded-xl bg-surface-3 p-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-muted transition data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
}
export const TabsContent = TabsPrimitive.Content;

export const ToggleGroup = ToggleGroupPrimitive.Root;
export function ToggleGroupItem({ className, ...props }: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn("inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-muted transition hover:text-ink data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
}

/** FAQ-style expanding sections. */
export const Accordion = AccordionPrimitive.Root;
export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-line", className)} {...props} />;
}
export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger className={cn("group flex flex-1 items-center justify-between gap-4 py-4 text-start text-sm font-semibold transition hover:text-brand-700 dark:hover:text-brand-300", className)} {...props}>
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden text-sm text-ink-muted data-[state=closed]:animate-collapse data-[state=open]:animate-expand" {...props}>
      <div className={cn("pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

/* ---------- Toasts ---------- */

export { toast } from "sonner";

/** Put once in each app's root layout; call `toast("Saved")` anywhere. */
export function Toaster() {
  const dir = localeDir(useLocale());
  return (
    <SonnerToaster
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      toastOptions={{ className: "!rounded-xl !border !border-line !bg-surface !text-ink !shadow-[var(--shadow-lift)] !font-sans" }}
    />
  );
}

/** Tooltip timing and the toast stack for a whole app (added by I18nRoot). */
export function UiProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SmoothScroll />
      {children}
      <BackToTop />
      <Toaster />
    </TooltipProvider>
  );
}

/**
 * Asks before a destructive or important action. Wrap the trigger button:
 * <ConfirmDialog title="Delete?" onConfirm={...}><Button>Delete</Button></ConfirmDialog>
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
  children,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent role="alertdialog" className="sm:w-[min(26rem,calc(100vw-2rem))]" hideClose>
        <DialogHeader className="pe-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose className={buttonClass("secondary")}>{t("Cancel")}</DialogClose>
          <DialogClose className={buttonClass(tone)} onClick={onConfirm}>
            {confirmLabel ?? t("Confirm")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
