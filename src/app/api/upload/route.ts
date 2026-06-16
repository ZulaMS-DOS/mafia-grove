import { NextRequest, NextResponse } from 'next/server'
import { requireLeadership } from '@/lib/middleware'
import cloudinary from '@/lib/cloudinary'

export async function POST(req: NextRequest) {
  const { error } = await requireLeadership()
  if (error) return error

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Niciun fisier trimis' }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'mafia-grove-shop',
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Eroare upload' }, { status: 500 })
  }
}
