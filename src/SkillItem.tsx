import React from 'react'
import { Box, Text } from 'ink'
import type { Skill } from './lib/types.js'

type Props = {
  skill: Skill
  isSelected: boolean
}

export function SkillItem({ skill, isSelected }: Props) {
  const indicator = skill.enabled ? '●' : '○'
  const indicatorColor = skill.enabled ? 'green' : 'gray'
  const statusText = skill.enabled ? 'enabled ' : 'disabled'
  const statusColor = skill.enabled ? 'green' : 'gray'

  return (
    <Box>
      <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? '▶ ' : '  '}</Text>
      <Text color={indicatorColor}>{indicator} </Text>
      <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
        {skill.name.padEnd(42)}
      </Text>
      <Text color={statusColor} dimColor={!skill.enabled}>{statusText}</Text>
    </Box>
  )
}
