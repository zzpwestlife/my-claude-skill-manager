interface Props {
  title: string
  count: number
}

export default function SectionHeader({ title, count }: Props) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {title} ({count})
    </h2>
  )
}
