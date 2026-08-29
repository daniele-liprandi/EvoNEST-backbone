import { render, screen } from '@testing-library/react'
import { TableBlock } from '@/components/nest/ai/blocks/TableBlock'
import '@testing-library/jest-dom'

const makeBlock = (count: number, total: number) => ({
  type: 'table' as const,
  entity: 'samples' as const,
  data: Array.from({ length: count }, (_, i) => ({
    name: `Sample ${i + 1}`,
    type: 'silk',
    location: 'Spain',
  })),
  totalCount: total,
  filterUrl: '/samples/general?type=silk',
})

describe('TableBlock', () => {
  test('renders up to 5 rows on desktop', () => {
    render(<TableBlock block={makeBlock(10, 10)} />)
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBe(6)
  })

  test('shows "View all" link when totalCount exceeds row limit', () => {
    render(<TableBlock block={makeBlock(10, 10)} />)
    const link = screen.getByRole('link', { name: /view all 10/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/samples/general?type=silk')
  })

  test('does not show "View all" link when all rows are shown', () => {
    render(<TableBlock block={makeBlock(3, 3)} />)
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument()
  })
})