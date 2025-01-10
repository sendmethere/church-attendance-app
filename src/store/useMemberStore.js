import { create } from 'zustand';


const useMemberStore = create((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
}));

export default useMemberStore;
