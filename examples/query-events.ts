import { MailBoxIndexer, SQLiteAdapter } from '../indexer';
import { PublicKey } from '@solana/web3.js';

async function queryExamples() {
    const database = new SQLiteAdapter('./mailbox_events.db');
    await database.init();

    try {
        console.log('=== Query Examples ===\n');

        console.log('1. Get all events:');
        const allEvents = await database.getEvents({ limit: 5 });
        console.log(`Found ${allEvents.length} events`);
        allEvents.forEach(event => {
            console.log(`  - ${event.eventName} at slot ${event.slot}`);
        });

        console.log('\n2. Get MailSent events only:');
        const mailSentEvents = await database.getEvents({
            eventNames: ['MailSent'],
            limit: 3
        });
        console.log(`Found ${mailSentEvents.length} MailSent events`);
        mailSentEvents.forEach(event => {
            if (event.eventName === 'MailSent') {
                console.log(`  - From: ${event.data.from.toString()}`);
                console.log(`    To: ${event.data.to.toString()}`);
                console.log(`    Subject: ${event.data.subject}`);
            }
        });

        console.log('\n3. Get events by specific address:');
        const userAddress = 'So11111111111111111111111111111111111111112'; // Example address
        const userEvents = await database.getEventsByAddress(userAddress, 3);
        console.log(`Found ${userEvents.length} events for address ${userAddress}`);

        console.log('\n4. Get events by date range:');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const recentEvents = await database.getEvents({
            startTime: yesterday,
            endTime: new Date(),
            limit: 5
        });
        console.log(`Found ${recentEvents.length} events in the last 24 hours`);

        console.log('\n5. Get events from specific program:');
        const programEvents = await database.getEventsByProgramId(
            'Your_Mailer_Program_ID', 
            3
        );
        console.log(`Found ${programEvents.length} events from Mailer program`);

        console.log('\n6. Get domain registration events:');
        const domainEvents = await database.getEvents({
            eventNames: ['DomainRegistered', 'DomainExtended'],
            limit: 3
        });
        console.log(`Found ${domainEvents.length} domain events`);
        domainEvents.forEach(event => {
            if (event.eventName === 'DomainRegistered' || event.eventName === 'DomainExtended') {
                console.log(`  - ${event.eventName}: ${event.data.domain}`);
                console.log(`    Registrar: ${event.data.registrar.toString()}`);
                console.log(`    Expires: ${new Date(event.data.expiration * 1000).toISOString()}`);
            }
        });

    } catch (error) {
        console.error('Error querying events:', error);
    } finally {
        await database.close();
    }
}

async function restApiExamples() {
    console.log('\n=== REST API Examples ===\n');
    
    const baseUrl = 'http://localhost:3001';

    const examples = [
        'GET /health',
        'GET /events?limit=10',
        'GET /events?eventNames=MailSent&limit=5',
        'GET /events?startSlot=100000&endSlot=200000',
        'GET /events/address/So11111111111111111111111111111111111111112',
        'GET /events/program/Your_Mailer_Program_ID',
        'GET /events/signature/5j7s...signature',
        'GET /stats'
    ];

    console.log('Available REST endpoints:');
    examples.forEach(example => {
        console.log(`  curl "${baseUrl}${example.replace('GET ', '')}"`);
    });

    console.log('\nExample with curl:');
    console.log(`curl "${baseUrl}/events?eventNames=MailSent&limit=3" | jq`);
}

async function webSocketExample() {
    console.log('\n=== WebSocket Examples ===\n');

    const WebSocket = require('ws');
    const ws = new WebSocket('ws://localhost:8081');

    ws.on('open', () => {
        console.log('Connected to WebSocket');

        ws.send(JSON.stringify({
            type: 'subscribe',
            filter: {
                eventNames: ['MailSent', 'DomainRegistered']
            }
        }));

        ws.send(JSON.stringify({
            type: 'query',
            query: { limit: 2 }
        }));
    });

    ws.on('message', (data: any) => {
        const message = JSON.parse(data);
        console.log('Received:', message);
        
        if (message.type === 'event') {
            console.log(`New event: ${message.event.eventName} at slot ${message.event.slot}`);
        }
    });

    setTimeout(() => {
        console.log('Closing WebSocket connection');
        ws.close();
    }, 5000);
}

if (require.main === module) {
    queryExamples()
        .then(() => restApiExamples())
        .then(() => webSocketExample())
        .catch(console.error);
}