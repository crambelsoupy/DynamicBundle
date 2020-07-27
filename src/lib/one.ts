
import * as uuid from 'uuid';

export interface One {
    uuid?: string
    value: number
}
export function One(config: One): One {
    return {
        uuid: config.uuid ?? `UUID-${uuid.v4()}`,
        value: config.value,
    }
}