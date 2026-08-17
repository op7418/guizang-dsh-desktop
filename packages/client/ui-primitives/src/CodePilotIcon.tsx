import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert02Icon,
  ArrowUp02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArchiveIcon,
  Attachment01Icon,
  Cancel01Icon,
  Chat01Icon,
  Clock01Icon,
  CollapseIcon,
  Copy01Icon,
  CubeIcon,
  Delete01Icon,
  File02Icon,
  FilterIcon,
  Configuration01Icon,
  Folder02Icon,
  FolderAddIcon,
  FolderOpenIcon,
  ArrowExpandIcon,
  GitBranchIcon,
  MoreHorizontalCircle01Icon,
  InformationCircleIcon,
  Layers01Icon,
  LinkSquare01Icon,
  PencilEdit01Icon,
  Plug02Icon,
  PlusSignIcon,
  PuzzleIcon,
  Robot01Icon,
  RefreshIcon,
  Search01Icon,
  ServerStack01Icon,
  Settings02Icon,
  SidebarLeft01Icon,
  SparklesIcon,
  StopIcon,
  Tick02Icon,
  ToolsIcon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import type { ComponentProps } from 'react'

type HugeIcon = ComponentProps<typeof HugeiconsIcon>['icon']

export type CodePilotIconName =
  | 'about'
  | 'archive'
  | 'assistant'
  | 'attachment'
  | 'back'
  | 'cancel'
  | 'chat'
  | 'clock'
  | 'collapse'
  | 'context'
  | 'configuration'
  | 'copy'
  | 'delete'
  | 'edit'
  | 'expand'
  | 'filter'
  | 'file'
  | 'folder'
  | 'folder_add'
  | 'folder_open'
  | 'git'
  | 'model'
  | 'more'
  | 'external'
  | 'plugin'
  | 'plus'
  | 'provider'
  | 'refresh'
  | 'search'
  | 'server'
  | 'settings'
  | 'send'
  | 'sidebar'
  | 'sparkles'
  | 'stop'
  | 'success'
  | 'tool'
  | 'user'
  | 'right'
  | 'warning'

const SEMANTIC_MAP: Record<CodePilotIconName, HugeIcon> = {
  about: InformationCircleIcon,
  archive: ArchiveIcon,
  assistant: Robot01Icon,
  attachment: Attachment01Icon,
  back: ArrowLeft01Icon,
  cancel: Cancel01Icon,
  chat: Chat01Icon,
  clock: Clock01Icon,
  collapse: CollapseIcon,
  context: Layers01Icon,
  configuration: Configuration01Icon,
  copy: Copy01Icon,
  delete: Delete01Icon,
  edit: PencilEdit01Icon,
  expand: ArrowExpandIcon,
  filter: FilterIcon,
  file: File02Icon,
  folder: Folder02Icon,
  folder_add: FolderAddIcon,
  folder_open: FolderOpenIcon,
  git: GitBranchIcon,
  model: CubeIcon,
  more: MoreHorizontalCircle01Icon,
  external: LinkSquare01Icon,
  plugin: PuzzleIcon,
  plus: PlusSignIcon,
  provider: Plug02Icon,
  refresh: RefreshIcon,
  search: Search01Icon,
  server: ServerStack01Icon,
  settings: Settings02Icon,
  send: ArrowUp02Icon,
  sidebar: SidebarLeft01Icon,
  sparkles: SparklesIcon,
  stop: StopIcon,
  success: Tick02Icon,
  tool: ToolsIcon,
  user: UserIcon,
  right: ArrowRight01Icon,
  warning: Alert02Icon,
}

export interface CodePilotIconProps {
  name: CodePilotIconName
  size?: number | undefined
  className?: string | undefined
  strokeWidth?: number | undefined
}

/** CodePilot's semantic HugeIcons layer for product-facing concepts. */
export function CodePilotIcon({
  name,
  size = 16,
  className,
  strokeWidth,
}: CodePilotIconProps) {
  return (
    <HugeiconsIcon
      icon={SEMANTIC_MAP[name]}
      size={size}
      {...(className === undefined ? {} : { className })}
      {...(strokeWidth === undefined ? {} : { strokeWidth })}
      aria-hidden="true"
    />
  )
}
