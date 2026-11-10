interface IFish {
    _id: string;
    name: string;
    img: string;
    rarity: number;
    price: number;
}

interface IInventoryFish {
    fish: string;
    quantity: number;
}

interface IStats {
    money: number;
    luck: number;
    rod: number;
    baits: number[];
    equippedBait: number;
    almanac: string[];
    inventory: IInventoryFish[];
}
