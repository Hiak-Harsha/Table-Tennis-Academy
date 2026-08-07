import { getSession } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import TournamentHubClient from '@/components/TournamentHubClient'

export default async function StudentTournaments() {
  const payload = await getSession()
  if (!payload || payload.role !== 'STUDENT') {
    return <div style={{ padding: '2rem', fontSize: '0.85rem' }}>Session expired. Please log in.</div>
  }

  const tournaments = await prisma.tournament.findMany({ orderBy: { date: 'asc' } })
  const myRegistrations = await prisma.tournamentPayment.findMany({ where: { studentId: payload.studentId } })

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.2rem' }}>Tournament Hub</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0 }}>Browse events, track history, and register.</p>
      </div>
      <TournamentHubClient tournaments={tournaments} myRegistrations={myRegistrations} studentId={payload.studentId} />
    </div>
  )
}
