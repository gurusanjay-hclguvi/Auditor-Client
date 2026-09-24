import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: { main: '#0d75fc' },
    text: { primary: '#1F252D', secondary: '#495565', disabled: '#5E7087' },
    background: { default: '#F6F8FB' },
  },
  typography: {
    fontFamily: "'Wanted Sans Variable', 'Wanted Sans', sans-serif",
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
})

export default theme
