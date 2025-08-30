// Centralized runtime config flags
// Usage: set process.env.HIDE_TWEETS="true" to hide tweet content

export const HIDE_TWEETS: boolean = (process.env.HIDE_TWEETS || '').toLowerCase() === 'true';


