interface FishProps {
    unlockedFish: IFish[];
    fish: IFish;
}

export default function Fish({ unlockedFish, fish }: FishProps) {
    const unlocked = unlockedFish?.some((f) => f.img === fish.img);

    let rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' =
        'common';
    switch (fish.rarity) {
        case 0:
            rarity = 'common';
            break;
        case 1:
            rarity = 'uncommon';
            break;
        case 2:
            rarity = 'rare';
            break;
        case 3:
            rarity = 'epic';
            break;
        case 4:
            rarity = 'legendary';
            break;
    }

    return (
        <div
            className='flex flex-col justify-center items-center bg-[rgba(0,0,0,0.3)] border-2 border-white rounded-lg w-36 h-36 text-white text-center hover:cursor-default'
            key={fish.img}
        >
            <p>{unlocked && fish.name}</p>
            <img
                src={`/fish/${fish.img}`}
                alt={fish.name + "'s image"}
                className={`pixelart-rescale w-[64px] ${!unlocked && 'fish-locked'}`}
                draggable='false'
            />
            <p>{unlocked && rarity}</p>
        </div>
    );
}
