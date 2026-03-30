import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  errorMessage?: string
}

export function StatusBar({ errorMessage }: Props) {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} paddingX={1} marginTop={1}>
      {errorMessage
        ? <Text color="red">{errorMessage}</Text>
        : <Text dimColor>↑↓ navigate  [space] toggle  [d] delete  [q] quit</Text>
      }
    </Box>
  )
}
