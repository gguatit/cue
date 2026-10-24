import { Button, Card } from '../../components/ui'
import { errorPair, useT } from '../../i18n'
import { openExternal } from '../../lib/tauri'
import { useAnswer } from '../../stores/answer'
import { ERROR_CODES, SECTIONS } from './helpContent'

const TEST_EXAM_URL = 'https://github.com/gguatit/cue/raw/main/docs/test-exam.html'

export default function HelpTab() {
  const t = useT()
  return (
    <div className="space-y-4 text-sm">
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-zinc-100">
          {t('Test exam', '테스트 시험지')}
        </h3>
        <p className="mb-3 text-zinc-400">
          {t(
            'Download the practice exam from the Cue GitHub repository. It covers choice, OX, short, descriptive, calculation, code and reading questions.',
            'Cue GitHub 저장소에서 연습 시험지를 다운로드합니다. 객관식, OX, 단답형, 서술형, 계산, 코드, 독해 문제를 포함합니다.',
          )}
        </p>
        <Button
          onClick={() =>
            void openExternal(TEST_EXAM_URL).catch(() => {
              void useAnswer.getState().logError('link')
            })
          }
        >
          {t('Download test exam', '테스트 시험지 다운로드')}
        </Button>
      </Card>
      {SECTIONS.map((s, i) => (
        <Card key={i}>
          <h3 className="mb-2 text-sm font-semibold text-zinc-100">{t(...s.title)}</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-zinc-400">
            {s.bullets.map((b, j) => (
              <li key={j}>{t(...b)}</li>
            ))}
          </ul>
        </Card>
      ))}
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-zinc-100">
          {t('Error messages', '오류 메시지')}
        </h3>
        <dl className="space-y-1.5">
          {ERROR_CODES.map((c) => (
            <div key={c} className="flex gap-2">
              <dt className="w-32 shrink-0 font-mono text-xs leading-5 text-zinc-500">{c}</dt>
              <dd className="text-zinc-400">{t(...errorPair(c))}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
