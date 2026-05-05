"""Build leaderboard rows from challenge repository."""

from __future__ import annotations

from app.challenges.repository import ChallengeRepositoryProtocol
from app.challenges.schemas import LeaderboardEntryOut


def build_leaderboard(repo: ChallengeRepositoryProtocol) -> list[LeaderboardEntryOut]:
    scores: dict[str, int] = {}
    for r in repo.all_records():
        if r.challenger_pushups is not None:
            n = r.challenger_name
            scores[n] = max(scores.get(n, 0), r.challenger_pushups)
        if r.opponent_pushups is not None:
            n = r.opponent_name
            scores[n] = max(scores.get(n, 0), r.opponent_pushups)
    sorted_entries = sorted(scores.items(), key=lambda x: -x[1])
    return [
        LeaderboardEntryOut(rank=i + 1, displayName=name, bestPushups=cnt)
        for i, (name, cnt) in enumerate(sorted_entries[:50])
    ]
