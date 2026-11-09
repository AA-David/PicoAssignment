const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

interface FishProps {
    fish: IFish;
    unlocked: boolean;
    quantity?: number;
}

export default function Fish({ fish, unlocked, quantity }: FishProps) {
    return (
        <div className='relative flex flex-col justify-center items-center bg-[rgba(0,0,0,0.3)] border-2 border-white rounded-lg w-36 h-36 text-white text-center hover:cursor-default'>
            {quantity !== undefined && (
                <span className='top-1/2 right-2 absolute -translate-y-1/2'>
                    x{quantity}
                </span>
            )}
            <p>{unlocked && fish.name}</p>
            <img
                src={`/fish/${fish.img}`}
                alt={fish.name + "'s image"}
                className={`pixelart-rescale w-[64px] ${!unlocked && 'fish-locked'}`}
                draggable='false'
            />
            <p>{unlocked && RARITIES[fish.rarity]}</p>
        </div>
    );
}
