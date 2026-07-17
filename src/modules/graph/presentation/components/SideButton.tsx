import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Icon button for the graph's side rail: a tooltip on the right, optional
// active/ringed emphasis, and a disabled state (e.g. undo with nothing to undo).
export function SideButton({
  label,
  active = false,
  ringed = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  ringed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon"
            disabled={disabled}
            className={`size-8 text-primary ${active || ringed ? "ring-1 ring-primary/50" : ""}`}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
