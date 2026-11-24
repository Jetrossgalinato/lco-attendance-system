import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

type AppHeaderActionsProps = {
  onChangeMode: () => void
  onLoginClick: () => void
}

export function AppHeaderActions({
  onChangeMode,
  onLoginClick,
}: AppHeaderActionsProps) {
  return (
    <div className="header-actions-bar flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      <ModeToggle />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer border-transparent bg-transparent shadow-none hover:bg-muted/80"
        onClick={onChangeMode}
      >
        Change Mode
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="cursor-pointer shadow-[var(--shadow-1)]"
        onClick={onLoginClick}
      >
        Login
      </Button>
    </div>
  )
}
