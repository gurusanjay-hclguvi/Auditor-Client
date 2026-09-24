import { useState } from 'react'
import {
  Button,
  Checkbox,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material'
import { ViewColumnOutlined as ViewColumnOutlinedIcon } from '@mui/icons-material'

// "Columns" dropdown: one checkbox per column. `locked` columns always stay visible.
function ColumnPicker({ labels, locked = [], isVisible, onToggle, onShowAll }) {
  const [anchor, setAnchor] = useState(null)
  const shown = labels.filter((label) => locked.includes(label) || isVisible(label)).length

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
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { maxHeight: 420 } } }}
      >
        <MenuItem dense onClick={onShowAll} disabled={shown === labels.length}>
          <ListItemText primary="Show all columns" />
        </MenuItem>
        <Divider />
        {labels.map((label) => {
          const isLocked = locked.includes(label)
          return (
            <MenuItem key={label} dense disabled={isLocked} onClick={() => onToggle(label)}>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  size="small"
                  checked={isLocked || isVisible(label)}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText primary={label} secondary={isLocked ? 'Always shown' : null} />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}

export default ColumnPicker
