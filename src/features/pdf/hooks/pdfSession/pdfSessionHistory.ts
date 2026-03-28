import { RUNTIME_HISTORY_LIMIT } from "../../constants/session";
import type { SessionHistoryState, SessionPresentState } from "../../types/session";

export interface HistoryMutationOptions {
  mutationKey?: string;
  allowCoalesce?: boolean;
}

export function createInitialPresentState(): SessionPresentState {
  return {
    bboxes: [],
    customEntityLabels: [],
    revision: 0
  };
}

export function createInitialHistoryState(): SessionHistoryState {
  return {
    past: [],
    present: createInitialPresentState(),
    future: [],
    lastMutationKey: null
  };
}

export function clonePresentState(state: SessionPresentState): SessionPresentState {
  return {
    bboxes: state.bboxes.map((bbox) => ({ ...bbox })),
    customEntityLabels: [...state.customEntityLabels],
    revision: state.revision
  };
}

export function applyHistoryMutation(
  history: SessionHistoryState,
  nextPresentState: SessionPresentState,
  options: HistoryMutationOptions = {}
): SessionHistoryState {
  const mutationKey = options.mutationKey ?? null;
  const canCoalesce = Boolean(options.allowCoalesce && mutationKey && history.lastMutationKey === mutationKey);

  if (canCoalesce) {
    return {
      past: history.past,
      present: nextPresentState,
      future: [],
      lastMutationKey: mutationKey
    };
  }

  const nextPast = [...history.past, history.present];
  if (nextPast.length > RUNTIME_HISTORY_LIMIT) {
    nextPast.splice(0, nextPast.length - RUNTIME_HISTORY_LIMIT);
  }

  return {
    past: nextPast,
    present: nextPresentState,
    future: [],
    lastMutationKey: mutationKey
  };
}

export function undoHistory(history: SessionHistoryState): SessionHistoryState {
  if (history.past.length === 0) {
    return history;
  }

  const nextPast = history.past.slice(0, -1);
  const previousPresent = history.past[history.past.length - 1];

  return {
    past: nextPast,
    present: previousPresent,
    future: [history.present, ...history.future].slice(0, RUNTIME_HISTORY_LIMIT),
    lastMutationKey: null
  };
}

export function redoHistory(history: SessionHistoryState): SessionHistoryState {
  if (history.future.length === 0) {
    return history;
  }

  const [nextPresent, ...nextFuture] = history.future;
  const nextPast = [...history.past, history.present];
  if (nextPast.length > RUNTIME_HISTORY_LIMIT) {
    nextPast.splice(0, nextPast.length - RUNTIME_HISTORY_LIMIT);
  }

  return {
    past: nextPast,
    present: nextPresent,
    future: nextFuture,
    lastMutationKey: null
  };
}
