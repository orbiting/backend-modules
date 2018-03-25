// exports instead of named export for graphql server

module.exports = translations => {
  if (!Array.isArray(translations)) {
    const emptyFormatter = () => ''
    emptyFormatter.first = emptyFormatter
    emptyFormatter.pluralize = emptyFormatter
    return emptyFormatter
  }

  const index = translations.reduce((accumulator, translation) => {
    accumulator[translation.key] = translation.value
    return accumulator
  }, {})
  const formatter = (key, replacements, emptyValue) => {
    let message = index[key] || (emptyValue !== undefined ? emptyValue : `[missing translation '${key}']`)
    if (replacements) {
      Object.keys(replacements).forEach(replacementKey => {
        message = message.replace(`{${replacementKey}}`, replacements[replacementKey])
      })
    }
    return message
  }
  const first = formatter.first = (keys, replacements, emptyValue) => {
    const key = keys.find(k => index[k] !== undefined) || keys[keys.length - 1]
    return formatter(key, replacements, emptyValue)
  }
  formatter.pluralize = (baseKey, replacements, emptyValue) => {
    return first([
      `${baseKey}/${replacements.count}`,
      `${baseKey}/other`
    ], replacements, emptyValue)
  }

  return formatter
}
