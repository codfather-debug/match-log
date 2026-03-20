import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { p1, p2, stats } = body

  const prompt = `You are a tennis analyst. Summarize this match in 2-3 sentences focusing on the key patterns of how points were won and lost. Be specific and concise — reference the players by name.

Match: ${p1} vs ${p2}

Stats:
- Points won: ${p1} ${stats.team1Points}, ${p2} ${stats.team2Points}
- 1st serve %: ${p1} ${stats.fs1pct}%, ${p2} ${stats.fs2pct}%
- Aces: ${p1} ${stats.aces1}, ${p2} ${stats.aces2}
- Double faults: ${p1} ${stats.df1}, ${p2} ${stats.df2}
- Winners: ${p1} ${stats.winners1}, ${p2} ${stats.winners2}
- Unforced errors: ${p1} ${stats.ue1}, ${p2} ${stats.ue2}
- 1st serve won: ${p1} ${stats.fsWon1}/${stats.fs1In}, ${p2} ${stats.fsWon2}/${stats.fs2In}
- 2nd serve won: ${p1} ${stats.ssWon1}/${stats.ss1Total}, ${p2} ${stats.ssWon2}/${stats.ss2Total}
- Avg rally: ${stats.avgRally} shots
- Top winner strokes: ${p1} ${JSON.stringify(stats.winnerStrokes1)}, ${p2} ${JSON.stringify(stats.winnerStrokes2)}
- Top UE strokes: ${p1} ${JSON.stringify(stats.ueStrokes1)}, ${p2} ${JSON.stringify(stats.ueStrokes2)}
- UE directions: ${p1} ${JSON.stringify(stats.ueDirs1)}, ${p2} ${JSON.stringify(stats.ueDirs2)}`

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = completion.choices[0].message.content ?? ''
    return NextResponse.json({ summary: text })
  } catch (e) {
    console.error('Groq error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
