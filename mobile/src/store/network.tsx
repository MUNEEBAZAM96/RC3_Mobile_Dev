import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Network from 'expo-network';

import { clearPending, listPending } from '../database/pending';

export type NetworkStatus = 'online' | 'offline' | 'syncing';

interface NetworkValue {
  status: NetworkStatus;
  pending: number;
  notice: string | null;
  refreshPending: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<NetworkStatus>('online');
  const [pending, setPending] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    const rows = await listPending();
    setPending(rows.length);
  }, []);

  const syncNow = useCallback(async () => {
    const net = await Network.getNetworkStateAsync();
    if (net.isConnected === false) {
      setStatus('offline');
      setNotice('You are offline. Pending actions stay on this phone.');
      await refreshPending();
      return;
    }
    setStatus('syncing');
    const rows = await listPending();
    await clearPending();
    setPending(0);
    setStatus('online');
    setNotice(rows.length > 0 ? 'Local queue cleared. Send these to your API when the hackathon needs a server.' : null);
  }, [refreshPending]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const net = await Network.getNetworkStateAsync();
      if (!alive) return;
      setStatus(net.isConnected === false ? 'offline' : 'online');
      const rows = await listPending();
      if (!alive) return;
      setPending(rows.length);
    })();
    const subscription = Network.addNetworkStateListener((event) => {
      setStatus(event.isConnected === false ? 'offline' : 'online');
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo(
    () => ({ status, pending, notice, refreshPending, syncNow }),
    [status, pending, notice, refreshPending, syncNow],
  );
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkValue {
  const value = useContext(NetworkContext);
  if (!value) throw new Error('useNetwork must be used inside NetworkProvider');
  return value;
}
