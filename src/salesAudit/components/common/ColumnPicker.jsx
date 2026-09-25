import { useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  SearchRounded as SearchIcon,
  ViewColumnOutlined as ViewColumnOutlinedIcon,
} from '@mui/icons-material'
import { MUTED_TEXT } from '../../styles/tableSx'

// "Columns" popover: a search box, Select all / Deselect all, and one checkbox per column.
// `locked` columns always stay visible, so Deselect all leaves them. A Popover rather than a Menu,
// since a Menu takes typed keys for its own keyboard navigation and the search box would lose them.
function ColumnPicker({ labels, locked, hidden, onToggle, onShowAll, onHideAll }) {
  const [anchor, setAnchor] = useState(null)
  const [search, setSearch] = useState('')
  const shown = labels.filter((label) => !hidden.includes(label)).length
  const term = search.trim().toLowerCase()
  const matching = term ? labels.filter((label) => label.toLowerCase().includes(term)) : labels

  function close() {
    setAnchor(null)
    setSearch('')
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ViewColumnOutlinedIcon />}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="true"
        aria-expanded={Boolean(anchor)}
      >
        Columns ({shown}/{labels.length})
      </Button>
      <Popover
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280, mt: 0.5 } } }}
      >
        <Box sx={{ p: 1.5, pb: 1 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search columns"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            inputProps={{ 'aria-label': 'Search columns' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Button size="small" onClick={onShowAll} disabled={shown === labels.length}>
              Select all
            </Button>
            <Button size="small" onClick={onHideAll} disabled={shown === locked.length}>
              Deselect all
            </Button>
          </Stack>
        </Box>
        <Divider />
        <List dense sx={{ maxHeight: 320, overflowY: 'auto', py: 0.5 }}>
          {matching.length === 0 ? (
            <Typography variant="body2" sx={{ color: MUTED_TEXT, px: 2, py: 1.5 }}>
              No columns match.
            </Typography>
          ) : (
            matching.map((label) => {
              const isLocked = locked.includes(label)
              return (
                <ListItemButton
                  key={label}
                  dense
                  disabled={isLocked}
                  onClick={() => onToggle(label)}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={!hidden.includes(label)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={label} secondary={isLocked ? 'Always shown' : null} />
                </ListItemButton>
              )
            })
          )}
        </List>
      </Popover>
    </>
  )
}

export default ColumnPicker
