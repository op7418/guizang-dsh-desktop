/** Shared open-state controller for the plugin's toggle and docked-sidebar entries. */

export interface WorktreePanelState { readonly open: boolean }

/** Observable open state shared by the Worktree header control and right sidebar. */
export class WorktreePanelController {
  private state: WorktreePanelState = { open: false }
  private readonly listeners = new Set<() => void>()

  constructor(private readonly onOpenChange: (open: boolean) => void = () => {}) {}

  /**
   * Read the current sidebar visibility.
   * @returns the current sidebar visibility snapshot.
   */
  getSnapshot = (): WorktreePanelState => this.state
  /**
   * Subscribe to sidebar visibility changes.
   * @param listener - callback invoked after the open state changes.
   * @returns disposer that removes the callback.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  /** Toggle the sidebar from its current visibility. */
  toggle = (): void => { this.setOpen(!this.state.open) }
  /** Close the sidebar without affecting the selected Workspace. */
  close = (): void => { this.setOpen(false) }

  private setOpen(open: boolean): void {
    if (this.state.open === open) return
    this.state = { open }
    this.onOpenChange(open)
    for (const listener of this.listeners) listener()
  }
}
