import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  skillName: string
}

export function ConfirmDialog({ skillName }: Props) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      marginX={2}
    >
      <Text bold color="yellow">Confirm Delete</Text>
      <Box marginTop={1}>
        <Text>Delete </Text>
        <Text color="yellow" bold>{skillName}</Text>
        <Text>?</Text>
      </Box>
      <Text dimColor>This cannot be undone.</Text>
      <Box marginTop={1} gap={4}>
        <Text color="red" bold>[y] Yes</Text>
        <Text color="green" bold>[n] No</Text>
      </Box>
    </Box>
  )
}
