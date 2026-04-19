import { Navigate, Route, Routes } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { RequireSessionAuth } from '../components/auth/RequireSessionAuth'
import { Home } from '../pages/Home'
import { ChallengeStart } from '../pages/ChallengeStart'
import { CreateChallenge } from '../pages/CreateChallenge'
import { ChallengeDetail } from '../pages/ChallengeDetail'
import { SubmitResult } from '../pages/SubmitResult'
import { ChallengeResult } from '../pages/ChallengeResult'
import { Leaderboard } from '../pages/Leaderboard'
import { PushupAlgorithmLab } from '../pages/PushupAlgorithmLab'
import { PurchaseCredits } from '../pages/PurchaseCredits'
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
              <ChallengeStart />
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
              <ChallengeResult />
            </RequireSessionAuth>
          }
        />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/purchase/success" element={<PurchaseSuccess />} />
        <Route path="/purchase/cancel" element={<PurchaseCancel />} />
        <Route
          path="/purchase"
          element={
            <RequireSessionAuth>
              <PurchaseCredits />
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
