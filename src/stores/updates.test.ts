import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tauri', () => ({
  isTauri: () => true,
  checkUpdate: vi.fn(),
  installUpdate: vi.fn(),
  onUpdateProgress: vi.fn(),
}))

import { checkUpdate } from '../lib/tauri'
import { UPDATE_CHECK_KEY } from '../lib/updates'
import { useSettings } from './settings'
import { maybeCheckForUpdates, useUpdates } from './updates'

const mockedCheck = vi.mocked(checkUpdate)

beforeEach(() => {
  localStorage.clear()
  mockedCheck.mockReset()
  useSettings.setState({ updates: { autoCheck: true } })
  useUpdates.setState({
    checking: false,
    installing: false,
    available: null,
    progress: null,
    error: '',
    checked: false,
  })
})

describe('maybeCheckForUpdates', () => {
  it('does not record a failed check', async () => {
    mockedCheck.mockRejectedValueOnce(new Error('offline'))

    await maybeCheckForUpdates()

    expect(localStorage.getItem(UPDATE_CHECK_KEY)).toBeNull()
  })

  it('records a successful check', async () => {
    mockedCheck.mockResolvedValueOnce(null)

    await maybeCheckForUpdates()

    expect(localStorage.getItem(UPDATE_CHECK_KEY)).not.toBeNull()
  })
})
