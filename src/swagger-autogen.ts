import swaggerAutogen from 'swagger-autogen';

const doc = {
    info: {
        title: 'LoLek API',
        version: '1.0.0',
        description: 'Riot API wrapper with authentication'
    },
    servers: [
        {
            url: 'http://localhost:3000'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        }
    }
};

const routes = ['./src/routes/index.ts'];

swaggerAutogen({ openapi: '3.0.0' })(
    './src/swagger-output.json',
    routes,
    doc
).then(async () => {
    // Post-process: add security to protected routes
    const fs = require('fs').promises;
    const output = await fs.readFile('./src/swagger-output.json', 'utf8');
    const swagger = JSON.parse(output);

    const protectedEndpoints = [
        '/authentication/log-out',
        '/user/profile',
        '/user/riot-profile',
        '/user/link-riot-profile'
    ];

    for (const endpoint of protectedEndpoints) {
        if (swagger.paths[endpoint]) {
            const methods = Object.keys(swagger.paths[endpoint]);
            for (const method of methods) {
                swagger.paths[endpoint][method].security = [{ bearerAuth: [] }];
                // Remove parameters array if it has 'authorization'
                if (swagger.paths[endpoint][method].parameters) {
                    swagger.paths[endpoint][method].parameters =
                        swagger.paths[endpoint][method].parameters.filter((p: { name: string; }) => p.name !== 'authorization');
                }
            }
        }
    }

    await fs.writeFile('./src/swagger-output.json', JSON.stringify(swagger, null, 2));
    console.log('Swagger auto-generated with security');
});