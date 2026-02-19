import type { Task, Dependency, DependencyType } from '../types';
import { parseISO } from 'date-fns';

/**
 * Check if adding a dependency would create a circular reference
 */
export function wouldCreateCycle(
  dependencies: Dependency[],
  predecessorId: string,
  successorId: string
): boolean {
  // BFS from successor to see if we can reach predecessor
  const adjacency = new Map<string, string[]>();
  for (const dep of dependencies) {
    const existing = adjacency.get(dep.predecessorTaskId) || [];
    existing.push(dep.successorTaskId);
    adjacency.set(dep.predecessorTaskId, existing);
  }

  // Add the proposed edge
  const existing = adjacency.get(predecessorId) || [];
  existing.push(successorId);
  adjacency.set(predecessorId, existing);

  // BFS from successorId to see if we can reach predecessorId
  const visited = new Set<string>();
  const queue = [successorId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    queue.push(...neighbors);
  }

  return false;
}

/**
 * Validate a dependency against task dates
 */
export function validateDependency(
  dep: Dependency,
  predecessor: Task,
  successor: Task
): { valid: boolean; message?: string } {
  const predStart = parseISO(predecessor.startDate);
  const predEnd = parseISO(predecessor.endDate);
  const succStart = parseISO(successor.startDate);
  const succEnd = parseISO(successor.endDate);

  switch (dep.type) {
    case 'FS':
      if (succStart < predEnd) {
        return {
          valid: false,
          message: `${successor.title} starts before ${predecessor.title} finishes`,
        };
      }
      break;
    case 'SS':
      if (succStart < predStart) {
        return {
          valid: false,
          message: `${successor.title} starts before ${predecessor.title} starts`,
        };
      }
      break;
    case 'FF':
      if (succEnd < predEnd) {
        return {
          valid: false,
          message: `${successor.title} finishes before ${predecessor.title} finishes`,
        };
      }
      break;
    case 'SF':
      if (succEnd < predStart) {
        return {
          valid: false,
          message: `${successor.title} finishes before ${predecessor.title} starts`,
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Get connection points for dependency line drawing
 */
export function getDependencyPoints(
  depType: DependencyType,
  predRect: { x: number; y: number; width: number; height: number },
  succRect: { x: number; y: number; width: number; height: number }
): { x1: number; y1: number; x2: number; y2: number } {
  const midH = (r: typeof predRect) => r.y + r.height / 2;

  switch (depType) {
    case 'FS':
      return {
        x1: predRect.x + predRect.width,
        y1: midH(predRect),
        x2: succRect.x,
        y2: midH(succRect),
      };
    case 'SS':
      return {
        x1: predRect.x,
        y1: midH(predRect),
        x2: succRect.x,
        y2: midH(succRect),
      };
    case 'FF':
      return {
        x1: predRect.x + predRect.width,
        y1: midH(predRect),
        x2: succRect.x + succRect.width,
        y2: midH(succRect),
      };
    case 'SF':
      return {
        x1: predRect.x,
        y1: midH(predRect),
        x2: succRect.x + succRect.width,
        y2: midH(succRect),
      };
  }
}
