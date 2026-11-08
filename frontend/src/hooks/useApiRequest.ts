import { useCallback } from 'react';

export type ApiResult = { ok: true } | { ok: false; error: string };

export default function useApiRequest(
    token: string,
    setStats: React.Dispatch<React.SetStateAction<IStats>>,
) {
    return useCallback(
        async (
            endpoint: keyof IStats,
            method: 'GET' | 'POST',
            body?: any,
        ): Promise<ApiResult> => {
            try {
                const response = await fetch(
                    `http://localhost:8000/api/${endpoint}`,
                    {
                        method: method,
                        headers: {
                            Authorization: `Bearer ${token}`,
                            ...(body !== undefined && {
                                'Content-Type': 'application/json',
                            }),
                        },
                        body:
                            body !== undefined
                                ? JSON.stringify(body)
                                : undefined,
                    },
                );

                const json = await response.json();

                if (!response.ok) {
                    return {
                        ok: false,
                        error: json.message ?? `HTTP ${response.status}`,
                    };
                }

                setStats((prev) => ({ ...prev, ...json }));
                return { ok: true };
            } catch (e) {
                return { ok: false, error: String(e) };
            }
        },
        [token, setStats],
    );
}
