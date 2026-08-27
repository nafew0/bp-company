'use client'
import dynamic from 'next/dynamic'

import AdminLoadingState from '@/components/AdminLoadingState'

const AdminLeadDetail = dynamic(() => import('@/views/admin/AdminLeadDetail'), {
  ssr: false,
  loading: () => <AdminLoadingState />,
})

export default function AdminLeadDetailPage() {
  return <AdminLeadDetail />
}
