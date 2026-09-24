export function getValueAtPath(source, path) {
  return path.split('.').reduce((value, part) => (value == null ? value : value[part]), source)
}
