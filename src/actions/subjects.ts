'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/auth'
import { subjectsContainer } from '@/modules/subjects/container'

// ── Subject ──────────────────────────────────────────────────────────────────

export async function createSubject(
  name: string,
  description?: string,
): Promise<{ id: string }> {
  const userId = await requireUserId()
  const result = await subjectsContainer.createSubject.execute({ name, description, userId })
  revalidatePath('/subjects')
  return result
}

export async function getSubjects(): Promise<
  Array<{ id: string; name: string; description: string | null }>
> {
  const userId = await requireUserId()
  return subjectsContainer.listSubjects.execute(userId)
}

// ── Topic ────────────────────────────────────────────────────────────────────

export async function createTopic(
  name: string,
  description?: string,
): Promise<{ id: string }> {
  const userId = await requireUserId()
  const result = await subjectsContainer.createTopic.execute({ name, description, userId })
  revalidatePath('/subjects')
  return result
}

export async function getTopics(): Promise<
  Array<{ id: string; name: string; description: string | null }>
> {
  const userId = await requireUserId()
  return subjectsContainer.listTopics.execute(userId)
}

// ── Concept ──────────────────────────────────────────────────────────────────

export async function createConcept(
  name: string,
  description?: string,
): Promise<{ id: string }> {
  const userId = await requireUserId()
  const result = await subjectsContainer.createConcept.execute({ name, description, userId })
  revalidatePath('/subjects')
  return result
}

export async function getConcepts(): Promise<
  Array<{ id: string; name: string; description: string | null; flashcardCount: number }>
> {
  const userId = await requireUserId()
  return subjectsContainer.listConcepts.execute(userId)
}
