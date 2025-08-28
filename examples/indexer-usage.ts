import { MailBoxIndexer } from '../indexer';
import { IndexerConfig } from '../indexer/types';

const config: IndexerConfig = {
    rpcEndpoint: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    programs: {
        mailer: 'Your_Mailer_Program_ID',
        mailService: 'Your_MailService_Program_ID', 
        mailBoxFactory: 'Your_MailBoxFactory_Program_ID'
    },
    database: {
        type: 'sqlite',
        url: './mailbox_events.db'
    },
    webhooks: [
        'https://your-app.com/webhooks/mailbox-events'
    ],
    batchSize: 100,
    pollInterval: 5000
};

async function main() {
    const indexer = new MailBoxIndexer(config);

    try {
        await indexer.start();

        console.log('Backfilling historical events...');
        const eventCount = await indexer.backfill(100000);
        console.log(`Indexed ${eventCount} historical events`);

        console.log('Indexer is running. Press Ctrl+C to stop.');
        
        process.on('SIGINT', async () => {
            console.log('Shutting down...');
            await indexer.stop();
            process.exit(0);
        });

        setInterval(() => {
            console.log('Indexer still running...');
        }, 30000);

    } catch (error) {
        console.error('Error starting indexer:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}