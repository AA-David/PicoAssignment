import { useState } from 'react';
import Almanac from './components/Almanac';
import BaitUpgradeMenu from './components/BaitUpgradeMenu';
import Shop from './components/Shop';

function App() {
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseOver = () => {
        setIsHovering(true);
    };

    const handleMouseOut = () => {
        setIsHovering(false);
    };

    return (
        <>
            {/* Background image */}
            <div className='absolute bg-[url(/bg4.png)] bg-cover bg-no-repeat bg-center w-full h-full pixelart-rescale'></div>

            <BaitUpgradeMenu
                isHovering={isHovering}
                handleMouseOver={handleMouseOver}
                handleMouseOut={handleMouseOut}
            />

            <div className='flex flex-col items-center backdrop-blur-[3px] mx-auto pb-5 border-white border-x-2 w-2/3 h-screen'>
                <Shop
                    handleMouseOver={handleMouseOver}
                    handleMouseOut={handleMouseOut}
                />
                <Almanac />
            </div>
        </>
    );
}

export default App;
