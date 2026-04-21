import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { HowItWorks } from './pages/HowItWorks'
import { Pricing } from './pages/Pricing'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import { PushupsHistoryPage } from './pages/pushups/History'
import { PushupFormGuidePage } from './pages/guides/PushupForm'
import { PushupVariationsGuidePage } from './pages/guides/PushupVariations'
import { TrainingTipsGuidePage } from './pages/guides/TrainingTips'
import { PushupsRecordsPage } from './pages/pushups/Records'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/about" element={<About />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/pushups/history" element={<PushupsHistoryPage />} />
        <Route path="/pushups/variations" element={<Navigate to="/guides/pushup-variations" replace />} />
        <Route path="/guides" element={<Navigate to="/guides/pushup-form" replace />} />
        <Route path="/guides/pushup-form" element={<PushupFormGuidePage />} />
        <Route path="/guides/pushup-variations" element={<PushupVariationsGuidePage />} />
        <Route path="/guides/training-tips" element={<TrainingTipsGuidePage />} />
        <Route path="/pushups/form" element={<Navigate to="/guides/pushup-form" replace />} />
        <Route path="/pushups/training" element={<Navigate to="/guides/training-tips" replace />} />
        <Route path="/pushups/records" element={<PushupsRecordsPage />} />
      </Routes>
    </Layout>
  )
}
