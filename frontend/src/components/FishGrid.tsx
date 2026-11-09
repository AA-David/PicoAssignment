import { useEffect, useState } from 'react';
import fishData from '../fishData.json';
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
    const [selection, setSelection] = useState<'alm' | 'inv'>('alm');

    useEffect(() => {
        if (!token) return;
        // Refetch whenever the tab changes so new catches show up
        apiRequest(selection === 'alm' ? 'almanac' : 'inventory', 'GET');
    }, [token, selection, apiRequest]);

    // The response holds the updated inventory and money, so no refetch needed
    const sellFish = (fish: IFish) =>
        apiRequest('inventory', 'DELETE', { name: fish.name });

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
                    ? fishData.map((fish: IFish) => (
                          <Fish
                              key={fish.name}
                              fish={fish}
                              unlocked={stats.almanac.some(
                                  (f) => f.img === fish.img,
                              )}
                          />
                      ))
                    : stats.inventory.map((fish) => (
                          <Fish
                              key={fish.name}
                              fish={fish}
                              unlocked
                              quantity={fish.quantity}
                              onSell={() => sellFish(fish)}
                          />
                      ))}
            </div>
        </div>
    );
}
