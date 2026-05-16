type PlaceholderSectionProps = {
  title: string
}

export function PlaceholderSection({ title }: PlaceholderSectionProps) {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center rounded-xl border border-dashed bg-background shadow-sm">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-primary">{title}</h2>
        <p className="text-sm text-muted-foreground">Halaman ini sedang dalam pengembangan.</p>
      </div>
    </div>
  )
}
