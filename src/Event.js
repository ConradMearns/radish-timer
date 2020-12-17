export const EventType = {
    POMODORO: 'pomodoro',
    SPRINT: 'sprint',
}

export class Event {
    constructor(name="new event") {
        this.name = name;
        this.created = undefined;
        this.used = [];
        this.hide = false;
        this.starred = false;
        this.type = EventType.POMODORO
    }
}