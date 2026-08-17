const query = new URLSearchParams(location.search)
const state = query.get('state') ?? 'loading'
const message = query.get('message')

if (state === 'failed') {
  document.body.classList.add('failed')
  document.getElementById('title').textContent = 'Harness needs attention'
  document.getElementById('message').textContent = message || 'The local runtime stopped before the desktop client could connect.'
}

document.getElementById('restart').addEventListener('click', () => { void window.pilotHarness.restart() })
document.getElementById('data-folder').addEventListener('click', () => { void window.pilotHarness.showDataFolder() })
document.getElementById('copy-diagnostics').addEventListener('click', () => { void window.pilotHarness.copyDiagnostics() })
