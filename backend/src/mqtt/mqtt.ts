import mqtt from 'mqtt';
import { addToAlmanac, addToInventory } from '../services/user.service.js';
import mongoose from 'mongoose';
import User from '../models/user.model.js';

let client: mqtt.MqttClient;

export const startMqtt = () => {
    client = mqtt.connect('mqtts://broker.hivemq.com:8883');

    client.on('connect', () => {
        console.log('MQTT connected');
        client.subscribe('picoAssignmentDWL/+/catch', { qos: 1 });
    });

    // Fish caught
    client.on('message', async (topic, payload) => {
        let data: { fishId?: string };
        try {
            data = JSON.parse(payload.toString());
        } catch {
            return; // invalid JSON, ignore it
        }

        const hash = topic.split('/')[1];
        const fishId = data?.fishId;

        if (!hash) return;

        let user;
        try {
            user = await User.findOne({ login: hash });
        } catch {
            return;
        }

        if (!user) return;

        const playerId = user._id.toString();

        await addToInventory(playerId, fishId).catch((e) =>
            console.log('Adding fish to inventory failed:', e),
        );

        await addToAlmanac(playerId, hash, fishId).catch((e) =>
            console.log('Adding fish to almanac failed:', e),
        );
    });

    client.on('reconnect', () => console.log('MQTT reconnecting...'));
    client.on('offline', () => console.warn('MQTT offline'));
    client.on('error', (e) => console.error('MQTT error:', e.message));
};

// Upgrades updated
export const publishState = (
    playerLogin: string,
    state: {
        rod: number;
        luck: number;
        baits: number[];
        equippedBait: number;
        almanac: mongoose.Types.ObjectId[];
    },
) => {
    client.publish(
        `picoAssignmentDWL/${playerLogin}/state`,
        JSON.stringify(state),
        { qos: 1 },
    );
};
