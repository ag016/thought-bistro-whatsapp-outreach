export default function InfoField({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined, marginTop: fullWidth ? 12 : 0 }}>
      <div style={{ fontSize: 10, color: 'var(--accent-color)', opacity: 0.7, marginBottom: 3, fontWeight: 600 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, color: 'var(--text-color)', opacity: 0.9, fontWeight: 600, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
