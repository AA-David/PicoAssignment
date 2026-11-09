import { useEffect, useState } from 'react';
import fishData from '../fishData.json';
import Fish from './Fish';

export default function FishGrid({ token }: { token: string }) {
    // TEMP: placeholder data from fishData.json for testing the UI
    const [almanac, setAlmanac] = useState<IFish[]>(fishData.slice(0, 6));
    const [inventory, setInventory] = useState<IInventoryFish[]>(
        fishData.slice(0, 4).map((fish, i) => ({ ...fish, quantity: i + 1 })),
    );
    const [selection, setSelection] = useState<'alm' | 'inv'>('alm');

    useEffect(() => {
        if (!token) return;
        // Refetch whenever the tab changes so new catches show up
        const [endpoint, setter] =
            selection === 'alm'
                ? (['almanac', setAlmanac] as const)
                : (['inventory', setInventory] as const);

        fetch(`http://localhost:8000/api/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((json) => setter(json[endpoint]));
    }, [token, selection]);

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

            <div className='justify-center gap-5 grid grid-cols-[repeat(auto-fill,144px)]'>
                {selection === 'alm'
                    ? fishData.map((fish: IFish) => (
                          <Fish
                              key={fish.name}
                              fish={fish}
                              unlocked={almanac?.some(
                                  (f) => f.img === fish.img,
                              )}
                          />
                      ))
                    : inventory?.map((fish) => (
                          <Fish
                              key={fish.name}
                              fish={fish}
                              unlocked
                              quantity={fish.quantity}
                          />
                      ))}
            </div>
        </div>
    );
}
