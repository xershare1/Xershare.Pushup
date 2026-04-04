import { Navigate, Route, Routes } from 'react-router-dom'
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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
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
    </Routes>
  )
}
