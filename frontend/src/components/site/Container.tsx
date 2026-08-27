import { cn } from '@/lib/utils'

type ContainerWidth = 'max' | 'wide' | 'narrow' | 'tight'

const widthClass: Record<ContainerWidth, string> = {
  max: 'max-w-content',
  wide: 'max-w-content-wide',
  narrow: 'max-w-content-narrow',
  tight: 'max-w-content-tight',
}

export default function Container({
  width = 'wide',
  className,
  children,
  ...rest
}: {
  width?: ContainerWidth
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mx-auto w-full px-6 md:px-8', widthClass[width], className)} {...rest}>
      {children}
    </div>
  )
}
