import { useSyncExternalStore } from "react";
import { DEFAULT_ROOM, type PlacedFurniture } from "./myroom-data";

const STORAGE_KEY = "holo:myroom:v1";

function loadInitial(): PlacedFurniture[] {
  if (typeof window === "undefined") return DEFAULT_ROOM;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_ROOM;
}

let state: PlacedFurniture[] = loadInitial();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (quota / private mode)
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setMyroomItems(items: PlacedFurniture[]) {
  state = items;
  persist();
  emit();
}

export function getMyroomItems(): PlacedFurniture[] {
  return state;
}

export function resetMyroomItems() {
  setMyroomItems(DEFAULT_ROOM);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

export function useMyroomItems(): PlacedFurniture[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
