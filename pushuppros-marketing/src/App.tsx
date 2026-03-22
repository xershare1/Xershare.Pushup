import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { HowItWorks } from './pages/HowItWorks'
import { Challenge } from './pages/Challenge'
import { PushupsHistoryPage } from './pages/pushups/History'
import { PushupsVariationsPage } from './pages/pushups/Variations'
import { PushupsFormPage } from './pages/pushups/Form'
import { PushupsTrainingPage } from './pages/pushups/Training'
import { PushupsRecordsPage } from './pages/pushups/Records'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/challenge" element={<Challenge />} />
        <Route path="/pushups/history" element={<PushupsHistoryPage />} />
        <Route path="/pushups/variations" element={<PushupsVariationsPage />} />
        <Route path="/pushups/form" element={<PushupsFormPage />} />
        <Route path="/pushups/training" element={<PushupsTrainingPage />} />
        <Route path="/pushups/records" element={<PushupsRecordsPage />} />
      </Routes>
    </Layout>
  )
}
