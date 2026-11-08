import { useEffect, useState } from 'react';
import BaitUpgradeMenu from './BaitUpgradeMenu';
import useApiRequest from '../hooks/useApiRequest';

export default function Shop({
    token,
    handleMouseOver,
    handleMouseOut,
    isHovering,
}: {
    token: string;
    handleMouseOver: () => void;
    handleMouseOut: () => void;
    isHovering: boolean;
}) {
    const RARITIES = [
        'common',
        'uncommon',
        'rare',
        'epic',
        'legendary',
    ] as const;
    type rarities = (typeof RARITIES)[number];

    const [stats, setStats] = useState<IStats>({
        money: 0,
        luck: 0,
        rod: 0,
        baits: [0],
        equippedBait: 0,
    });

    const [rodImg, setRodImg] = useState<rarities>(RARITIES[stats.rod]);
    const [baitImg, setBaitImg] = useState<rarities>(
        RARITIES[stats.equippedBait],
    );

    const apiRequest = useApiRequest(token, setStats);

    useEffect(() => {
        if (!token) return;
        apiRequest('money', 'GET');
        apiRequest('luck', 'GET');
        apiRequest('rod', 'GET');
        apiRequest('equippedBait', 'GET');
        apiRequest('baits', 'GET');
    }, [token]);

    useEffect(() => {
        setRodImg(RARITIES[stats.rod]);
        setBaitImg(RARITIES[stats.equippedBait]);
    }, [stats.rod, stats.equippedBait]);

    const ROD_PRICES = [0, 300, 1800, 5000, 10000] as const;
    const LUCK_PRICES = [0, 500, 1500, 4000, 10000, 25000] as const;

    return (
        <div className='px-10 py-5 border-white border-x-2 border-b-2 rounded-b-lg w-fit text-center'>
            <BaitUpgradeMenu
                isHovering={isHovering}
                handleMouseOver={handleMouseOver}
                handleMouseOut={handleMouseOut}
                apiRequest={apiRequest}
                stats={stats}
            />

            <div className='flex justify-between mb-3'>
                <p>SHOP</p>
                <p>${stats.money}</p>
            </div>

            <div className='flex justify-center gap-8'>
                <div>
                    <div
                        className='place-content-center grid mb-2 border-2 border-white w-24 h-24 hover:cursor-pointer'
                        onClick={() => apiRequest('luck', 'POST')}
                    >
                        <img
                            src='/gear/luck.png' // AI GENERATED, TODO: draw a better one
                            alt='Fishing rod upgrade'
                            className='w-[64px] pixelart-rescale'
                        />
                        <p>{stats.luck}/5</p>
                    </div>
                    {LUCK_PRICES[stats.luck + 1] !== undefined ? (
                        <p>${LUCK_PRICES[stats.luck + 1]}</p>
                    ) : (
                        <p>MAX</p>
                    )}
                </div>

                <div>
                    <div
                        className='place-content-center grid mb-2 border-2 border-white w-24 h-24 hover:cursor-pointer'
                        onClick={() => apiRequest('rod', 'POST')}
                    >
                        <img
                            src={`/gear/${rodImg}_rod.png`}
                            alt='Fishing rod upgrade'
                            className='w-[64px] pixelart-rescale'
                        />
                        <p>{stats.rod + 1}/5</p>
                    </div>
                    {ROD_PRICES[stats.rod + 1] !== undefined ? (
                        <p>${ROD_PRICES[stats.rod + 1]}</p>
                    ) : (
                        <p>MAX</p>
                    )}
                </div>

                <div
                    className='grid border-2 border-white w-24 h-24 hover:cursor-pointer'
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                >
                    <img
                        src={`/gear/${baitImg}_bait.png`}
                        alt='Bait upgrade'
                        className='place-self-center w-[64px] pixelart-rescale'
                    />
                    <p>{stats.equippedBait + 1}/5</p>
                </div>
            </div>
        </div>
    );
}
