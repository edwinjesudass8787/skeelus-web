import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Award, CheckCircle } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CertificatePage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Look up public certificate
  const { data, error } = await supabase
    .from('learnr_public_certificates')
    .select('*')
    .eq('certificate_id', id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const curriculum = data.curriculum

  return (
    <div className='min-h-screen bg-gradient-to-br from-brand-50 to-indigo-50'>
      <div className='max-w-4xl mx-auto px-6 py-12'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center gap-3'>
            <div className='w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl'>
              S
            </div>
            <span className='text-2xl font-bold text-gray-900'>Skeelus</span>
          </div>
        </div>

        {/* Certificate */}
        <div className='bg-white rounded-3xl shadow-xl overflow-hidden'>
          <div className='bg-gradient-to-r from-brand-600 to-indigo-600 px-8 py-6 text-white'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium opacity-80'>Certificate of Completion</p>
                <p className='text-2xl font-bold'>Verified Skills</p>
              </div>
              <div className='text-right'>
                <p className='text-sm opacity-80'>Certificate ID</p>
                <p className='font-mono font-bold'>{data.certificate_id}</p>
              </div>
            </div>
          </div>

          <div className='p-8'>
            <div className='text-center mb-8'>
              <p className='text-gray-500 mb-2'>This certifies successful completion of</p>
              <h1 className='text-3xl font-bold text-gray-900 mb-4'>{data.topic}</h1>
              <p className='text-gray-600 max-w-xl mx-auto'>
                Through the Skeelus 5-stage learning journey, demonstrating understanding of key concepts,
                practical application, and commitment to implementation.
              </p>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-3 gap-6 mb-8'>
              <div className='text-center'>
                <div className='text-3xl font-bold text-brand-600'>{curriculum?.concepts?.length || 0}</div>
                <div className='text-sm text-gray-500'>Core Concepts</div>
              </div>
              <div className='text-center'>
                <div className='text-3xl font-bold text-purple-600'>{curriculum?.academicTheories?.length || 0}</div>
                <div className='text-sm text-gray-500'>Theories</div>
              </div>
              <div className='text-center'>
                <div className='text-3xl font-bold text-emerald-600'>{curriculum?.caseStudies?.length || 0}</div>
                <div className='text-sm text-gray-500'>Case Studies</div>
              </div>
            </div>

            {/* Completed Date */}
            <div className='text-center text-sm text-gray-400'>
              Verified on {new Date(data.completed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='mt-8 text-center'>
          <p className='text-gray-500 text-sm'>
            Verify this certificate at: <span className='font-mono'>{process.env.NEXT_PUBLIC_SITE_URL}/certificate/{id}</span>
          </p>
          <div className='mt-4'>
            <a
              href={process.env.NEXT_PUBLIC_SITE_URL || 'https://skeelus.vercel.app'}
              className='text-brand-600 hover:text-brand-700 font-medium'
            >
              Create your own certificate →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}