import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { RequireSessionAuth } from '../components/auth/RequireSessionAuth'
import { Home } from '../pages/Home'
import { CreateChallenge } from '../pages/CreateChallenge'
import { ChallengeDetail } from '../pages/ChallengeDetail'
import { SubmitResult } from '../pages/SubmitResult'
import { PushupAlgorithmLab } from '../pages/PushupAlgorithmLab'
import { PurchaseSuccess } from '../pages/PurchaseSuccess'
import { PurchaseCancel } from '../pages/PurchaseCancel'
import { ChallengeVideos } from '../pages/ChallengeVideos'
import { MyVideos } from '../pages/MyVideos'
import { VideosHub } from '../pages/VideosHub'
import { Stats } from '../pages/Stats'
import { Friends } from '../pages/Friends'
import { MyChallenges } from '../pages/MyChallenges'
import { SoloSession } from '../pages/SoloSession'
import { Dashboard } from '../pages/Dashboard'
import { CreditsPage } from '../pages/CreditsPage'
import { Admin } from '../pages/Admin'
import { SettingsPage } from '../pages/SettingsPage'
import { SecretPwaInstallPage } from '../pages/SecretPwaInstallPage'
import { RequireAdmin } from '../components/auth/RequireAdmin'

function ChallengeResultRedirect() {
  const { challengeId } = useParams()
  if (!challengeId) return <Navigate to="/" replace />
  return <Navigate to={`/c/${challengeId}`} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route
          path="/dashboard"
          element={
            <RequireSessionAuth>
              <Dashboard />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/solo"
          element={
            <RequireSessionAuth>
              <SoloSession />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/solo/videos"
          element={
            <RequireSessionAuth>
              <MyVideos />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/videos/challenges"
          element={
            <RequireSessionAuth>
              <ChallengeVideos />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/videos"
          element={
            <RequireSessionAuth>
              <VideosHub />
            </RequireSessionAuth>
          }
        />
        <Route path="/my-record" element={<Navigate to="/stats" replace />} />
        <Route
          path="/stats"
          element={
            <RequireSessionAuth>
              <Stats />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireSessionAuth>
              <SettingsPage />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/friends"
          element={
            <RequireSessionAuth>
              <Friends />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/my-challenges"
          element={
            <RequireSessionAuth>
              <MyChallenges />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/challenge/start"
          element={
            <RequireSessionAuth>
              <Navigate to="/challenge" replace />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/challenge"
          element={
            <RequireSessionAuth>
              <CreateChallenge />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/challenge/create"
          element={
            <RequireSessionAuth>
              <CreateChallenge />
            </RequireSessionAuth>
          }
        />
        <Route path="/c/:challengeId" element={<ChallengeDetail />} />
        <Route
          path="/c/:challengeId/submit"
          element={
            <RequireSessionAuth>
              <SubmitResult />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/c/:challengeId/result"
          element={
            <RequireSessionAuth>
              <ChallengeResultRedirect />
            </RequireSessionAuth>
          }
        />
        <Route path="/leaderboard" element={<Navigate to="/" replace />} />
        <Route path="/purchase/success" element={<PurchaseSuccess />} />
        <Route path="/purchase/cancel" element={<PurchaseCancel />} />
        <Route path="/purchase" element={<Navigate to="/credits" replace />} />
        <Route
          path="/credits"
          element={
            <RequireSessionAuth>
              <CreditsPage />
            </RequireSessionAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireSessionAuth>
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            </RequireSessionAuth>
          }
        />
        <Route
          path="/__/pwa-install"
          element={
            <RequireSessionAuth>
              <SecretPwaInstallPage />
            </RequireSessionAuth>
          }
        />
        {import.meta.env.DEV ? (
          <Route
            path="/dev/pushup-lab"
            element={
              <RequireSessionAuth>
                <PushupAlgorithmLab />
              </RequireSessionAuth>
            }
          />
        ) : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
