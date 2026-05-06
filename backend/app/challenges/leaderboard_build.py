"""Build leaderboard rows from challenge repository."""

from __future__ import annotations

from dataclasses import dataclass

from app.challenges.repository import ChallengeRepositoryProtocol
from app.challenges.schemas import LeaderboardEntryOut


@dataclass
class _Agg:
    wins: int = 0
    losses: int = 0
    ties: int = 0
    best_pushups: int = 0


def build_leaderboard(repo: ChallengeRepositoryProtocol) -> list[LeaderboardEntryOut]:
    """
    Rank by completed head-to-head outcomes (wins / losses / ties), then by best single-game reps.
    ``bestPushups`` is each display name's highest rep count in any completed challenge they played.
    """
    by_name: dict[str, _Agg] = {}

    def agg_for(name: str) -> _Agg:
        if name not in by_name:
            by_name[name] = _Agg()
        return by_name[name]

    for r in repo.all_records():
        if (r.status or "").lower() != "completed":
            continue
        cp = r.challenger_pushups
        op = r.opponent_pushups
        if cp is None or op is None:
            continue
        ch = (r.challenger_name or "").strip()
        opp_n = (r.opponent_name or "").strip()
        if not ch or not opp_n:
            continue
        a = agg_for(ch)
        b = agg_for(opp_n)
        a.best_pushups = max(a.best_pushups, int(cp))
        b.best_pushups = max(b.best_pushups, int(op))
        if cp > op:
            a.wins += 1
            b.losses += 1
        elif cp < op:
            a.losses += 1
            b.wins += 1
        else:
            a.ties += 1
            b.ties += 1

    names = sorted(
        by_name.keys(),
        key=lambda n: (-by_name[n].wins, by_name[n].losses, -by_name[n].ties, -by_name[n].best_pushups, n.lower()),
    )
    return [
        LeaderboardEntryOut(
            rank=i + 1,
            displayName=n,
            bestPushups=by_name[n].best_pushups,
            wins=by_name[n].wins,
            ties=by_name[n].ties,
            losses=by_name[n].losses,
        )
        for i, n in enumerate(names[:50])
    ]
