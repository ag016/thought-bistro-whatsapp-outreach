function InfoField({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined, marginTop: fullWidth ? 12 : 0 }}>
      <div style={{ fontSize: 10, color: '#3a5a3a', marginBottom: 3, fontWeight: 600 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13, color: '#8ab48a', fontWeight: 600, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
