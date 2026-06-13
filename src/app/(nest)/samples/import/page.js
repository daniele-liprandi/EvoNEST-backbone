'use client'

import dynamic from 'next/dynamic'

const ImportPage = dynamic(() => import('./ImportPageClient'), { ssr: false })

export default function Page() {
    return <ImportPage />
}
