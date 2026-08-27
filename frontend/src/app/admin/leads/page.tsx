'use client'
import dynamic from 'next/dynamic'

import AdminLoadingState from '@/components/AdminLoadingState'

const AdminLeads = dynamic(() => import('@/views/admin/AdminLeads'), {
  ssr: false,
  loading: () => <AdminLoadingState />,
})

export default function AdminLeadsPage() {
  return <AdminLeads />
}
