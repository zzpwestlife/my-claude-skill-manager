import React from 'react'
import { Box, Text } from 'ink'
import { SkillItem } from './SkillItem.js'
import type { Skill } from './lib/types.js'

type Props = {
  skills: Skill[]
  selectedIndex: number
  projectDir: string
}

export function SkillList({ skills, selectedIndex, projectDir }: Props) {
  const userSkills = skills.filter(s => s.scope === 'user')
  const projectSkills = skills.filter(s => s.scope === 'project')

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
      <Text bold underline>USER SKILLS</Text>
      {userSkills.length === 0
        ? <Box paddingLeft={4}><Text dimColor>(none found)</Text></Box>
        : userSkills.map((skill, i) => (
            <SkillItem
              key={skill.id}
              skill={skill}
              isSelected={selectedIndex === i}
            />
          ))
      }

      <Box marginTop={1} />

      <Text bold underline>
        {'PROJECT SKILLS  '}
        <Text dimColor>{projectDir}</Text>
      </Text>
      {projectSkills.length === 0
        ? <Box paddingLeft={4}><Text dimColor>(none found)</Text></Box>
        : projectSkills.map((skill, i) => (
            <SkillItem
              key={skill.id}
              skill={skill}
              isSelected={selectedIndex === userSkills.length + i}
            />
          ))
      }
    </Box>
  )
}
