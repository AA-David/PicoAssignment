export default function BaitUpgradeMenu({
    isHovering,
    handleMouseOver,
    handleMouseOut,
}: {
    isHovering: boolean;
    handleMouseOver: () => void;
    handleMouseOut: () => void;
}) {
    const baits = [
        {
            img: 'common_bait.png',
            alt: 'Common bait upgrade',
        },
        {
            img: 'uncommon_bait.png',
            alt: 'Uncommon bait upgrade',
        },
        {
            img: 'rare_bait.png',
            alt: 'Rare bait upgrade',
        },
        {
            img: 'epic_bait.png',
            alt: 'Epic bait upgrade',
        },
        {
            img: 'legendary_bait.png',
            alt: 'Legendary bait upgrade',
        },
    ];

    return (
        isHovering && (
            <div
                className='top-[103px] left-[845px] z-10 absolute flex gap-2 backdrop-blur-3xl p-5 border-2 border-white rounded-lg'
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
            >
                {baits.map((bait) => (
                    <div className='place-content-center grid hover:bg-[rgba(0,0,0,0.1)] border-2 border-white w-20 h-20 hover:cursor-pointer'>
                        <img
                            src={`/gear/${bait.img}`}
                            alt={bait.alt}
                            className='w-[64px] pixelart-rescale'
                        />
                    </div>
                ))}
            </div>
        )
    );
}
