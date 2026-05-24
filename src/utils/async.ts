export const pLimit = (limit: number) => {
    let active = 0;
    const queue: (() => void)[] = [];
    const next = () => {
        active--;
        if (queue.length > 0) {
            const head = queue.shift();
            if (head) head();
        }
    };
    return async <T,>(fn: () => Promise<T>): Promise<T> => {
        if (active >= limit) {
            await new Promise<void>(resolve => queue.push(resolve));
        }
        active++;
        try {
            return await fn();
        } finally {
            next();
        }
    };
};
