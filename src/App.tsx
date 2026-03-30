import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { SkillList } from './SkillList.js'
import { ConfirmDialog } from './ConfirmDialog.js'
import { StatusBar } from './StatusBar.js'
import { scanSkills } from './lib/scanner.js'
import { enableSkill, disableSkill, deleteSkill } from './lib/actions.js'
import type { Skill } from './lib/types.js'

const USER_SKILLS_DIR = join(homedir(), '.claude', 'skills')
const PROJECT_SKILLS_DIR = join(process.cwd(), '.claude', 'skills')

export function App() {
  const { exit } = useApp()
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [confirmSkill, setConfirmSkill] = useState<Skill | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)

  const loadSkills = useCallback(async () => {
    const found = await scanSkills(USER_SKILLS_DIR, PROJECT_SKILLS_DIR)
    setSkills(found)
    setLoading(false)
  }, [])

  useEffect(() => { loadSkills() }, [loadSkills])

  const showError = (msg: string) => {
    setErrorMessage(msg)
    setTimeout(() => setErrorMessage(''), 3000)
  }

  useInput(async (input, key) => {
    if (confirmSkill) {
      if (input === 'y') {
        if (isWorking) return
        setIsWorking(true)
        try {
          await deleteSkill(confirmSkill)
          setConfirmSkill(null)
          setSelectedIndex(prev => Math.max(0, prev - 1))
          await loadSkills()
        } catch (e) {
          showError(`Delete failed: ${(e as Error).message}`)
          setConfirmSkill(null)
        } finally {
          setIsWorking(false)
        }
      } else {
        setConfirmSkill(null)
      }
      return
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1))
    } else if (key.downArrow) {
      setSelectedIndex(prev => (skills.length === 0 ? 0 : Math.min(skills.length - 1, prev + 1)))
    } else if (input === ' ') {
      if (isWorking) return
      const skill = skills[selectedIndex]
      if (!skill) return
      setIsWorking(true)
      try {
        if (skill.enabled) {
          await disableSkill(skill)
        } else {
          await enableSkill(skill)
        }
        await loadSkills()
      } catch (e) {
        showError(`Toggle failed: ${(e as Error).message}`)
      } finally {
        setIsWorking(false)
      }
    } else if (input === 'd') {
      const skill = skills[selectedIndex]
      if (skill) setConfirmSkill(skill)
    } else if (input === 'q' || key.escape) {
      exit()
    }
  })

  if (loading) {
    return (
      <Box><Text dimColor>Loading skills...</Text></Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" minWidth={60}>
      <Box paddingX={2} paddingTop={1}>
        <Text bold color="cyan"> Skill Manager </Text>
      </Box>

      <SkillList
        skills={skills}
        selectedIndex={selectedIndex}
        projectDir={process.cwd()}
      />

      {confirmSkill && (
        <ConfirmDialog skillName={confirmSkill.name} />
      )}

      <StatusBar errorMessage={errorMessage} />
    </Box>
  )
}
