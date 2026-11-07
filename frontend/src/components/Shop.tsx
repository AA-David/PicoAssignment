export default function Shop({
    handleMouseOver,
    handleMouseOut,
}: {
    handleMouseOver: () => void;
    handleMouseOut: () => void;
}) {
    return (
        <div className='flex justify-center gap-8 mb-24 px-10 py-5 border-white border-x-2 border-b-2 rounded-b-lg w-fit'>
            <div className='place-content-center grid border-2 border-white w-24 h-24 hover:cursor-pointer'>
                <img
                    src='/gear/luck.png' // AI GENERATED, TODO: draw a better one
                    alt='Fishing rod upgrade'
                    className='w-[64px] pixelart-rescale'
                />
            </div>

            <div className='place-content-center grid border-2 border-white w-24 hover:cursor-pointer'>
                <img
                    src='/gear/common_rod.png'
                    alt='Fishing rod upgrade'
                    className='w-[64px] pixelart-rescale'
                />
            </div>

            <div
                className='grid border-2 border-white w-24 hover:cursor-pointer'
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
            >
                <img
                    src='/gear/common_bait.png'
                    alt='Bait upgrade'
                    className='place-self-center w-[64px] pixelart-rescale'
                />
            </div>
        </div>
    );
}
