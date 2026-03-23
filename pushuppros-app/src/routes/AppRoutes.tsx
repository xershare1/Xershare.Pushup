import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from '../pages/Home'
import { CreateChallenge } from '../pages/CreateChallenge'
import { ChallengeDetail } from '../pages/ChallengeDetail'
import { SubmitResult } from '../pages/SubmitResult'
import { ChallengeResult } from '../pages/ChallengeResult'
import { Leaderboard } from '../pages/Leaderboard'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/challenge/create" element={<CreateChallenge />} />
      <Route path="/c/:challengeId" element={<ChallengeDetail />} />
      <Route path="/c/:challengeId/submit" element={<SubmitResult />} />
      <Route path="/c/:challengeId/result" element={<ChallengeResult />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
