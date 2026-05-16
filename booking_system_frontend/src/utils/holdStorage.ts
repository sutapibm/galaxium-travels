import type { StoredHold } from '../types';

const KEY_PREFIX = 'galaxium_holds_';

const normalizeStoredHold = (hold: Partial<StoredHold>): StoredHold | null => {
  if (!hold.holdId || !hold.quoteId || !hold.flightId || !hold.seatClass || !hold.reservedUntil) {
    return null;
  }

  return {
    holdId: hold.holdId,
    quoteId: hold.quoteId,
    flightId: hold.flightId,
    seatClass: hold.seatClass,
    adultCount: hold.adultCount ?? 1,
    lapInfantCount: hold.lapInfantCount ?? 0,
    seatedInfantCount: hold.seatedInfantCount ?? 0,
    pricePerSeat: hold.pricePerSeat ?? 0,
    adultSubtotal: hold.adultSubtotal ?? hold.pricePerSeat ?? 0,
    lapInfantSubtotal: hold.lapInfantSubtotal ?? 0,
    seatedInfantSubtotal: hold.seatedInfantSubtotal ?? 0,
    totalPrice: hold.totalPrice ?? hold.pricePerSeat ?? 0,
    reservedUntil: hold.reservedUntil,
  };
};

export const getStoredHolds = (userId: number): StoredHold[] => {
  try {
    const data = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    if (!data) return [];
    const parsed = JSON.parse(data) as Partial<StoredHold>[];
    return parsed
      .map(normalizeStoredHold)
      .filter((hold): hold is StoredHold => hold !== null);
  } catch {
    return [];
  }
};

export const storeHold = (userId: number, hold: StoredHold): void => {
  const holds = getStoredHolds(userId);
  const updated = [...holds.filter((h) => h.holdId !== hold.holdId), hold];
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(updated));
};

export const removeHold = (userId: number, holdId: string): void => {
  const holds = getStoredHolds(userId);
  const updated = holds.filter((h) => h.holdId !== holdId);
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(updated));
};

// Made with Bob
