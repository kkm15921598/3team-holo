import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { mockUser, mockFurniture, type User, type FurnitureItem } from '../mocks/data';
import type { RoomLayout, FurnitureKey } from '../components/IsoRoom';

type Toast = { id: number; text: string };

type Store = {
  user: User;
  furniture: FurnitureItem[];
  toasts: Toast[];
  // mutations
  updateUser: (patch: Partial<User>) => void;
  updateLayout: (patch: Partial<RoomLayout>) => void;
  buyFurniture: (id: string) => { ok: boolean; reason?: string };
  placeFurniture: (key: FurnitureKey) => void;
  toast: (text: string) => void;
};

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(mockUser);
  const [furniture, setFurniture] = useState<FurnitureItem[]>(mockFurniture);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 1800);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(u => ({ ...u, ...patch }));
  }, []);

  const updateLayout = useCallback((patch: Partial<RoomLayout>) => {
    setUser(u => ({ ...u, layout: { ...u.layout, ...patch } }));
  }, []);

  const buyFurniture = useCallback((id: string) => {
    const item = furniture.find(f => f.id === id);
    if (!item) return { ok: false, reason: '없는 가구예요.' };
    if (item.owned) return { ok: false, reason: '이미 보유한 가구예요.' };
    if (item.unlockLevel && user.level < item.unlockLevel) {
      return { ok: false, reason: `Lv.${item.unlockLevel} 이상에서 해금돼요.` };
    }
    if (user.points < item.price) {
      return { ok: false, reason: '포인트가 부족해요.' };
    }
    setUser(u => ({ ...u, points: u.points - item.price }));
    setFurniture(fs => fs.map(f => f.id === id ? { ...f, owned: true } : f));
    return { ok: true };
  }, [furniture, user.level, user.points]);

  const placeFurniture = useCallback((key: FurnitureKey) => {
    setUser(u => {
      const next: RoomLayout = { ...u.layout };
      switch (key) {
        case 'bed-purple':
        case 'bed-yellow':
          next.bed = key; break;
        case 'desk':    next.desk = !next.desk; break;
        case 'chair':   next.chair = !next.chair; break;
        case 'lamp':    next.lamp = !next.lamp; break;
        case 'plant':   next.plant = !next.plant; break;
        case 'beanbag': next.beanbag = !next.beanbag; break;
        case 'frame':   next.frame = !next.frame; break;
        case 'rug':     next.rug = !next.rug; break;
      }
      return { ...u, layout: next };
    });
  }, []);

  return (
    <StoreCtx.Provider value={{ user, furniture, toasts, updateUser, updateLayout, buyFurniture, placeFurniture, toast }}>
      {children}
      {toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be inside <StoreProvider>');
  return v;
}
