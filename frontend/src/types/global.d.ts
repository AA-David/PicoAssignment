interface IFish {
    name: string;
    img: string;
    rarity: number;
    price: number;
}

interface IInventoryFish extends IFish {
    quantity: number;
}

interface IStats {
    money: number;
    luck: number;
    rod: number;
    baits: number[];
    equippedBait: number;
    almanac: IFish[];
    inventory: IInventoryFish[];
}
