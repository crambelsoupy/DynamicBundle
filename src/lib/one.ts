
export interface One {
    uuid?: string
    value: number
}
export function One(config: One): One {
    return {
        uuid: config.uuid ?? `UUID`,
        value: config.value,
    }
}