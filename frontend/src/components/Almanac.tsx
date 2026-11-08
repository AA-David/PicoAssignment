import { useEffect, useState } from 'react';
import fishData from '../fishData.json';
import Fish from './Fish';

export default function Almanac({ token }: { token: string }) {
    const [unlockedFish, setUnlockedFish] = useState<IFish[]>([]);

    function getAlmanac() {
        fetch('http://localhost:8000/api/almanac', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => response.json())
            .then((json) => setUnlockedFish(json.almanac));
    }

    useEffect(() => {
        if (!token) return;
        getAlmanac();
    }, [token]);

    return (
        <div className='justify-center gap-5 grid grid-cols-[repeat(auto-fill,144px)] p-5 border-2 border-white rounded-lg w-full h-full overflow-x-clip overflow-y-scroll select-none'>
            {fishData.map((fish: IFish) => {
                return (
                    <Fish
                        key={fish.name}
                        fish={fish}
                        unlockedFish={unlockedFish}
                    />
                );
            })}
        </div>
    );
}
