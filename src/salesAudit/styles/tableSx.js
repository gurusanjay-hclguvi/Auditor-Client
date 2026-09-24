export const MUTED_TEXT = '#5E7087'

export const overlineSx = {
  color: MUTED_TEXT,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
}

export const tableContainerSx = {
  maxHeight: 'calc(100vh - 220px)',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
}

export const headCellSx = {
  ...overlineSx,
  bgcolor: '#F1F4F8',
  fontSize: 12,
  whiteSpace: 'nowrap',
}

export const bodyCellSx = {
  color: 'text.primary',
  fontSize: 13,
  whiteSpace: 'nowrap',
}
