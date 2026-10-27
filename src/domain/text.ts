/** "1 item", "2 items"; pass the plural form for irregular words. */
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
