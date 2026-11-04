import { useState } from 'react'
import CursorIntro from '@/components/site/CursorIntro'
import DownloadSection from '@/components/site/DownloadSection'
import Faq from '@/components/site/Faq'
import FeatureGrid from '@/components/site/FeatureGrid'
import FreeModeSection from '@/components/site/FreeModeSection'
import Hero from '@/components/site/Hero'
import HowItWorks from '@/components/site/HowItWorks'
import PageBuilder from '@/components/site/PageBuilder'
import SecuritySection from '@/components/site/SecuritySection'
import SiteFooter from '@/components/site/SiteFooter'
import SiteHeader from '@/components/site/SiteHeader'
import TrustStrip from '@/components/site/TrustStrip'
import WarningBand from '@/components/site/WarningBand'

export default function App() {
  const [introDone, setIntroDone] = useState(false)

  if (!introDone) return <CursorIntro onDone={() => setIntroDone(true)} />

  return (
    <PageBuilder>
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
        <a
          href="#main"
          className="sr-only z-50 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          본문으로 건너뛰기
        </a>
        <SiteHeader />
        <main id="main" className="grid-page">
          <Hero />
          <TrustStrip />
          <HowItWorks />
          <FeatureGrid />
          <FreeModeSection />
          <SecuritySection />
          <WarningBand />
          <DownloadSection />
          <Faq />
        </main>
        <SiteFooter />
      </div>
    </PageBuilder>
  )
}
