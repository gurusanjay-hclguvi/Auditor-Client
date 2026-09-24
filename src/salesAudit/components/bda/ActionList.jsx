import { Box, Button, Chip, Link, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import DataTable from '../common/DataTable'
import { ACTION_PRIORITIES } from '../../utils/bdaMetrics'
import { paths } from '../../utils/routePaths'
import { contactName } from '../../utils/formatters'
import { MUTED_TEXT } from '../../styles/tableSx'

function getColumns(onUpdateCc, showBda) {
  const columns = [
    {
      label: 'Priority',
      render: (item) => {
        const priority = ACTION_PRIORITIES[item.priority]
        return (
          <Chip
            label={priority.label}
            size="small"
            color={priority.color}
            variant={item.priority <= 2 ? 'filled' : 'outlined'}
          />
        )
      },
    },
    {
      label: 'Student Name',
      render: (item) => (
        <Link
          component={RouterLink}
          to={paths.student(item.lead.id)}
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          {item.lead.studentFullName}
        </Link>
      ),
    },
    ...(showBda ? [{ label: 'BDA', render: (item) => contactName(item.lead.saleOwner) }] : []),
    {
      label: 'What to do',
      render: (item) => (
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{item.title}</Typography>
      ),
    },
    {
      label: 'Why',
      render: (item) => (
        <Box sx={{ minWidth: 280, maxWidth: 480, whiteSpace: 'normal', color: MUTED_TEXT }}>
          {item.why}
        </Box>
      ),
    },
    {
      label: 'Action',
      render: (item) =>
        item.action.updateCc ? (
          <Button size="small" variant="contained" onClick={() => onUpdateCc(item.lead)}>
            {item.action.label}
          </Button>
        ) : (
          <Button component={RouterLink} to={item.action.to} size="small" variant="outlined">
            {item.action.label}
          </Button>
        ),
    },
  ]
  return columns
}

// The BDA's prioritised to-do list (see buildActionItems); `showBda` adds the owner column for a
// BDM's team view.
function ActionList({ items, onUpdateCc, showBda = false }) {
  return <DataTable columns={getColumns(onUpdateCc, showBda)} rows={items} />
}

export default ActionList
