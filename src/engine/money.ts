/** Formats a USD amount as `$1,234.50`. Pure — no React Native imports. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
