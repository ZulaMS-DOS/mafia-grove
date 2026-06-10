import { NextRequest } from 'next/server'
import { POST as buyHandler } from '../route'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return buyHandler(req, context)
}
