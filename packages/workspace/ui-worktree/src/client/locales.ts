/** Locale namespace registered by the Worktree client plugin. */
export const NS = 'worktree'

/** Simplified Chinese Worktree strings. */
export const zh = {
  'toggle': '文件树',
  'panel.title': '文件树',
  'panel.empty': '选择一个项目后即可浏览文件。',
  'panel.loading': '正在读取目录…',
  'panel.error': '文件操作失败',
  'panel.files': '个文件',
  'summary.branch': '分支',
  'action.close': '关闭文件树',
  'action.refresh': '刷新',
  'action.newFile': '新建文件',
  'action.newFolder': '新建文件夹',
  'action.more': '{name} 的更多操作',
  'action.openFile': '打开文件',
  'action.openFolder': '打开文件夹',
  'action.addToInput': '将路径添加到输入框',
  'action.rename': '重命名',
  'form.filePlaceholder': '文件名',
  'form.folderPlaceholder': '文件夹名',
  'form.renamePlaceholder': '新名称',
  'form.create': '创建',
  'form.save': '保存',
  'form.cancel': '取消',
} as const

/** English Worktree strings kept structurally aligned with the Chinese source. */
export const en: Record<keyof typeof zh, string> = {
  'toggle': 'Files',
  'panel.title': 'Files',
  'panel.empty': 'Choose a project to browse its files.',
  'panel.loading': 'Reading directory…',
  'panel.error': 'File operation failed',
  'panel.files': 'files',
  'summary.branch': 'Branch',
  'action.close': 'Close file tree',
  'action.refresh': 'Refresh',
  'action.newFile': 'New file',
  'action.newFolder': 'New folder',
  'action.more': 'More actions for {name}',
  'action.openFile': 'Open file',
  'action.openFolder': 'Open folder',
  'action.addToInput': 'Add path to input',
  'action.rename': 'Rename',
  'form.filePlaceholder': 'File name',
  'form.folderPlaceholder': 'Folder name',
  'form.renamePlaceholder': 'New name',
  'form.create': 'Create',
  'form.save': 'Save',
  'form.cancel': 'Cancel',
}

/** Locale keys accepted by Worktree slot components. */
export type WorktreeKey = keyof typeof zh
