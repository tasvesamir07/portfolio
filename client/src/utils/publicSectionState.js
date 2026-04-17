export const getNoDataLabel = (language = 'en') => {
    if (language === 'bn') {
        return '\u0995\u09CB\u09A8\u09CB \u09A4\u09A5\u09CD\u09AF \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964';
    }

    if (language === 'ko') {
        return '\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.';
    }

    return 'No data found.';
};
