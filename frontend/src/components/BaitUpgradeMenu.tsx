export default function BaitUpgradeMenu({
    isHovering,
    handleMouseOver,
    handleMouseOut,
    apiRequest,
    stats,
}: {
    isHovering: boolean;
    handleMouseOver: () => void;
    handleMouseOut: () => void;
    apiRequest: (
        endpoint: keyof IStats,
        method: 'GET' | 'POST',
        body?: any,
    ) => Promise<{ ok: true } | { ok: false; error: string }>;
    stats: IStats;
}) {
    interface IBait {
        img: string;
        alt: string;
        price: number;
        rarity: number;
    }

    const baits: IBait[] = [
        {
            img: 'common_bait.png',
            alt: 'Common bait upgrade',
            price: 0,
            rarity: 0,
        },
        {
            img: 'uncommon_bait.png',
            alt: 'Uncommon bait upgrade',
            price: 250,
            rarity: 1,
        },
        {
            img: 'rare_bait.png',
            alt: 'Rare bait upgrade',
            price: 800,
            rarity: 2,
        },
        {
            img: 'epic_bait.png',
            alt: 'Epic bait upgrade',
            price: 1500,
            rarity: 3,
        },
        {
            img: 'legendary_bait.png',
            alt: 'Legendary bait upgrade',
            price: 2500,
            rarity: 4,
        },
    ];

    async function handleBuy(bait: IBait) {
        const result = await apiRequest('baits', 'POST', { bait: bait.rarity });

        if (result.ok) {
            handleEquip(bait);
        }
    }

    function handleEquip(bait: IBait) {
        if (stats.equippedBait !== bait.rarity) {
            apiRequest('equippedBait', 'POST', { bait: bait.rarity });
        }
        handleMouseOut();
    }

    return (
        isHovering && (
            <div
                className='top-[150px] right-[250px] z-10 absolute flex gap-2 bg-[rgba(83,107,143,0.95)] p-5 border-2 border-white rounded-lg'
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
            >
                {baits.map((bait, i) => (
                    <div
                        key={i}
                        className={`place-content-center grid hover:bg-[rgba(0,0,0,0.1)] relative border-2 border-white w-20 hover:cursor-pointer h-20 ${!stats.baits.includes(i) && 'bg-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.2)]'}`}
                        onClick={
                            !stats.baits.includes(i)
                                ? () => handleBuy(bait)
                                : () => handleEquip(bait)
                        }
                    >
                        <img
                            src={`/gear/${bait.img}`}
                            alt={bait.alt}
                            className={`w-[64px] pixelart-rescale ${!stats.baits.includes(i) && 'fish-locked'}`}
                        />
                        {!stats.baits.includes(i) && (
                            <p className='top-1/2 left-1/2 absolute -rotate-45 -translate-1/2'>
                                ${bait.price}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        )
    );
}
