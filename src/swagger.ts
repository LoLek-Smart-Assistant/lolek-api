import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'LoLek API',
            version: '1.0.0',
            description: 'Riot API wrapper with authentication, user profiles, and a voice transcription pipeline for League of Legends terminology. Auth uses httpOnly cookies; no manual token input is required.'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {}
    },
    apis: ['./src/swagger-routes.ts']
};

export const swaggerSpec = swaggerJsdoc(options);