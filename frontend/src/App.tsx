import { useEffect, useRef, useState } from 'react';
import useApiRequest from './hooks/useApiRequest';
import FishGrid from './components/FishGrid';
import Shop from './components/Shop';
import readPico from './utils/readPico';

function App() {
    const portRef = useRef<SerialPort | null>(null);
    const [token, setToken] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [stats, setStats] = useState<IStats>({
        money: 0,
        luck: 0,
        rod: 0,
        baits: [0],
        equippedBait: 0,
        almanac: [],
        inventory: [],
    });
    const apiRequest = useApiRequest(token, setStats);

    const handleMouseOver = () => {
        setIsHovering(true);
    };

    const handleMouseOut = () => {
        setIsHovering(false);
    };

    return (
        <>
            {/* Background image */}
            <div className='absolute bg-[url(/bg.png)] bg-cover bg-no-repeat bg-center w-full h-full pixelart-rescale'></div>

            <div className='flex flex-col items-center gap-6 backdrop-blur-[3px] mx-auto px-5 pb-5 border-white border-x-2 w-2/3 h-screen'>
                <Shop
                    handleMouseOver={handleMouseOver}
                    handleMouseOut={handleMouseOut}
                    token={token}
                    stats={stats}
                    apiRequest={apiRequest}
                    isHovering={isHovering}
                />

                <div className='flex gap-2 bg-[rgba(0,0,0,0.5)] p-2 text-2xl'>
                    <button
                        onClick={() => readPico(setToken, portRef)}
                        className='hover:bg-[rgba(0,0,0,0.5)] p-1 border-2 w-40 hover:cursor-pointer'
                    >
                        Login
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className='hover:bg-[rgba(0,0,0,0.5)] p-1 border-2 w-40 hover:cursor-pointer'
                    >
                        Logout
                    </button>
                </div>

                <FishGrid
                    token={token}
                    stats={stats}
                    apiRequest={apiRequest}
                />
            </div>
        </>
    );
}

export default App;
