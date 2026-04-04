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

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/challenge/start" element={<ChallengeStart />} />
      <Route path="/challenge/create" element={<CreateChallenge />} />
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
