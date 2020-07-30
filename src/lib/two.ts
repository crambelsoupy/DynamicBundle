
export interface Two {
    uuid?: string
    name: string
}
export function Two(config: Two): Two {
    return {
        uuid: config.uuid ?? `UUID`,
        name: config.name,
    }
}