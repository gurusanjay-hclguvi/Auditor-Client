export function getValueAtPath(source, path) {
  return path.split('.').reduce((value, part) => (value == null ? value : value[part]), source)
}

// For each {key, label} field (dot-path keys, e.g. "payment.emi.loanAmount"), returns the system
// value, the scraped value, and whether they match (trimmed, case-insensitive).
export function compareLeadData(systemData, scrapedData, fields) {
  return fields.map(({ key, label }) => {
    const systemRaw = getValueAtPath(systemData, key)
    const scrapedRaw = getValueAtPath(scrapedData, key)
    const systemValue = systemRaw == null ? '' : String(systemRaw).trim()
    const scrapedValue = scrapedRaw == null ? '' : String(scrapedRaw).trim()
    return {
      key,
      label,
      systemValue,
      scrapedValue,
      matches: systemValue.toLowerCase() === scrapedValue.toLowerCase(),
    }
  })
}
