export default async function readPico(
    setToken: React.Dispatch<React.SetStateAction<string>>,
    portRef: React.RefObject<SerialPort | null>,
) {
    if (portRef.current) return;

    const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x2e8a }],
    });
    await port.open({ baudRate: 115200 });

    portRef.current = port;

    const decoder = new TextDecoderStream();
    port.readable?.pipeTo(
        decoder.writable as unknown as WritableStream<Uint8Array>,
    );
    const reader = decoder.readable.getReader();

    let buffer = '';
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop()!;
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed.value) setToken(parsed.value);
                } catch (e) {
                    console.log('Bad line from Pico:', trimmed, e);
                }
            }
        }
    } catch (e) {
        console.log(e);
    } finally {
        reader.releaseLock();
        portRef.current = null;
    }
}
