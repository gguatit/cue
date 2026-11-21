import { Button, Group, SectionTitle } from '../../components/ui'
import { errorPair, useT } from '../../i18n'
import { openExternal } from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import { ERROR_CODES, SECTIONS } from './helpContent'

const TEST_SITE_URL = 'https://cue.neikos.kr'

export default function HelpTab() {
  const t = useT()
  return (
    <div className="space-y-4 text-sm">
      <Group className="p-4">
        <SectionTitle>{t('Test shortcut', '테스트 바로가기')}</SectionTitle>
        <p className="mb-3 mt-2 text-ink-2">
          {t(
            'Open Cue Test Lab in the browser to test capture, AI answers and watermarks. It covers choice, OX, short, descriptive, calculation, code and reading questions.',
            '브라우저에서 Cue Test Lab을 바로 열어 캡처, AI 답변, 워터마크를 테스트합니다. 객관식, OX, 단답형, 서술형, 계산, 코드, 독해 문제를 포함합니다.',
          )}
        </p>
        <Button
          onClick={() =>
            void openExternal(TEST_SITE_URL).catch(() => {
              void useAnswer.getState().logError('link')
            })
          }
        >
          {t('Open test site', '테스트 바로가기')}
        </Button>
      </Group>
      {SECTIONS.map((s, i) => (
        <Group key={i} className="p-4">
          <SectionTitle>{t(...s.title)}</SectionTitle>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-2">
            {s.bullets.map((b, j) => (
              <li key={j}>{t(...b)}</li>
            ))}
          </ul>
        </Group>
      ))}
      <Group className="p-4">
        <SectionTitle>{t('Error messages', '오류 메시지')}</SectionTitle>
        <dl className="mt-2 space-y-1.5">
          {ERROR_CODES.map((c) => (
            <div key={c} className="flex gap-2">
              <dt className="w-32 shrink-0 font-mono text-xs leading-5 text-ink-3">{c}</dt>
              <dd className="text-ink-2">{t(...errorPair(c))}</dd>
            </div>
          ))}
        </dl>
      </Group>
    </div>
  )
}
