/** Product identity, platform information, and desktop support actions. */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, CodePilotIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import css from './AboutSection.module.css'

interface PilotDesktopBridge {
  platform?: string
  versions?: { electron?: string; chrome?: string }
  showDataFolder?: () => Promise<boolean>
  copyDiagnostics?: () => Promise<boolean>
}

/** About section owner share and localized copy. */
export type AboutSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'settings'>

function bridge(): PilotDesktopBridge | undefined {
  return (globalThis as { pilotHarness?: PilotDesktopBridge }).pilotHarness
}

function platformName(platform: string | undefined): string {
  if (platform === 'darwin') return 'macOS'
  if (platform === 'win32') return 'Windows'
  if (platform === 'linux') return 'Linux'
  return 'Web'
}

/** Render the Pilot Harness product overview and support surface. */
export function AboutSection({ t }: AboutSectionProps): ReactNode {
  const desktop = bridge()
  const [copied, setCopied] = useState(false)

  const copyDiagnostics = (): void => {
    if (desktop?.copyDiagnostics === undefined) return
    void desktop.copyDiagnostics().then((ok) => {
      setCopied(ok)
      if (ok) setTimeout(() => { setCopied(false) }, 1_800)
    })
  }

  return (
    <div className={css.section}>
      <header className={css.pageHeader}>
        <h2>{t('about.nav')}</h2>
        <p>{t('about.intro')}</p>
      </header>

      <section className={css.heroCard}>
        <div className={css.brandMark} data-pilot-brand-mark="about" aria-hidden="true">
          <CodePilotIcon name="model" size={25} />
        </div>
        <div className={css.brandCopy}>
          <div className={css.brandHeading}>
            <h3>Pilot Harness</h3>
            <span>{t('about.preview')}</span>
          </div>
          <p>{t('about.description')}</p>
          <div className={css.capabilities}>
            <span>{t('about.capability.plugins')}</span>
            <span>{t('about.capability.models')}</span>
            <span>{t('about.capability.desktop')}</span>
          </div>
        </div>
      </section>

      <section className={css.infoCard}>
        <div className={css.cardHeader}>
          <CodePilotIcon name="about" size={17} />
          <div>
            <h3>{t('about.build.title')}</h3>
            <p>{t('about.build.description')}</p>
          </div>
        </div>
        <dl className={css.infoList}>
          <div><dt>{t('about.build.version')}</dt><dd>0.1.0 Preview</dd></div>
          <div><dt>{t('about.build.platform')}</dt><dd>{platformName(desktop?.platform)}</dd></div>
          <div><dt>{t('about.build.runtime')}</dt><dd>{desktop?.versions?.electron === undefined ? 'Web' : `Electron ${desktop.versions.electron}`}</dd></div>
          <div><dt>{t('about.build.core')}</dt><dd>DeepSeek Harness</dd></div>
        </dl>
      </section>

      <section className={css.infoCard}>
        <div className={css.cardHeader}>
          <CodePilotIcon name="server" size={17} />
          <div>
            <h3>{t('about.support.title')}</h3>
            <p>{t('about.support.description')}</p>
          </div>
        </div>
        <div className={css.actions}>
          {desktop?.showDataFolder === undefined
            ? null
            : (
              <Button variant="outline" size="sm" onClick={() => { void desktop.showDataFolder?.() }}>
                <CodePilotIcon name="folder_open" size={15} />
                {t('about.support.dataFolder')}
              </Button>
            )}
          {desktop?.copyDiagnostics === undefined
            ? null
            : (
              <Button variant="outline" size="sm" onClick={copyDiagnostics}>
                <CodePilotIcon name={copied ? 'success' : 'configuration'} size={15} />
                {t(copied ? 'about.support.copied' : 'about.support.copyDiagnostics')}
              </Button>
            )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.open('https://github.com/deepseek-ai/deepseek-harness', '_blank', 'noopener,noreferrer') }}
          >
            <CodePilotIcon name="external" size={15} />
            GitHub
          </Button>
        </div>
      </section>
    </div>
  )
}
