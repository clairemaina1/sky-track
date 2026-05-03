import { create } from "zustand";

interface FleetState {
  filterStatus: string | null;
  filterBase: string | null;
  filterTail: string | null;
  selectedAircraftId: string | null;
  setFilter: (key: "status" | "base" | "tail", value: string | null) => void;
  clearFilters: () => void;
  selectAircraft: (id: string | null) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  filterStatus: null,
  filterBase: null,
  filterTail: null,
  selectedAircraftId: null,
  setFilter: (key, value) =>
    set((s) => ({
      ...s,
      [`filter${key.charAt(0).toUpperCase() + key.slice(1)}`]: value,
    })),
  clearFilters: () =>
    set({ filterStatus: null, filterBase: null, filterTail: null }),
  selectAircraft: (id) => set({ selectedAircraftId: id }),
}));
