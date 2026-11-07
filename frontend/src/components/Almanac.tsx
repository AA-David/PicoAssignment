import { useState } from 'react';
import fishData from '../fishData.json';
import Fish from './Fish';

export default function Almanac() {
    const [unlockedFish, setUnlockedFish] = useState<IFish[]>([]);

    return (
        <div className='gap-5 grid grid-cols-7 p-5 border-2 border-white rounded-lg h-full overflow-x-clip overflow-y-scroll select-none'>
            {fishData.map((fish: IFish) => {
                return <Fish fish={fish} unlockedFish={unlockedFish} />;
            })}
        </div>
    );
}
