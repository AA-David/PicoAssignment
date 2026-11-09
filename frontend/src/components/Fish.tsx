const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

interface FishProps {
    fish: IFish;
    unlocked: boolean;
    quantity?: number;
    onSell?: () => void;
}

export default function Fish({ fish, unlocked, quantity, onSell }: FishProps) {
    return (
        <div className='group relative flex flex-col justify-center items-center bg-[rgba(0,0,0,0.3)] border-2 border-white rounded-lg w-40 h-40 text-white text-center hover:cursor-default'>
            <p>{unlocked && fish.name}</p>
            <img
                src={`/fish/${fish.img}`}
                alt={fish.name + "'s image"}
                className={`pixelart-rescale w-[64px] ${!unlocked && 'fish-locked'}`}
                draggable='false'
            />
            <p>{unlocked && RARITIES[fish.rarity]}</p>

            {/* Darkens the card on hover */}
            {onSell && (
                <div className='absolute inset-0 bg-[rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none' />
            )}

            {/* Drawn after the overlay so the quantity isn't darkened */}
            {quantity !== undefined && (
                <div className='absolute inset-0 flex justify-between items-center px-2 pointer-events-none'>
                    {onSell && (
                        <button
                            className='invisible group-hover:visible ml-2 hover:bg-[rgba(0,0,0,0.5)] p-1 border-2 w-fit text-lg hover:cursor-pointer pointer-events-auto'
                            onClick={onSell}
                        >
                            SELL
                        </button>
                    )}
                    <span className='ml-auto'>x{quantity}</span>
                </div>
            )}
        </div>
    );
}
