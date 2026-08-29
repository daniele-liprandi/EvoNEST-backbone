import { render, screen, fireEvent } from '@testing-library/react'
import { ReadbackBlock } from '@/components/nest/ai/blocks/ReadbackBlock'
import '@testing-library/jest-dom'

const block = {
  type: 'readback' as const,
  entity: 'samples' as const,
  records: [
    { name: 'Araatr1', type: 'silk', genus: 'Argiope', species: 'bruennichi', location: 'Spain', date: '2024-03-15' },
    { name: 'Araatr2', type: 'animal', genus: 'Araneus', species: 'diadematus', location: 'Italy', date: '2024-03-20' },
  ],
  pendingCreate: true as const,
}

describe('ReadbackBlock', () => {
  test('renders all records', () => {
    render(<ReadbackBlock block={block} onConfirm={jest.fn()} onFix={jest.fn()} />)
    expect(screen.getAllByText('Araatr1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Araatr2').length).toBeGreaterThan(0)
  })

  test('calls onConfirm with records when Confirm is clicked', () => {
    const onConfirm = jest.fn()
    render(<ReadbackBlock block={block} onConfirm={onConfirm} onFix={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledWith(block.records)
  })

  test('calls onFix when Fix is clicked', () => {
    const onFix = jest.fn()
    render(<ReadbackBlock block={block} onConfirm={jest.fn()} onFix={onFix} />)
    fireEvent.click(screen.getByRole('button', { name: /fix/i }))
    expect(onFix).toHaveBeenCalled()
  })
})