require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { query } = require('../db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question, secure = false) {
    return new Promise((resolve) => {
        if (secure) {
            // Hide password input
            const stdin = process.stdin;
            process.stdout.write(question);
            stdin.resume();
            stdin.setRawMode(true);
            let input = '';
            
            const onData = (char) => {
                char = char.toString();
                switch (char) {
                    case '\n':
                    case '\r':
                    case '\u0004': // End of transmission
                        stdin.setRawMode(false);
                        stdin.pause();
                        process.stdout.write('\n');
                        stdin.removeListener('data', onData);
                        resolve(input);
                        break;
                    case '\u0003': // Ctrl+C
                        process.exit();
                        break;
                    default:
                        // backspace
                        if (char === '\x7f' || char === '\b') {
                            if (input.length > 0) {
                                input = input.slice(0, -1);
                                process.stdout.write('\b \b');
                            }
                        } else {
                            input += char;
                            process.stdout.write('*');
                        }
                        break;
                }
            };
            
            stdin.on('data', onData);
        } else {
            rl.question(question, (answer) => {
                resolve(answer);
            });
        }
    });
}

async function main() {
    console.log('--- Secure Admin User Creator/Updater ---');
    
    const username = await ask('Enter admin username: ');
    if (!username) {
        console.error('Username cannot be empty.');
        rl.close();
        process.exit(1);
    }
    
    const email = await ask('Enter admin email: ');
    if (!email) {
        console.error('Email cannot be empty.');
        rl.close();
        process.exit(1);
    }
    
    const password = await ask('Enter admin password: ', true);
    if (!password || password.length < 6) {
        console.error('Password must be at least 6 characters long.');
        rl.close();
        process.exit(1);
    }
    
    const confirmPassword = await ask('Confirm admin password: ', true);
    if (password !== confirmPassword) {
        console.error('Passwords do not match.');
        rl.close();
        process.exit(1);
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Check if user already exists
        const checkRes = await query('SELECT id FROM users WHERE username = $1', [username]);
        
        if (checkRes.rows && checkRes.rows.length > 0) {
            console.log(`User "${username}" already exists. Updating credentials...`);
            await query(
                'UPDATE users SET email = $1, password_hash = $2 WHERE username = $3',
                [email, passwordHash, username]
            );
            console.log(`User "${username}" updated successfully!`);
        } else {
            console.log(`Creating new user "${username}"...`);
            await query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
                [username, email, passwordHash]
            );
            console.log(`User "${username}" created successfully!`);
        }
    } catch (err) {
        console.error('Error saving user to database:', err);
    } finally {
        rl.close();
        // Force exit in case neon/pg pool is keeping the event loop open
        process.exit(0);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
