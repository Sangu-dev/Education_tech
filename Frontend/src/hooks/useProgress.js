import { useQuery } from '@tanstack/react-query';
import { progressAPI } from '../api/progress.js';

export function useProgress(courseId) {
  return useQuery({
    queryKey: ['progress', courseId],
    queryFn: () => progressAPI.getCourse(courseId).then(r => r.data.data.progress),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCompletedLessons(courseId) {
  return useQuery({
    queryKey: ['completedLessons', courseId],
    queryFn: () => progressAPI.getCompleted(courseId).then(r => r.data.data.completed),
    enabled: !!courseId,
  });
}

export function useAllProgress() {
  return useQuery({
    queryKey: ['allProgress'],
    queryFn: () => progressAPI.getAll().then(r => r.data.data.progress),
  });
}
