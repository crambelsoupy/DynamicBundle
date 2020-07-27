
import uuidv5 from 'uuid/v5';

export interface Two {
    uuid?: string
    name: string
}
export function Two(config: Two): Two {
    return {
        uuid: config.uuid ?? `UUID-${uuidv5(config.name, "namespace")}`,
        name: config.name,
    }
}