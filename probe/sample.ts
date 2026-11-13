export function badgeLabel(name: string): string {
  const label = name.trim()
  return label.length === 0 ? "Guest" : label
}
