import { useEffect, useMemo, useState } from 'react';
import type { ApiRequest } from '../hooks/useApiRequest';
import Fish from './Fish';

export default function FishGrid({
    token,
    stats,
    apiRequest,
}: {
    token: string;
    stats: IStats;
    apiRequest: ApiRequest;
}) {
    const [fish, setFish] = useState<IFish[]>([]);
    const fishById = useMemo(
        () => new Map(fish.map((f) => [f._id, f])),
        [fish],
    );
    const caught = useMemo(() => new Set(stats.almanac), [stats.almanac]);
    const [selection, setSelection] = useState<'alm' | 'inv'>('alm');

    async function getGameFish() {
        return await fetch('http://localhost:8000/api/fish', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => response.json())
            .then((data) => setFish(data.fish));
    }
    // Fetch the fish list once per login
    useEffect(() => {
        if (!token) return;
        getGameFish();
    }, [token]);

    // Load the visible tab straight away
    useEffect(() => {
        if (!token) return;
        apiRequest(selection === 'alm' ? 'almanac' : 'inventory', 'GET');
    }, [token, selection, apiRequest]);

    // Poll the visible tab every 15 seconds
    useEffect(() => {
        if (!token) return;
        const interval = setInterval(() => {
            apiRequest(selection === 'alm' ? 'almanac' : 'inventory', 'GET');
        }, 15000);
        return () => clearInterval(interval);
    }, [token, selection, apiRequest]);

    // The response holds the updated inventory and money, so no refetch needed
    const sellFish = (fishId: string) =>
        apiRequest('inventory', 'DELETE', { fishId });

    return (
        <div className='p-5 border-2 border-white rounded-lg w-full h-full overflow-y-scroll select-none'>
            <div className='flex gap-2 bg-[rgba(0,0,0,0.5)] m-auto mb-5 p-2 w-fit text-2xl'>
                <button
                    className='hover:bg-[rgba(0,0,0,0.5)] p-1 border-2 w-60 hover:cursor-pointer'
                    onClick={() => setSelection('alm')}
                >
                    Almanac
                </button>
                <button
                    className='hover:bg-[rgba(0,0,0,0.5)] p-1 border-2 w-60 hover:cursor-pointer'
                    onClick={() => setSelection('inv')}
                >
                    Inventory
                </button>
            </div>

            <div className='justify-center gap-5 grid grid-cols-[repeat(auto-fill,160px)]'>
                {selection === 'alm'
                    ? fish.map((fish: IFish) => (
                          <Fish
                              key={fish._id}
                              fish={fish}
                              unlocked={caught.has(fish._id)}
                          />
                      ))
                    : stats.inventory.map(({ fish: fishId, quantity }) => {
                          const f = fishById.get(fishId);
                          if (!f) return null;

                          return (
                              <Fish
                                  key={fishId}
                                  fish={f}
                                  unlocked
                                  quantity={quantity}
                                  onSell={() => sellFish(fishId)}
                              />
                          );
                      })}
            </div>
        </div>
    );
}
