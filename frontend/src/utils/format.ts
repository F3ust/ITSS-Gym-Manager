export function fmtDate(date: string | Date) {
  return new Date(date).toLocaleDateString('vi-VN')
}

export function fmtDateTime(date: string | Date) {
  return new Date(date).toLocaleString('vi-VN')
}

export function fmtVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
