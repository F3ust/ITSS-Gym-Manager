interface Props {
  title?: string
}

export default function ComingSoon({ title }: Props) {
  return (
    <div>
      <h2>{title || 'Coming Soon'}</h2>
      <p>This screen is under construction.</p>
    </div>
  )
}
