/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '返回',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'config.title': '配置文件',
  'config.description': '打开 Pilot Harness 当前使用的 settings.yaml，适合高级配置与插件参数。',
  'about.nav': '关于',
  'about.intro': '了解 Pilot Harness 的定位、运行环境与支持信息。',
  'about.preview': '预览版',
  'about.description': 'Pilot Harness 在不改变 DeepSeek Harness 插件核心的前提下，提供接近 CodePilot 的桌面体验、服务商管理和多模态模型工作流。',
  'about.capability.plugins': '一切皆插件',
  'about.capability.models': '多模型与多模态',
  'about.capability.desktop': 'macOS · Windows · Linux',
  'about.build.title': '版本与运行环境',
  'about.build.description': '提交问题或检查兼容性时可参考这些信息。',
  'about.build.version': '应用版本',
  'about.build.platform': '操作系统',
  'about.build.runtime': '桌面运行时',
  'about.build.core': '核心引擎',
  'about.support.title': '支持与诊断',
  'about.support.description': '打开本地数据目录、复制诊断信息或查看上游项目。',
  'about.support.dataFolder': '打开数据目录',
  'about.support.copyDiagnostics': '复制诊断信息',
  'about.support.copied': '已复制',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Back',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'config.title': 'Configuration file',
  'config.description': 'Open the settings.yaml used by Pilot Harness for advanced and plugin configuration.',
  'about.nav': 'About',
  'about.intro': 'Learn about Pilot Harness, its runtime, and support options.',
  'about.preview': 'Preview',
  'about.description': 'Pilot Harness keeps the DeepSeek Harness plugin core intact while adding a CodePilot-inspired desktop experience, provider management, and multimodal model workflows.',
  'about.capability.plugins': 'Everything is a plugin',
  'about.capability.models': 'Models and multimodal',
  'about.capability.desktop': 'macOS · Windows · Linux',
  'about.build.title': 'Version and runtime',
  'about.build.description': 'Use this information when reporting an issue or checking compatibility.',
  'about.build.version': 'App version',
  'about.build.platform': 'Platform',
  'about.build.runtime': 'Desktop runtime',
  'about.build.core': 'Core engine',
  'about.support.title': 'Support and diagnostics',
  'about.support.description': 'Open local app data, copy diagnostics, or view the upstream project.',
  'about.support.dataFolder': 'Open data folder',
  'about.support.copyDiagnostics': 'Copy diagnostics',
  'about.support.copied': 'Copied',
} satisfies Record<SettingsKey, string>
