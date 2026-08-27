'use client'
import dynamic from 'next/dynamic'

import AdminLoadingState from '@/components/AdminLoadingState'

const AdminPipelineSettings = dynamic(() => import('@/views/admin/AdminPipelineSettings'), {
  ssr: false,
  loading: () => <AdminLoadingState />,
})

export default function AdminPipelinePage() {
  return <AdminPipelineSettings />
}
