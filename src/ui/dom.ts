export function getElement(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element: ${id}`)
  return element
}

export function getButton(id: string): HTMLButtonElement {
  return getElement(id) as HTMLButtonElement
}

export function getSelect(id: string): HTMLSelectElement {
  return getElement(id) as HTMLSelectElement
}
